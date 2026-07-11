const {
  adminServices,
  authenticateRequest,
  enforceRateLimit,
  handleApiError,
  requirePost,
  sendJson,
} = require("./_firebase-admin");

const invalidTokenCodes = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function cleanText(value) {
  return String(value || "").trim().replace(/\r\n/g, "\n");
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
  const body = showPreview
    ? `${message.senderName}: ${message.text}`.slice(0, 180)
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

    const text = cleanText(request.body?.text);
    const kind = request.body?.kind === "nudge" ? "nudge" : "message";
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

    const sender = couple.members[decodedToken.uid];
    const messageRef = database.ref(`couples/${profile.coupleId}/messages`).push();
    const message = {
      id: messageRef.key,
      senderId: decodedToken.uid,
      senderName: String(sender.displayName || decodedToken.name || "Người ấy").slice(0, 60),
      text,
      kind,
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

module.exports._test = { cleanText };
