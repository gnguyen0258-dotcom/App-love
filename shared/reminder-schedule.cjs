const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function dateKeyToTime(dateKey) {
  if (!DATE_KEY_PATTERN.test(String(dateKey || ""))) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = Date.UTC(year, month - 1, day);
  return new Date(value).toISOString().slice(0, 10) === dateKey ? value : null;
}

function vietnamDateKey(value = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function addDaysToKey(dateKey, amount) {
  const time = dateKeyToTime(dateKey);
  if (time === null) return null;
  return new Date(time + Number(amount || 0) * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(startKey, endKey) {
  const start = dateKeyToTime(startKey);
  const end = dateKeyToTime(endKey);
  if (start === null || end === null) return null;
  return Math.round((end - start) / DAY_MS);
}

function normalizePeriodDays(value) {
  const entries = Array.isArray(value)
    ? value
    : Object.entries(value || {})
        .filter(([, selected]) => selected === true)
        .map(([dateKey]) => dateKey);
  return [...new Set(entries.filter((dateKey) => dateKeyToTime(dateKey) !== null))].sort();
}

function periodBlocks(periodDays) {
  return normalizePeriodDays(periodDays).reduce((blocks, dateKey) => {
    const current = blocks.at(-1);
    if (current && daysBetween(current.at(-1), dateKey) === 1) current.push(dateKey);
    else blocks.push([dateKey]);
    return blocks;
  }, []);
}

function normalizedCycleLength(cycle, blocks = periodBlocks(cycle?.periodDays)) {
  const configured = Math.min(60, Math.max(15, Number.parseInt(cycle?.length, 10) || 28));
  const starts = blocks.map(([start]) => start);
  const gaps = starts
    .slice(1)
    .map((start, index) => daysBetween(starts[index], start))
    .filter((gap) => gap >= 15 && gap <= 60);
  if (!gaps.length) return configured;
  return Math.min(60, Math.max(15, Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)));
}

function fertileReminderFor(cycle, todayKey) {
  if (dateKeyToTime(todayKey) === null) return null;
  const blocks = periodBlocks(cycle?.periodDays);
  const starts = blocks.map(([start]) => start).filter((start) => start <= todayKey);
  const latestStart = starts.at(-1);
  if (!latestStart) return null;

  const length = normalizedCycleLength(cycle, blocks);
  const offset = daysBetween(latestStart, todayKey);
  if (offset === null || offset < 0) return null;
  const position = (offset % length) + 1;
  const daysUntil = position <= 10 ? 10 - position : length - position + 9;
  if (daysUntil < 0 || daysUntil > 3) return null;

  const fertileStart = addDaysToKey(todayKey, daysUntil);
  return {
    daysUntil,
    fertileStart,
    fertileEnd: addDaysToKey(fertileStart, 8),
    length,
    position,
  };
}

function shortVietnamDate(dateKey) {
  const time = dateKeyToTime(dateKey);
  if (time === null) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(time));
}

function cycleReminderBody(schedule) {
  if (schedule.daysUntil === 0) {
    return "Cửa sổ dễ thụ thai ước tính bắt đầu hôm nay.";
  }
  return `Cửa sổ dễ thụ thai ước tính bắt đầu sau ${schedule.daysUntil} ngày, vào ${shortVietnamDate(schedule.fertileStart)}.`;
}

function buildDueReminders({ couples = {}, users = {}, todayKey = vietnamDateKey() } = {}) {
  if (dateKeyToTime(todayKey) === null) return [];
  const reminders = [];

  for (const [coupleId, couple] of Object.entries(couples || {})) {
    const memberUids = Object.keys(couple?.members || {});
    if (!memberUids.length) continue;

    const events = Object.entries(couple?.shared?.events || {})
      .filter(([, event]) => event?.date === todayKey && String(event?.title || "").trim())
      .sort(([, left], [, right]) => Number(left.createdAt || 0) - Number(right.createdAt || 0));

    for (const [eventId, event] of events) {
      const eventTitle = String(event.title).trim().replace(/\s+/g, " ").slice(0, 100);
      for (const uid of memberUids) {
        const showPreview = Boolean(users?.[uid]?.preferences?.showMessagePreview);
        reminders.push({
          kind: "event-reminder",
          coupleId,
          uid,
          sourceId: eventId,
          sourceDate: todayKey,
          title: "Lịch chung hôm nay",
          body: showPreview ? `Hôm nay: ${eventTitle}` : "Hôm nay hai bạn có một sự kiện trong lịch chung.",
          link: "/?view=tools&tool=calendar",
          dedupeKey: `event:${coupleId}:${eventId}:${uid}:${todayKey}`,
        });
      }
    }

    const fertile = fertileReminderFor(couple?.shared?.cycle, todayKey);
    if (!fertile) continue;
    for (const uid of memberUids) {
      const showPreview = Boolean(users?.[uid]?.preferences?.showMessagePreview);
      reminders.push({
        kind: "cycle-reminder",
        coupleId,
        uid,
        sourceId: fertile.fertileStart,
        sourceDate: fertile.fertileStart,
        title: "Nhắc chu kỳ",
        body: showPreview ? cycleReminderBody(fertile) : "Bạn có một nhắc nhở chu kỳ mới trong HeartSync.",
        link: "/?view=tools&tool=cycle",
        dedupeKey: `cycle:${coupleId}:${uid}:${fertile.fertileStart}`,
      });
    }
  }

  return reminders;
}

module.exports = {
  DAY_MS,
  VIETNAM_TIME_ZONE,
  addDaysToKey,
  buildDueReminders,
  cycleReminderBody,
  dateKeyToTime,
  daysBetween,
  fertileReminderFor,
  normalizePeriodDays,
  normalizedCycleLength,
  periodBlocks,
  shortVietnamDate,
  vietnamDateKey,
};
