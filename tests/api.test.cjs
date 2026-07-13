const test = require("node:test");
const assert = require("node:assert/strict");
const coupleHandler = require("../api/couple");
const checkinHandler = require("../api/checkin");
const lettersHandler = require("../api/letters");
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

test("check-in payloads require a mood and need while limiting private notes", () => {
  assert.deepEqual(
    checkinHandler._test.cleanCheckin({ mood: "  Bình yên ", need: " Cần một cái ôm ", note: " Xin chào " }),
    { mood: "Bình yên", need: "Cần một cái ôm", note: "Xin chào" },
  );
  assert.throws(() => checkinHandler._test.cleanCheckin({ mood: "", need: "" }), /chọn tâm trạng/i);
  assert.equal(checkinHandler._test.cleanCheckin({ mood: "Vui", need: "Ôm", note: "a".repeat(300) }).note.length, 240);
});

test("future letters only accept tomorrow through ten years and use Vietnam midnight", () => {
  const now = Date.UTC(2026, 6, 13, 5);
  assert.throws(() => lettersHandler._test.validateFutureDate("2026-07-13", now), /từ ngày mai/i);
  assert.equal(
    lettersHandler._test.validateFutureDate("2026-07-14", now),
    Date.parse("2026-07-14T00:00:00+07:00"),
  );
  assert.equal(lettersHandler._test.cleanTitle("  Gửi đến ngày mai  "), "Gửi đến ngày mai");
  assert.equal(lettersHandler._test.cleanBody("  Dòng 1\r\nDòng 2  "), "Dòng 1\nDòng 2");
  assert.equal(lettersHandler._test.cleanLetterId("../../secret"), "");
});

test("a sealed future letter stays hidden from its recipient until the opening time", async () => {
  const opensAt = Date.parse("2026-07-20T00:00:00+07:00");
  let metadata = {
    title: "Ngày hẹn",
    createdBy: "user-a",
    recipientUid: "user-b",
    opensAt,
    openedAt: 0,
    openedBy: "",
  };
  const database = {
    ref(path) {
      if (path === "users/user-a" || path === "users/user-b") {
        return { get: async () => ({ val: () => ({ coupleId: "couple-a" }) }) };
      }
      if (path === "couples/couple-a") {
        return { get: async () => ({ val: () => ({ members: { "user-a": {}, "user-b": {} } }) }) };
      }
      if (path === "couples/couple-a/shared/futureLetters/letter-a") {
        return {
          get: async () => ({ val: () => metadata }),
          update: async (values) => { metadata = { ...metadata, ...values }; },
        };
      }
      if (path === "futureLetterBodies/couple-a/letter-a") {
        return { get: async () => ({ val: () => ({ body: "Điều chỉ được đọc đúng hẹn." }) }) };
      }
      throw new Error(`Unexpected path: ${path}`);
    },
  };

  await assert.rejects(
    lettersHandler._test.openLetter(database, "user-b", "letter-a", opensAt - 1),
    (error) => error.statusCode === 423,
  );
  const creatorPreview = await lettersHandler._test.openLetter(
    database,
    "user-a",
    "letter-a",
    opensAt - 1,
  );
  assert.equal(creatorPreview.preview, true);
  assert.equal(metadata.openedAt, 0);

  const opened = await lettersHandler._test.openLetter(database, "user-b", "letter-a", opensAt);
  assert.equal(opened.body, "Điều chỉ được đọc đúng hẹn.");
  assert.equal(opened.unlocked, true);
  assert.equal(metadata.openedBy, "user-b");
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

test("redeemed coupon history is removed 24 hours after each use", async () => {
  const currentTime = Date.UTC(2026, 6, 14, 2, 0);
  const ttl = coupleHandler._test.COUPON_HISTORY_TTL_MS;
  const coupons = {
    expired: { status: "redeemed", redeemedAt: currentTime - ttl },
    fresh: { status: "redeemed", redeemedAt: currentTime - ttl + 1 },
    available: { status: "available", redeemedAt: 0 },
  };
  const database = {
    ref(path) {
      const match = /^couples\/couple-a\/shared\/coupons\/(.+)$/.exec(path);
      if (match) return { get: async () => ({ val: () => coupons[match[1]] || null }) };
      if (path === "couples/couple-a") {
        return {
          update: async (updates) => {
            Object.keys(updates).forEach((key) => delete coupons[key.split("/").at(-1)]);
          },
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    },
  };

  const deleted = await coupleHandler._test.cleanupExpiredCoupons(
    database,
    "couple-a",
    ["expired", "fresh", "available", "invalid.id"],
    currentTime,
  );

  assert.equal(ttl, 24 * 60 * 60 * 1000);
  assert.equal(deleted, 1);
  assert.equal(coupons.expired, undefined);
  assert.ok(coupons.fresh);
  assert.ok(coupons.available);
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
