const {
  adminServices,
  authenticateRequest,
  enforceRateLimit,
  handleApiError,
  requirePost,
  sendJson,
} = require("./_firebase-admin");
const chatMedia = require("../shared/chat-media.json");

const stickersById = new Map(
  chatMedia.stickerPacks.flatMap((pack) => pack.items).map((sticker) => [sticker.id, sticker]),
);

const invalidTokenCodes = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
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

function senderDisplayName(couple, uid, fallbackName) {
  const nickname = cleanNickname(couple?.shared?.nicknames?.[uid]);
  if (nickname) return nickname;
  return String(couple?.members?.[uid]?.displayName || fallbackName || "Người ấy").slice(0, 60);
}

function appLink() {
  if (process.env.APP_BASE_URL) return `${process.env.APP_BASE_URL.replace(/\/$/, "")}/?view=chat`;
  return "/?view=chat";
}

async function sendPush({ database, messaging, partnerUid, message }) {
  const userSnapshot = await database.ref(`users/${partnerUid}`).get();
  const recipient = userSnapshot.val() || {};
  const devices = Object.entries(recipient.devices || {})
    .filter(([, device]) => typeof device?.token === "string" && device.token.length > 20)
    .map(([deviceId, device]) => ({ deviceId, token: device.token }));
  if (!devices.length) return { sent: 0 };

  const showPreview = Boolean(recipient.preferences?.showMessagePreview);
  const previewText = message.kind === "sticker"
    ? `đã gửi sticker “${message.text}”.`
    : message.text;
  const body = showPreview
    ? `${message.senderName}: ${previewText}`.slice(0, 180)
    : `${message.senderName} vừa gửi cho bạn một lời nhắn.`;

  const result = await messaging.sendEachForMulticast({
    tokens: devices.map((device) => device.token),
    data: {
      title: "HeartSync",
      body,
      link: appLink(),
      messageId: message.id,
      kind: message.kind,
    },
    webpush: {
      headers: {
        TTL: "86400",
        Urgency: "high",
      },
    },
  });

  const removals = {};
  result.responses.forEach((item, index) => {
    if (!item.success && invalidTokenCodes.has(item.error?.code)) {
      removals[`users/${partnerUid}/devices/${devices[index].deviceId}`] = null;
    }
  });
  if (Object.keys(removals).length) await database.ref().update(removals);
  return { sent: result.successCount };
}

module.exports = async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    const decodedToken = await authenticateRequest(request);
    const { database, messaging } = adminServices();
    await enforceRateLimit(database, decodedToken.uid, "message", 650);

    const requestedKind = request.body?.kind;
    const kind = requestedKind === "nudge"
      ? "nudge"
      : requestedKind === "sticker"
        ? "sticker"
        : "message";
    const sticker = kind === "sticker" ? stickerForId(request.body?.stickerId) : null;
    const text = sticker ? sticker.label : cleanText(request.body?.text);
    if (kind === "sticker" && !sticker) {
      const error = new Error("Sticker chưa có trong thư viện HeartSync.");
      error.statusCode = 400;
      throw error;
    }
    if (!text || text.length > 1000) {
      const error = new Error("Lời nhắn cần từ 1 đến 1000 ký tự.");
      error.statusCode = 400;
      throw error;
    }

    const profileSnapshot = await database.ref(`users/${decodedToken.uid}`).get();
    const profile = profileSnapshot.val() || {};
    if (!profile.coupleId) {
      const error = new Error("Tài khoản chưa liên kết với người ấy.");
      error.statusCode = 409;
      throw error;
    }

    const coupleSnapshot = await database.ref(`couples/${profile.coupleId}`).get();
    const couple = coupleSnapshot.val();
    if (!couple?.members?.[decodedToken.uid]) {
      const error = new Error("Bạn không còn quyền truy cập không gian này.");
      error.statusCode = 403;
      throw error;
    }
    const partnerUid = Object.keys(couple.members).find((uid) => uid !== decodedToken.uid);
    if (!partnerUid) {
      const error = new Error("Người ấy chưa tham gia không gian.");
      error.statusCode = 409;
      throw error;
    }

    const messageRef = database.ref(`couples/${profile.coupleId}/messages`).push();
    const message = {
      id: messageRef.key,
      senderId: decodedToken.uid,
      senderName: senderDisplayName(couple, decodedToken.uid, decodedToken.name),
      text,
      kind,
      ...(sticker ? { stickerId: sticker.id } : {}),
      createdAt: Date.now(),
    };
    await messageRef.set(message);

    let notification = { sent: 0 };
    try {
      notification = await sendPush({ database, messaging, partnerUid, message });
    } catch (pushError) {
      console.error("Push delivery failed", pushError);
    }

    sendJson(response, 200, { message, notification });
  } catch (error) {
    handleApiError(response, error);
  }
};

module.exports._test = {
  cleanNickname,
  cleanStickerId,
  cleanText,
  senderDisplayName,
  stickerForId,
};
