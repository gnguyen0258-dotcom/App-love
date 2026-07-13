const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_QUIET_START = "22:00";
const DEFAULT_QUIET_END = "07:00";

const CATEGORY_PREFERENCE_KEYS = {
  messages: "notificationMessages",
  calendar: "notificationCalendar",
  cycle: "notificationCycle",
  checkin: "notificationCheckin",
};

function notificationCategoryForKind(kind = "") {
  const normalized = String(kind).trim().toLowerCase();
  if (normalized === "event-reminder") return "calendar";
  if (normalized === "cycle-reminder") return "cycle";
  if (normalized === "message" || normalized === "sticker") return "messages";
  return "checkin";
}

function categoryEnabled(recipient, category) {
  const preferenceKey = CATEGORY_PREFERENCE_KEYS[category];
  if (!preferenceKey) return true;
  return recipient?.preferences?.[preferenceKey] !== false;
}

function timeToMinutes(value, fallback) {
  const normalized = /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""))
    ? String(value)
    : fallback;
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesInTimeZone(value, timeZone = DEFAULT_TIME_ZONE) {
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: String(timeZone || DEFAULT_TIME_ZONE),
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: DEFAULT_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function isWithinQuietHours(recipient, now = Date.now()) {
  const preferences = recipient?.preferences || {};
  if (!preferences.quietHoursEnabled) return false;
  const start = timeToMinutes(preferences.quietHoursStart, DEFAULT_QUIET_START);
  const end = timeToMinutes(preferences.quietHoursEnd, DEFAULT_QUIET_END);
  if (start === end) return false;
  const current = minutesInTimeZone(now, preferences.notificationTimeZone);
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

function notificationDecision(recipient, { category, kind, now = Date.now() } = {}) {
  const resolvedCategory = category || notificationCategoryForKind(kind);
  if (!categoryEnabled(recipient, resolvedCategory)) {
    return { deliver: false, category: resolvedCategory, reason: "category-disabled" };
  }
  if (isWithinQuietHours(recipient, now)) {
    return { deliver: false, category: resolvedCategory, reason: "quiet-hours" };
  }
  return { deliver: true, category: resolvedCategory, reason: "ready" };
}

module.exports = {
  CATEGORY_PREFERENCE_KEYS,
  DEFAULT_QUIET_END,
  DEFAULT_QUIET_START,
  DEFAULT_TIME_ZONE,
  categoryEnabled,
  isWithinQuietHours,
  minutesInTimeZone,
  notificationCategoryForKind,
  notificationDecision,
  timeToMinutes,
};
