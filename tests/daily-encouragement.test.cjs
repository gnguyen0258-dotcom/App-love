const assert = require("node:assert/strict");
const test = require("node:test");
const coupleHandler = require("../api/couple");
const catalog = require("../shared/daily-encouragement.json");

test("daily encouragement catalog contains 540 unique, usable sentences", () => {
  assert.equal(catalog.timezone, "Asia/Ho_Chi_Minh");
  assert.equal(catalog.items.length, 540);
  assert.equal(new Set(catalog.items.map((item) => item.id)).size, catalog.items.length);
  assert.equal(new Set(catalog.items.map((item) => item.text)).size, catalog.items.length);
  assert.ok(catalog.items.every((item) => item.text.length >= 60 && item.text.length <= 300));
});

test("Vietnam day key rolls over at midnight in Ho Chi Minh City", () => {
  assert.equal(
    coupleHandler._test.dateKeyInTimeZone(new Date("2026-07-13T16:59:59.000Z")),
    "2026-07-13",
  );
  assert.equal(
    coupleHandler._test.dateKeyInTimeZone(new Date("2026-07-13T17:00:00.000Z")),
    "2026-07-14",
  );
});

test("a day keeps one quote and the next day cannot reuse it", () => {
  const first = coupleHandler._test.buildDailyEncouragementState(
    null,
    "2026-07-13",
    100,
    () => 0,
  );
  const sameDay = coupleHandler._test.buildDailyEncouragementState(
    first.state,
    "2026-07-13",
    200,
    () => 1,
  );
  const nextDay = coupleHandler._test.buildDailyEncouragementState(
    first.state,
    "2026-07-14",
    300,
    () => 0,
  );

  assert.equal(first.changed, true);
  assert.equal(sameDay.changed, false);
  assert.deepEqual(sameDay.current, first.current);
  assert.notEqual(nextDay.current.quoteId, first.current.quoteId);
  assert.notEqual(nextDay.current.text, first.current.text);
  assert.equal(Object.keys(nextDay.state.used).length, 2);
});

test("exhausted catalogs fall back to a randomized date-specific unique sentence", () => {
  const used = Object.fromEntries(catalog.items.map((item) => [item.id, "2027-12-31"]));
  const first = coupleHandler._test.buildDailyEncouragementState(
    { used },
    "2028-01-01",
    100,
    () => 0,
  );
  const second = coupleHandler._test.buildDailyEncouragementState(
    { used },
    "2028-01-02",
    200,
    () => 1,
  );

  assert.equal(first.current.quoteId, "date-2028-01-01");
  assert.match(first.current.text, /01\/01\/2028/);
  assert.equal(second.current.quoteId, "date-2028-01-02");
  assert.match(second.current.text, /02\/01\/2028/);
  assert.notEqual(second.current.text, first.current.text);
});

test("trusted daily selection is idempotent for both members on the same date", async () => {
  let stored = null;
  const database = {
    ref(path) {
      if (path === "users/user-a") {
        return { get: async () => ({ val: () => ({ coupleId: "couple-a" }) }) };
      }
      if (path === "couples/couple-a/members/user-a") {
        return { get: async () => ({ exists: () => true }) };
      }
      if (path === "couples/couple-a/shared/dailyEncouragement") {
        return {
          transaction: async (update) => {
            stored = update(stored);
            return { committed: true, snapshot: { val: () => stored } };
          },
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    },
  };

  const first = await coupleHandler._test.ensureDailyEncouragement(database, "user-a", {
    dateKey: "2026-07-13",
    assignedAt: 100,
    randomIndex: () => 0,
  });
  const second = await coupleHandler._test.ensureDailyEncouragement(database, "user-a", {
    dateKey: "2026-07-13",
    assignedAt: 200,
    randomIndex: () => 10,
  });

  assert.deepEqual(second.encouragement, first.encouragement);
  assert.equal(Object.keys(stored.used).length, 1);
});
