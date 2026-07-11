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
