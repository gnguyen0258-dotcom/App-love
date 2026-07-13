const {
  adminServices,
  authenticateRequest,
  enforceRateLimit,
  handleApiError,
  requirePost,
  sendJson,
} = require("./_firebase-admin");
const { sendUserPush } = require("./_push");
const chatMedia = require("../shared/chat-media.json");

const stickersById = new Map(
  chatMedia.stickerPacks.flatMap((pack) => pack.items).map((sticker) => [sticker.id, sticker]),
);
const ACTIVITY_TTL_MS = 24 * 60 * 60 * 1000;
const activityTypes = new Set([
  "daily-answer",
  "date-idea",
  "love-coupon",
  "coupon-redeemed",
  "surprise",
  "nudge",
  "nudge-heart",
  "nudge-hug",
  "nudge-kiss",
  "nudge-miss",
]);

function cleanText(value) {
  return String(value || "").trim().replace(/\r\n/g, "\n");
}

function cleanNickname(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function cleanStickerId(value) {
  return String(value || "").trim().toLowerCase();
}

function stickerForId(value) {
  return stickersById.get(cleanStickerId(value)) || null;
}

function activityTypeFor(value, fallback = "") {
  const type = String(value || fallback).trim().toLowerCase();
  return activityTypes.has(type) ? type : null;
}

function buildActivity({ id, uid, senderName, text, type }, createdAt = Date.now()) {
  return {
    id,
    actorId: uid,
    actorName: senderName,
    text,
    type,
    kind: "activity",
    createdAt,
    expiresAt: createdAt + ACTIVITY_TTL_MS,
  };
}

function apiError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function senderDisplayName(couple, uid, fallbackName) {
  const nickname = cleanNickname(couple?.shared?.nicknames?.[uid]);
  if (nickname) return nickname;
  return String(couple?.members?.[uid]?.displayName || fallbackName || "Người ấy").slice(0, 60);
}

async function sendPush({ database, messaging, partnerUid, entry }) {
  const userSnapshot = await database.ref(`users/${partnerUid}`).get();
  const recipient = userSnapshot.val() || {};
  const showPreview = Boolean(recipient.preferences?.showMessagePreview);
  const senderName = entry.senderName || entry.actorName || "Người ấy";
  const previewText = entry.kind === "sticker"
    ? `đã gửi sticker “${entry.text}”.`
    : entry.text;
  const body = showPreview
    ? `${senderName}: ${previewText}`.slice(0, 180)
    : entry.kind === "activity"
      ? `${senderName} vừa có một hoạt động mới.`
      : `${senderName} vừa gửi cho bạn một lời nhắn.`;

  return sendUserPush({
    database,
    messaging,
    uid: partnerUid,
    recipient,
    title: "HeartSync",
    body,
    link: entry.kind === "activity" ? "/?view=today" : "/?view=chat",
    messageId: entry.id,
    kind: entry.kind,
  });
}

async function cleanupExpiredActivities(database, coupleId, rawIds, now = Date.now()) {
  const activityIds = [...new Set(Array.isArray(rawIds) ? rawIds : [])]
    .map((value) => String(value || "").trim())
    .filter((value) => /^[A-Za-z0-9_-]{1,120}$/.test(value))
    .slice(0, 50);
  if (!activityIds.length) return 0;

  const snapshots = await Promise.all(
    activityIds.map((id) => database.ref(`couples/${coupleId}/activities/${id}`).get()),
  );
  const updates = {};
  snapshots.forEach((snapshot, index) => {
    const activity = snapshot.val();
    if (activity && Number(activity.expiresAt) <= now) {
      updates[`activities/${activityIds[index]}`] = null;
    }
  });
  if (Object.keys(updates).length) {
    await database.ref(`couples/${coupleId}`).update(updates);
  }
  return Object.keys(updates).length;
}

module.exports = async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    const decodedToken = await authenticateRequest(request);
    const { database, messaging } = adminServices();
    const action = request.body?.action;
    const requestedKind = request.body?.kind;
    const isActivity = requestedKind === "activity" || requestedKind === "nudge";
    const isCleanup = action === "cleanup-activities";
    await enforceRateLimit(
      database,
      decodedToken.uid,
      isCleanup ? "activity-cleanup" : isActivity ? "activity" : "message",
      isCleanup ? 300 : 650,
    );

    const kind = requestedKind === "sticker" ? "sticker" : "message";
    const sticker = kind === "sticker" ? stickerForId(request.body?.stickerId) : null;
    const text = sticker ? sticker.label : cleanText(request.body?.text);

    const profileSnapshot = await database.ref(`users/${decodedToken.uid}`).get();
    const profile = profileSnapshot.val() || {};
    if (!profile.coupleId) {
      throw apiError("Tài khoản chưa liên kết với người ấy.", 409);
    }

    const coupleSnapshot = await database.ref(`couples/${profile.coupleId}`).get();
    const couple = coupleSnapshot.val();
    if (!couple?.members?.[decodedToken.uid]) {
      throw apiError("Bạn không còn quyền truy cập không gian này.", 403);
    }

    if (isCleanup) {
      const deleted = await cleanupExpiredActivities(
        database,
        profile.coupleId,
        request.body?.activityIds,
      );
      sendJson(response, 200, { deleted });
      return;
    }

    const partnerUid = Object.keys(couple.members).find((uid) => uid !== decodedToken.uid);
    if (!partnerUid) {
      throw apiError("Người ấy chưa tham gia không gian.", 409);
    }

    if (kind === "sticker" && !sticker) {
      throw apiError("Sticker chưa có trong thư viện HeartSync.", 400);
    }
    if (!text || text.length > (isActivity ? 240 : 1000)) {
      throw apiError(
        isActivity
          ? "Hoạt động cần nội dung từ 1 đến 240 ký tự."
          : "Lời nhắn cần từ 1 đến 1000 ký tự.",
        400,
      );
    }

    const senderName = senderDisplayName(couple, decodedToken.uid, decodedToken.name);
    if (isActivity) {
      const type = activityTypeFor(
        request.body?.activityType,
        requestedKind === "nudge" ? "nudge" : "",
      );
      if (!type) throw apiError("Loại hoạt động chưa được HeartSync hỗ trợ.", 400);

      const activityRef = database.ref(`couples/${profile.coupleId}/activities`).push();
      const activity = buildActivity({
        id: activityRef.key,
        uid: decodedToken.uid,
        senderName,
        text,
        type,
      });
      await activityRef.set(activity);

      let notification = { sent: 0 };
      try {
        notification = await sendPush({ database, messaging, partnerUid, entry: activity });
      } catch (pushError) {
        console.error("Push delivery failed", pushError);
      }
      sendJson(response, 200, { activity, notification });
      return;
    }

    const messageRef = database.ref(`couples/${profile.coupleId}/messages`).push();
    const message = {
      id: messageRef.key,
      senderId: decodedToken.uid,
      senderName,
      text,
      kind,
      ...(sticker ? { stickerId: sticker.id } : {}),
      createdAt: Date.now(),
    };
    await messageRef.set(message);

    let notification = { sent: 0 };
    try {
      notification = await sendPush({ database, messaging, partnerUid, entry: message });
    } catch (pushError) {
      console.error("Push delivery failed", pushError);
    }

    sendJson(response, 200, { message, notification });
  } catch (error) {
    handleApiError(response, error);
  }
};

module.exports._test = {
  ACTIVITY_TTL_MS,
  activityTypeFor,
  buildActivity,
  cleanNickname,
  cleanStickerId,
  cleanText,
  cleanupExpiredActivities,
  senderDisplayName,
  stickerForId,
};
