const crypto = require("node:crypto");
const { adminServices, handleApiError, sendJson } = require("./_firebase-admin");
const { sendUserPush } = require("./_push");
const {
  buildDueReminders,
  daysBetween,
  vietnamDateKey,
} = require("../shared/reminder-schedule.cjs");

const ACTIVE_CLAIM_MS = 15 * 60 * 1000;
const RETRY_DELAY_MS = 6 * 60 * 60 * 1000;
const DELIVERY_RETENTION_DAYS = 45;

function requestHeader(request, name) {
  if (typeof request.headers?.get === "function") return request.headers.get(name) || "";
  return request.headers?.[name.toLowerCase()] || request.headers?.[name] || "";
}

function cronAuthorized(request, secret = process.env.CRON_SECRET) {
  if (!secret) return false;
  const actual = Buffer.from(String(requestHeader(request, "authorization")));
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function reminderDeliveryId(reminder) {
  return crypto.createHash("sha256").update(reminder.dedupeKey).digest("hex").slice(0, 32);
}

function reminderDeliveryPath(reminder) {
  return `reminderDeliveries/${reminder.sourceDate}/${reminderDeliveryId(reminder)}`;
}

async function claimReminder(database, reminder, now = Date.now()) {
  const deliveryRef = database.ref(reminderDeliveryPath(reminder));
  const result = await deliveryRef.transaction((current) => {
    if (current?.status === "sent") return;
    const lastAttemptAt = Number(current?.lastAttemptAt || current?.claimedAt || 0);
    if (current?.status === "sending" && now - lastAttemptAt < ACTIVE_CLAIM_MS) return;
    if (current?.status === "skipped" && now - lastAttemptAt < RETRY_DELAY_MS) return;
    return {
      status: "sending",
      kind: reminder.kind,
      coupleId: reminder.coupleId,
      uid: reminder.uid,
      sourceDate: reminder.sourceDate,
      claimedAt: now,
      lastAttemptAt: now,
    };
  });
  return result.committed ? deliveryRef : null;
}

async function finishReminder(deliveryRef, reminder, status, details, now = Date.now()) {
  await deliveryRef.set({
    status,
    kind: reminder.kind,
    coupleId: reminder.coupleId,
    uid: reminder.uid,
    sourceDate: reminder.sourceDate,
    completedAt: now,
    lastAttemptAt: now,
    sentDevices: Number(details?.sent || 0),
    failedDevices: Number(details?.failed || 0),
  });
}

async function cleanupReminderDeliveries(database, todayKey) {
  const snapshot = await database.ref("reminderDeliveries").get();
  const buckets = snapshot.val() || {};
  const removals = {};
  Object.keys(buckets).forEach((dateKey) => {
    const age = daysBetween(dateKey, todayKey);
    if (age !== null && age > DELIVERY_RETENTION_DAYS) removals[dateKey] = null;
  });
  if (Object.keys(removals).length) await database.ref("reminderDeliveries").update(removals);
  return Object.keys(removals).length;
}

async function processReminder({ database, messaging, users, reminder, now = Date.now() }) {
  const deliveryRef = await claimReminder(database, reminder, now);
  if (!deliveryRef) return { status: "duplicate", sent: 0 };

  try {
    const result = await sendUserPush({
      database,
      messaging,
      uid: reminder.uid,
      recipient: users?.[reminder.uid] || {},
      title: reminder.title,
      body: reminder.body,
      link: reminder.link,
      messageId: reminderDeliveryId(reminder),
      kind: reminder.kind,
      ttlSeconds: reminder.kind === "event-reminder" ? 86400 : 4 * 86400,
    });
    const status = result.sent > 0 ? "sent" : "skipped";
    await finishReminder(deliveryRef, reminder, status, result, now);
    return { status, sent: result.sent };
  } catch (error) {
    await finishReminder(deliveryRef, reminder, "failed", { failed: 1 }, now);
    console.error("Reminder delivery failed", {
      kind: reminder.kind,
      coupleId: reminder.coupleId,
      uid: reminder.uid,
      error: error.message,
    });
    return { status: "failed", sent: 0 };
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Phương thức không được hỗ trợ." });
    return;
  }
  if (!cronAuthorized(request)) {
    sendJson(response, 401, { error: "Cron không hợp lệ." });
    return;
  }

  try {
    const now = Date.now();
    const todayKey = vietnamDateKey(now);
    const { database, messaging } = adminServices();
    const [couplesSnapshot, usersSnapshot] = await Promise.all([
      database.ref("couples").get(),
      database.ref("users").get(),
    ]);
    const couples = couplesSnapshot.val() || {};
    const users = usersSnapshot.val() || {};
    const reminders = buildDueReminders({ couples, users, todayKey });
    const summary = {
      due: reminders.length,
      delivered: 0,
      skipped: 0,
      duplicate: 0,
      failed: 0,
      sentDevices: 0,
    };

    for (const reminder of reminders) {
      const result = await processReminder({ database, messaging, users, reminder, now });
      const statusKey = result.status === "sent" ? "delivered" : result.status;
      summary[statusKey] += 1;
      summary.sentDevices += result.sent;
    }
    const removedBuckets = await cleanupReminderDeliveries(database, todayKey);
    sendJson(response, 200, { ok: true, date: todayKey, ...summary, removedBuckets });
  } catch (error) {
    handleApiError(response, error);
  }
};

module.exports._test = {
  ACTIVE_CLAIM_MS,
  DELIVERY_RETENTION_DAYS,
  RETRY_DELAY_MS,
  claimReminder,
  cleanupReminderDeliveries,
  cronAuthorized,
  finishReminder,
  processReminder,
  reminderDeliveryId,
  reminderDeliveryPath,
  requestHeader,
};
