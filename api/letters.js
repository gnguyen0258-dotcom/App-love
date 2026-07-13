const {
  adminServices,
  authenticateRequest,
  enforceRateLimit,
  handleApiError,
  requirePost,
  sendJson,
} = require("./_firebase-admin");
const {
  addDaysToKey,
  dateKeyToTime,
  vietnamDateKey,
} = require("../shared/reminder-schedule.cjs");

const MAX_FUTURE_DAYS = 3650;

function apiError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanTitle(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function cleanBody(value) {
  return String(value || "").trim().replace(/\r\n/g, "\n").slice(0, 4000);
}

function cleanLetterId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9_-]{1,120}$/.test(id) ? id : "";
}

function opensAtForDate(dateKey) {
  if (dateKeyToTime(dateKey) === null) return null;
  const value = Date.parse(`${dateKey}T00:00:00+07:00`);
  return Number.isFinite(value) ? value : null;
}

function validateFutureDate(dateKey, now = Date.now()) {
  const today = vietnamDateKey(now);
  const earliest = addDaysToKey(today, 1);
  const latest = addDaysToKey(today, MAX_FUTURE_DAYS);
  if (dateKeyToTime(dateKey) === null || dateKey < earliest || dateKey > latest) {
    throw apiError("Ngày mở thư phải từ ngày mai và không quá 10 năm.", 400);
  }
  return opensAtForDate(dateKey);
}

async function coupleContext(database, uid) {
  const profile = (await database.ref(`users/${uid}`).get()).val() || {};
  if (!profile.coupleId) throw apiError("Tài khoản chưa liên kết với người ấy.", 409);
  const couple = (await database.ref(`couples/${profile.coupleId}`).get()).val() || {};
  if (!couple.members?.[uid]) throw apiError("Bạn không còn quyền truy cập không gian này.", 403);
  const partnerUid = Object.keys(couple.members).find((memberUid) => memberUid !== uid);
  if (!partnerUid) throw apiError("Người ấy chưa tham gia không gian.", 409);
  return { coupleId: profile.coupleId, couple, partnerUid };
}

async function createLetter(database, uid, rawLetter, now = Date.now()) {
  const { coupleId, partnerUid } = await coupleContext(database, uid);
  const title = cleanTitle(rawLetter?.title);
  const body = cleanBody(rawLetter?.body);
  const openDate = String(rawLetter?.openDate || "");
  if (!title || !body) throw apiError("Hãy viết tiêu đề và nội dung lá thư.", 400);
  const opensAt = validateFutureDate(openDate, now);
  const letterRef = database.ref(`couples/${coupleId}/shared/futureLetters`).push();
  const metadata = {
    title,
    openDate,
    opensAt,
    createdAt: now,
    createdBy: uid,
    recipientUid: partnerUid,
    openedAt: 0,
    openedBy: "",
  };
  await database.ref().update({
    [`couples/${coupleId}/shared/futureLetters/${letterRef.key}`]: metadata,
    [`futureLetterBodies/${coupleId}/${letterRef.key}`]: {
      body,
      createdBy: uid,
      recipientUid: partnerUid,
      opensAt,
    },
  });
  return { letter: { id: letterRef.key, ...metadata } };
}

async function openLetter(database, uid, rawLetterId, now = Date.now()) {
  const { coupleId } = await coupleContext(database, uid);
  const letterId = cleanLetterId(rawLetterId);
  if (!letterId) throw apiError("Lá thư không hợp lệ.", 400);
  const metadataRef = database.ref(`couples/${coupleId}/shared/futureLetters/${letterId}`);
  const metadata = (await metadataRef.get()).val();
  if (!metadata) throw apiError("Lá thư không còn tồn tại.", 404);
  const isCreator = metadata.createdBy === uid;
  const isRecipient = metadata.recipientUid === uid;
  if (!isCreator && !isRecipient) throw apiError("Bạn không có quyền mở lá thư này.", 403);
  if (!isCreator && now < Number(metadata.opensAt)) {
    throw apiError("Lá thư vẫn đang được niêm phong đến ngày đã hẹn.", 423);
  }
  const sealed = (await database.ref(`futureLetterBodies/${coupleId}/${letterId}`).get()).val();
  if (!sealed?.body) throw apiError("Nội dung lá thư không còn khả dụng.", 404);

  if (now >= Number(metadata.opensAt) && !Number(metadata.openedAt)) {
    await metadataRef.update({ openedAt: now, openedBy: uid });
  }
  return {
    letterId,
    body: sealed.body,
    preview: isCreator && now < Number(metadata.opensAt),
    unlocked: now >= Number(metadata.opensAt),
  };
}

async function deleteLetter(database, uid, rawLetterId) {
  const { coupleId } = await coupleContext(database, uid);
  const letterId = cleanLetterId(rawLetterId);
  if (!letterId) throw apiError("Lá thư không hợp lệ.", 400);
  const metadata = (
    await database.ref(`couples/${coupleId}/shared/futureLetters/${letterId}`).get()
  ).val();
  if (!metadata) return { deleted: false };
  if (metadata.createdBy !== uid) throw apiError("Chỉ người viết mới có thể xóa thư đã hẹn.", 403);
  if (Number(metadata.openedAt)) throw apiError("Lá thư đã mở không thể xóa khỏi kỷ niệm chung.", 409);
  await database.ref().update({
    [`couples/${coupleId}/shared/futureLetters/${letterId}`]: null,
    [`futureLetterBodies/${coupleId}/${letterId}`]: null,
  });
  return { deleted: true };
}

module.exports = async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    const decodedToken = await authenticateRequest(request);
    const { database } = adminServices();
    const action = String(request.body?.action || "");
    const intervals = { create: 1200, open: 500, delete: 1200 };
    if (!intervals[action]) throw apiError("Thao tác thư chưa được hỗ trợ.", 400);
    await enforceRateLimit(database, decodedToken.uid, `future-letter-${action}`, intervals[action]);
    let result;
    if (action === "create") result = await createLetter(database, decodedToken.uid, request.body);
    if (action === "open") result = await openLetter(database, decodedToken.uid, request.body.letterId);
    if (action === "delete") result = await deleteLetter(database, decodedToken.uid, request.body.letterId);
    sendJson(response, 200, result);
  } catch (error) {
    handleApiError(response, error);
  }
};

module.exports._test = {
  MAX_FUTURE_DAYS,
  cleanBody,
  cleanLetterId,
  cleanTitle,
  createLetter,
  deleteLetter,
  openLetter,
  opensAtForDate,
  validateFutureDate,
};
