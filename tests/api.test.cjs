const test = require("node:test");
const assert = require("node:assert/strict");
const coupleHandler = require("../api/couple");
const messageHandler = require("../api/message");

function responseDouble() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

const validPngAvatar =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2z9sAAAAASUVORK5CYII=";

test("personal pair codes use an unambiguous 4-4 format", () => {
  const code = coupleHandler._test.createPairCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(coupleHandler._test.normalizeCode(code.replace("-", "")), code);
  assert.equal(coupleHandler._test.isPairCode(code), true);
});

test("mutual pairing uses the same lock key from either account", () => {
  assert.equal(coupleHandler._test.pairKey("user-b", "user-a"), "user-a:user-b");
  assert.equal(coupleHandler._test.pairKey("user-a", "user-b"), "user-a:user-b");
});

test("custom avatars accept supported image data and allow reset", () => {
  assert.equal(coupleHandler._test.normalizeAvatarData(validPngAvatar), validPngAvatar);
  assert.equal(coupleHandler._test.normalizeAvatarData(""), "");
  assert.equal(coupleHandler._test.normalizeAvatarData(null), "");
});

test("custom avatars reject unsupported or forged image data", () => {
  const fakePng = `data:image/png;base64,${Buffer.alloc(64, 1).toString("base64")}`;
  const svg = "data:image/svg+xml;base64,PHN2Zy8+";
  assert.throws(() => coupleHandler._test.normalizeAvatarData(fakePng), /hợp lệ/i);
  assert.throws(() => coupleHandler._test.normalizeAvatarData(svg), /định dạng/i);
  assert.throws(
    () => coupleHandler._test.normalizeAvatarData(`data:image/png;base64,${"A".repeat(160_004)}`),
    /quá lớn/i,
  );
});

test("shared pulse backgrounds accept real raster images and allow reset", () => {
  assert.equal(coupleHandler._test.normalizeBackgroundData(validPngAvatar), validPngAvatar);
  assert.equal(coupleHandler._test.normalizeBackgroundData(""), "");
  assert.equal(coupleHandler._test.normalizeBackgroundData(null), "");
});

test("shared pulse backgrounds reject forged or oversized images", () => {
  const fakeWebp = `data:image/webp;base64,${Buffer.alloc(64, 1).toString("base64")}`;
  assert.throws(() => coupleHandler._test.normalizeBackgroundData(fakeWebp), /hợp lệ/i);
  assert.throws(
    () => coupleHandler._test.normalizeBackgroundData(`data:image/png;base64,${"A".repeat(360_004)}`),
    /quá lớn/i,
  );
});

test("shared pulse backgrounds replace the previous image and allow reset", async () => {
  let storedBackground = "not-set";
  const database = {
    ref(path) {
      if (path === "users/user-a") {
        return { get: async () => ({ val: () => ({ coupleId: "couple-a" }) }) };
      }
      if (path === "couples/couple-a/members/user-a") {
        return { get: async () => ({ exists: () => true }) };
      }
      if (path === "couples/couple-a/shared/pulseBackground") {
        return { set: async (value) => { storedBackground = value; } };
      }
      throw new Error(`Unexpected path: ${path}`);
    },
  };

  await coupleHandler._test.updatePulseBackground(database, "user-a", validPngAvatar);
  assert.equal(storedBackground.imageData, validPngAvatar);
  assert.equal(storedBackground.updatedBy, "user-a");
  assert.equal(typeof storedBackground.updatedAt, "number");

  await coupleHandler._test.updatePulseBackground(database, "user-a", "");
  assert.equal(storedBackground, null);
});

test("custom avatars sync to an existing couple member without recreating a removed member", async () => {
  let profileAvatar;
  let member = { displayName: "User A", joinedAt: 1 };
  const database = {
    ref(path) {
      if (path === "users/user-a") {
        return { get: async () => ({ val: () => ({ coupleId: "couple-a" }) }) };
      }
      if (path === "users/user-a/avatarData") {
        return { set: async (value) => { profileAvatar = value; } };
      }
      if (path === "couples/couple-a/members/user-a") {
        return {
          transaction: async (update) => {
            const next = update(member);
            member = next;
            return { committed: true };
          },
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    },
  };

  await coupleHandler._test.updateAvatar(database, "user-a", validPngAvatar);
  assert.equal(profileAvatar, validPngAvatar);
  assert.equal(member.avatarData, validPngAvatar);

  await coupleHandler._test.updateAvatar(database, "user-a", "");
  assert.equal(profileAvatar, null);
  assert.equal(Object.hasOwn(member, "avatarData"), false);

  member = null;
  await coupleHandler._test.updateAvatar(database, "user-a", validPngAvatar);
  assert.equal(member, null);
});

test("message input is trimmed while preserving line breaks", () => {
  assert.equal(messageHandler._test.cleanText("  Xin chào\r\nngười ấy  "), "Xin chào\nngười ấy");
});

test("message sender names prefer the synchronized nickname", () => {
  const couple = {
    members: { "user-a": { displayName: "Google Name" } },
    shared: { nicknames: { "user-a": "  Bé yêu  " } },
  };
  assert.equal(messageHandler._test.senderDisplayName(couple, "user-a"), "Bé yêu");
  assert.equal(
    messageHandler._test.senderDisplayName({ members: couple.members }, "user-a"),
    "Google Name",
  );
});

test("stickers resolve only from the bundled HeartSync catalog", () => {
  assert.equal(messageHandler._test.cleanStickerId("  HUG-TIGHT "), "hug-tight");
  assert.equal(messageHandler._test.stickerForId("hug-tight")?.label, "Ôm thật chặt");
  assert.equal(messageHandler._test.stickerForId("messenger-private-pack"), null);
});

test("activities expire exactly 24 hours after their own creation time", () => {
  const firstCreatedAt = Date.UTC(2026, 6, 13, 1, 0);
  const secondCreatedAt = Date.UTC(2026, 6, 13, 1, 59);
  const details = { id: "activity", uid: "user-a", senderName: "A", text: "Test", type: "nudge-heart" };
  const first = messageHandler._test.buildActivity(details, firstCreatedAt);
  const second = messageHandler._test.buildActivity({ ...details, id: "activity-2" }, secondCreatedAt);

  assert.equal(first.expiresAt, Date.UTC(2026, 6, 14, 1, 0));
  assert.equal(second.expiresAt, Date.UTC(2026, 6, 14, 1, 59));
  assert.equal(second.expiresAt - first.expiresAt, 59 * 60 * 1000);
  assert.equal(messageHandler._test.activityTypeFor("nudge-heart"), "nudge-heart");
  assert.equal(messageHandler._test.activityTypeFor("forged-action"), null);
});

test("activity cleanup removes only requested records that have expired", async () => {
  const currentTime = Date.UTC(2026, 6, 14, 2, 0);
  const activities = {
    expired: { expiresAt: currentTime - 1 },
    active: { expiresAt: currentTime + 60_000 },
  };
  const database = {
    ref(path) {
      const match = /^couples\/couple-a\/activities\/(.+)$/.exec(path);
      if (match) return { get: async () => ({ val: () => activities[match[1]] || null }) };
      if (path === "couples/couple-a") {
        return {
          update: async (updates) => {
            Object.keys(updates).forEach((key) => delete activities[key.split("/")[1]]);
          },
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    },
  };

  const deleted = await messageHandler._test.cleanupExpiredActivities(
    database,
    "couple-a",
    ["expired", "active", "invalid.id"],
    currentTime,
  );
  assert.equal(deleted, 1);
  assert.equal(activities.expired, undefined);
  assert.ok(activities.active);
});

test("API endpoints reject unsupported methods", async () => {
  const response = responseDouble();
  await coupleHandler({ method: "GET", headers: {} }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
});

test("couple endpoint rejects anonymous requests before loading Admin credentials", async () => {
  const response = responseDouble();
  await coupleHandler({ method: "POST", headers: {}, body: { action: "status" } }, response);
  assert.equal(response.statusCode, 401);
});

test("message endpoint rejects anonymous requests before loading Admin credentials", async () => {
  const response = responseDouble();
  await messageHandler({ method: "POST", headers: {}, body: { text: "test" } }, response);
  assert.equal(response.statusCode, 401);
});
