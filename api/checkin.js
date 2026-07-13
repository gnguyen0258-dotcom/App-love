const {
  adminServices,
  authenticateRequest,
  enforceRateLimit,
  handleApiError,
  requirePost,
  sendJson,
} = require("./_firebase-admin");
const { sendUserPush } = require("./_push");
const { vietnamDateKey } = require("../shared/reminder-schedule.cjs");

function cleanValue(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanCheckin(value = {}) {
  const checkin = {
    mood: cleanValue(value.mood, 40),
    need: cleanValue(value.need, 80),
    note: String(value.note || "").trim().slice(0, 240),
  };
  if (!checkin.mood || !checkin.need) {
    const error = new Error("Hãy chọn tâm trạng và điều bạn cần trước khi lưu.");
    error.statusCode = 400;
    throw error;
  }
  return checkin;
}

function displayName(couple, uid, fallback = "Người ấy") {
  const nickname = cleanValue(couple?.shared?.nicknames?.[uid], 32);
  return nickname || cleanValue(couple?.members?.[uid]?.displayName || fallback, 60);
}

async function saveCheckinAndNotify({ database, messaging, uid, decodedToken, rawCheckin, now }) {
  const profile = (await database.ref(`users/${uid}`).get()).val() || {};
  if (!profile.coupleId) {
    const error = new Error("Tài khoản chưa liên kết với người ấy.");
    error.statusCode = 409;
    throw error;
  }
  const coupleRef = database.ref(`couples/${profile.coupleId}`);
  const couple = (await coupleRef.get()).val() || {};
  if (!couple.members?.[uid]) {
    const error = new Error("Bạn không còn quyền truy cập không gian này.");
    error.statusCode = 403;
    throw error;
  }
  const partnerUid = Object.keys(couple.members).find((memberUid) => memberUid !== uid);
  if (!partnerUid) {
    const error = new Error("Người ấy chưa tham gia không gian.");
    error.statusCode = 409;
    throw error;
  }

  const date = vietnamDateKey(now);
  const checkin = { ...cleanCheckin(rawCheckin), updatedAt: now };
  await coupleRef.child(`checkins/${date}/${uid}`).set(checkin);

  const recipient = (await database.ref(`users/${partnerUid}`).get()).val() || {};
  const senderName = displayName(couple, uid, decodedToken?.name);
  const showPreview = Boolean(recipient.preferences?.showMessagePreview);
  const body = showPreview
    ? `${senderName} vừa check-in: ${checkin.mood} · ${checkin.need}`.slice(0, 180)
    : `${senderName} vừa chia sẻ check-in hôm nay.`;
  let notification = { sent: 0, failed: 0, total: 0 };
  try {
    notification = await sendUserPush({
      database,
      messaging,
      uid: partnerUid,
      recipient,
      title: "Check-in mới",
      body,
      link: "/?view=today",
      messageId: `checkin-${profile.coupleId}-${uid}-${date}`,
      kind: "checkin",
      category: "checkin",
      now,
    });
  } catch (error) {
    console.error("Check-in push delivery failed", error);
  }
  return { checkin, date, notification };
}

module.exports = async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    const decodedToken = await authenticateRequest(request);
    const { database, messaging } = adminServices();
    await enforceRateLimit(database, decodedToken.uid, "checkin", 650);
    const result = await saveCheckinAndNotify({
      database,
      messaging,
      uid: decodedToken.uid,
      decodedToken,
      rawCheckin: request.body,
      now: Date.now(),
    });
    sendJson(response, 200, result);
  } catch (error) {
    handleApiError(response, error);
  }
};

module.exports._test = { cleanCheckin, cleanValue, displayName, saveCheckinAndNotify };
