const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function resolveAppLink(pathname = "/") {
  if (/^https:\/\//i.test(pathname)) return pathname;
  const relative = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${relative}` : relative;
}

function registeredDevices(recipient) {
  return Object.entries(recipient?.devices || {})
    .filter(([, device]) => typeof device?.token === "string" && device.token.length > 20)
    .map(([deviceId, device]) => ({ deviceId, token: device.token }));
}

async function sendUserPush(options) {
  const {
    database,
    messaging,
    uid,
    title = "HeartSync",
    body,
    link = "/",
    messageId,
    kind = "notification",
    ttlSeconds = 86400,
    urgency = "high",
  } = options;
  const recipient = Object.hasOwn(options, "recipient")
    ? options.recipient || {}
    : (await database.ref(`users/${uid}`).get()).val() || {};
  const devices = registeredDevices(recipient);
  if (!devices.length) return { sent: 0, failed: 0, total: 0 };

  const result = await messaging.sendEachForMulticast({
    tokens: devices.map((device) => device.token),
    data: {
      title: String(title).slice(0, 80),
      body: String(body || "Bạn có một thông báo mới.").slice(0, 180),
      link: resolveAppLink(link),
      messageId: String(messageId || kind).slice(0, 160),
      kind: String(kind).slice(0, 60),
    },
    webpush: {
      headers: {
        TTL: String(Math.max(0, Math.round(Number(ttlSeconds) || 0))),
        Urgency: urgency,
      },
    },
  });

  const removals = {};
  result.responses.forEach((item, index) => {
    if (!item.success && INVALID_TOKEN_CODES.has(item.error?.code)) {
      removals[`users/${uid}/devices/${devices[index].deviceId}`] = null;
    }
  });
  if (Object.keys(removals).length) await database.ref().update(removals);
  return {
    sent: result.successCount,
    failed: result.failureCount,
    total: devices.length,
  };
}

module.exports = {
  INVALID_TOKEN_CODES,
  registeredDevices,
  resolveAppLink,
  sendUserPush,
};
