const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDueReminders,
  fertileReminderFor,
  vietnamDateKey,
} = require("../shared/reminder-schedule.cjs");
const { sendUserPush } = require("../api/_push");
const reminderHandler = require("../api/reminders");

test("Vietnam reminder day rolls over at local midnight", () => {
  assert.equal(vietnamDateKey(Date.UTC(2026, 6, 13, 16, 59)), "2026-07-13");
  assert.equal(vietnamDateKey(Date.UTC(2026, 6, 13, 17, 0)), "2026-07-14");
});

test("fertile reminder is due three days before the first green day", () => {
  const cycle = {
    length: 28,
    periodDays: {
      "2026-06-15": true,
      "2026-06-16": true,
      "2026-07-13": true,
      "2026-07-14": true,
    },
  };

  assert.equal(fertileReminderFor(cycle, "2026-07-18"), null);
  assert.deepEqual(fertileReminderFor(cycle, "2026-07-19"), {
    daysUntil: 3,
    fertileStart: "2026-07-22",
    fertileEnd: "2026-07-30",
    length: 28,
    position: 7,
  });
});

test("fertile reminder catches up without duplicating the predicted window", () => {
  const cycle = { length: 28, periodDays: { "2026-07-13": true } };
  assert.equal(fertileReminderFor(cycle, "2026-07-20").daysUntil, 2);
  assert.equal(fertileReminderFor(cycle, "2026-07-21").fertileStart, "2026-07-22");
  assert.equal(fertileReminderFor(cycle, "2026-07-22").daysUntil, 0);
  assert.equal(fertileReminderFor(cycle, "2026-07-23"), null);
});

test("due reminders target both members and respect lock-screen preview privacy", () => {
  const couples = {
    "couple-a": {
      members: { "user-a": {}, "user-b": {} },
      shared: {
        cycle: { length: 28, periodDays: { "2026-07-13": true } },
        events: {
          today: { title: "Đi chơi", date: "2026-07-19", createdAt: 1 },
          later: { title: "Ăn tối", date: "2026-07-20", createdAt: 2 },
        },
      },
    },
  };
  const users = {
    "user-a": { preferences: { showMessagePreview: true } },
    "user-b": { preferences: { showMessagePreview: false } },
  };

  const reminders = buildDueReminders({ couples, users, todayKey: "2026-07-19" });
  assert.equal(reminders.length, 4);
  const eventForA = reminders.find((item) => item.kind === "event-reminder" && item.uid === "user-a");
  const eventForB = reminders.find((item) => item.kind === "event-reminder" && item.uid === "user-b");
  const cycleForA = reminders.find((item) => item.kind === "cycle-reminder" && item.uid === "user-a");
  assert.equal(eventForA.body, "Hôm nay: Đi chơi");
  assert.equal(eventForB.body, "Hôm nay hai bạn có một sự kiện trong lịch chung.");
  assert.match(cycleForA.body, /sau 3 ngày/);
  assert.equal(cycleForA.sourceDate, "2026-07-22");
  assert.equal(new Set(reminders.map((item) => item.dedupeKey)).size, reminders.length);
});

test("push delivery removes an invalid device token without affecting valid devices", async () => {
  let payload;
  let removals;
  const database = {
    ref(path) {
      assert.equal(path, undefined);
      return {
        async update(value) {
          removals = value;
        },
      };
    },
  };
  const messaging = {
    async sendEachForMulticast(value) {
      payload = value;
      return {
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          {
            success: false,
            error: { code: "messaging/registration-token-not-registered" },
          },
        ],
      };
    },
  };

  const result = await sendUserPush({
    database,
    messaging,
    uid: "user-a",
    recipient: {
      devices: {
        phone: { token: "valid-token-that-is-long-enough" },
        oldPhone: { token: "expired-token-that-is-long-enough" },
      },
    },
    title: "Lịch chung hôm nay",
    body: "Hôm nay: Đi chơi",
    link: "/?view=tools&tool=calendar",
    messageId: "event-a",
    kind: "event-reminder",
  });

  assert.deepEqual(result, { sent: 1, failed: 1, total: 2 });
  assert.deepEqual(payload.tokens, [
    "valid-token-that-is-long-enough",
    "expired-token-that-is-long-enough",
  ]);
  assert.equal(payload.data.link, "/?view=tools&tool=calendar");
  assert.deepEqual(removals, { "users/user-a/devices/oldPhone": null });
});

test("a completed reminder cannot be claimed twice", async () => {
  let storedValue = null;
  let requestedPath = "";
  const deliveryRef = {
    async transaction(update) {
      const nextValue = update(storedValue);
      if (nextValue === undefined) return { committed: false };
      storedValue = nextValue;
      return { committed: true };
    },
    async set(value) {
      storedValue = value;
    },
  };
  const database = {
    ref(path) {
      requestedPath = path;
      return deliveryRef;
    },
  };
  const reminder = {
    kind: "event-reminder",
    coupleId: "couple-a",
    uid: "user-a",
    sourceDate: "2026-07-19",
    dedupeKey: "event:couple-a:event-a:user-a:2026-07-19",
  };

  const firstClaim = await reminderHandler._test.claimReminder(database, reminder, 1000);
  assert.equal(firstClaim, deliveryRef);
  assert.match(requestedPath, /^reminderDeliveries\/2026-07-19\/[a-f0-9]{32}$/);
  await reminderHandler._test.finishReminder(
    firstClaim,
    reminder,
    "sent",
    { sent: 1, failed: 0 },
    1100,
  );
  const secondClaim = await reminderHandler._test.claimReminder(database, reminder, 1200);

  assert.equal(secondClaim, null);
  assert.equal(storedValue.status, "sent");
  assert.equal(storedValue.sentDevices, 1);
});

test("reminder endpoint rejects unsupported and unauthenticated requests", async () => {
  const previousSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-cron-secret";

  function responseRecorder() {
    return {
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(value) {
        this.body = value;
        return this;
      },
    };
  }

  try {
    const methodResponse = responseRecorder();
    await reminderHandler({ method: "POST", headers: {} }, methodResponse);
    assert.equal(methodResponse.statusCode, 405);
    assert.equal(methodResponse.headers.Allow, "GET");

    const authResponse = responseRecorder();
    await reminderHandler({ method: "GET", headers: {} }, authResponse);
    assert.equal(authResponse.statusCode, 401);
    assert.equal(authResponse.body.error, "Cron không hợp lệ.");

    assert.equal(
      reminderHandler._test.cronAuthorized({
        headers: { authorization: "Bearer test-cron-secret" },
      }),
      true,
    );
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  }
});
