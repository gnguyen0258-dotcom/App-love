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
            if (next !== undefined) member = next;
            return { committed: next !== undefined };
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
