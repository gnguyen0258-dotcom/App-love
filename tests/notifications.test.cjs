const test = require("node:test");
const assert = require("node:assert/strict");
const {
  categoryEnabled,
  isWithinQuietHours,
  notificationCategoryForKind,
  notificationDecision,
} = require("../shared/notification-preferences.cjs");
const { sendUserPush } = require("../api/_push");

test("notification kinds map to the four user-facing categories", () => {
  assert.equal(notificationCategoryForKind("message"), "messages");
  assert.equal(notificationCategoryForKind("sticker"), "messages");
  assert.equal(notificationCategoryForKind("event-reminder"), "calendar");
  assert.equal(notificationCategoryForKind("cycle-reminder"), "cycle");
  assert.equal(notificationCategoryForKind("checkin"), "checkin");
  assert.equal(notificationCategoryForKind("activity"), "checkin");
});

test("notification categories default on and can be disabled independently", () => {
  assert.equal(categoryEnabled({ preferences: {} }, "messages"), true);
  assert.equal(
    categoryEnabled({ preferences: { notificationMessages: false } }, "messages"),
    false,
  );
  assert.deepEqual(
    notificationDecision(
      { preferences: { notificationCalendar: false } },
      { kind: "event-reminder", now: Date.UTC(2026, 6, 13, 5) },
    ),
    { deliver: false, category: "calendar", reason: "category-disabled" },
  );
});

test("overnight quiet hours use the recipient timezone and release at the end time", () => {
  const recipient = {
    preferences: {
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      notificationTimeZone: "Asia/Ho_Chi_Minh",
    },
  };
  assert.equal(isWithinQuietHours(recipient, Date.UTC(2026, 6, 13, 16, 0)), true);
  assert.equal(isWithinQuietHours(recipient, Date.UTC(2026, 6, 13, 23, 59)), true);
  assert.equal(isWithinQuietHours(recipient, Date.UTC(2026, 6, 14, 0, 0)), false);
});

test("push delivery is skipped before contacting Firebase when a category is disabled", async () => {
  let called = false;
  const result = await sendUserPush({
    database: {},
    messaging: {
      async sendEachForMulticast() {
        called = true;
      },
    },
    uid: "user-a",
    recipient: {
      preferences: { notificationMessages: false },
      devices: { phone: { token: "valid-token-that-is-long-enough" } },
    },
    kind: "message",
    body: "Hello",
  });
  assert.equal(called, false);
  assert.deepEqual(result, {
    sent: 0,
    failed: 0,
    total: 1,
    skipped: "category-disabled",
    category: "messages",
  });
});
