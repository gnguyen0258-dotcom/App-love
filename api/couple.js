const crypto = require("node:crypto");
const {
  adminServices,
  authenticateRequest,
  enforceRateLimit,
  handleApiError,
  requirePost,
  sendJson,
} = require("./_firebase-admin");
const dailyEncouragementCatalog = require("../shared/daily-encouragement.json");

const PAIR_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIR_REQUEST_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const PAIR_CLAIM_LIFETIME_MS = 30 * 1000;
const MAX_AVATAR_DATA_LENGTH = 160_000;
const MAX_AVATAR_BYTES = 120_000;
const MAX_BACKGROUND_DATA_LENGTH = 360_000;
const MAX_BACKGROUND_BYTES = 270_000;
const COUPON_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const DAILY_ENCOURAGEMENTS = dailyEncouragementCatalog.items;
const DAILY_ENCOURAGEMENT_IDS = new Set(DAILY_ENCOURAGEMENTS.map((item) => item.id));

function dateKeyInTimeZone(value = new Date(), timeZone = dailyEncouragementCatalog.timezone) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function fallbackDailyEncouragement(dateKey, randomIndex) {
  const [year, month, day] = dateKey.split("-");
  const quote = DAILY_ENCOURAGEMENTS[randomIndex(DAILY_ENCOURAGEMENTS.length)];
  const continuation = `${quote.text.charAt(0).toLowerCase()}${quote.text.slice(1)}`;
  return {
    quoteId: `date-${dateKey}`,
    text: `Dành riêng cho ngày ${day}/${month}/${year}: ${continuation}`,
  };
}

function buildDailyEncouragementState(
  currentValue,
  dateKey,
  assignedAt = Date.now(),
  randomIndex = (length) => crypto.randomInt(length),
) {
  const currentState = currentValue && typeof currentValue === "object" ? currentValue : {};
  const current = currentState.current;
  if (
    current?.date === dateKey &&
    typeof current.quoteId === "string" &&
    typeof current.text === "string" &&
    current.text.length > 0 &&
    Number(current.assignedAt) > 0
  ) {
    return { changed: false, current, state: currentState };
  }

  const used = Object.fromEntries(
    Object.entries(currentState.used || {}).filter(
      ([quoteId, usedDate]) => DAILY_ENCOURAGEMENT_IDS.has(quoteId) && /^\d{4}-\d{2}-\d{2}$/.test(usedDate),
    ),
  );
  const available = DAILY_ENCOURAGEMENTS.filter((quote) => !Object.hasOwn(used, quote.id));
  const selected = available.length
    ? available[randomIndex(available.length)]
    : fallbackDailyEncouragement(dateKey, randomIndex);
  const nextCurrent = {
    date: dateKey,
    quoteId: selected.id || selected.quoteId,
    text: selected.text,
    assignedAt,
  };
  if (available.length) used[nextCurrent.quoteId] = dateKey;

  return {
    changed: true,
    current: nextCurrent,
    state: { current: nextCurrent, used },
  };
}

function createPairCode() {
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += PAIR_CODE_ALPHABET[bytes[index] % PAIR_CODE_ALPHABET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^(.{4})(.{4})$/, "$1-$2");
}

function isPairCode(value) {
  return /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(value);
}

function pairKey(firstUid, secondUid) {
  return [firstUid, secondUid].sort().join(":");
}

function apiError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validAvatarMagic(mime, bytes) {
  if (mime === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "png") {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

function normalizeAvatarData(value) {
  if (value == null || value === "") return "";
  const data = String(value).trim();
  if (data.length > MAX_AVATAR_DATA_LENGTH) {
    throw apiError("Ảnh đại diện quá lớn. Hãy chọn ảnh khác.", 400);
  }
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) throw apiError("Ảnh đại diện chưa đúng định dạng.", 400);
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length < 32 || bytes.length > MAX_AVATAR_BYTES || !validAvatarMagic(match[1], bytes)) {
    throw apiError("Ảnh đại diện chưa hợp lệ.", 400);
  }
  return `data:image/${match[1]};base64,${match[2]}`;
}

function normalizeBackgroundData(value) {
  if (value == null || value === "") return "";
  const data = String(value).trim();
  if (data.length > MAX_BACKGROUND_DATA_LENGTH) {
    throw apiError("Ảnh nền quá lớn. Hãy chọn ảnh khác.", 400);
  }
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) throw apiError("Ảnh nền chưa đúng định dạng.", 400);
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length < 32 || bytes.length > MAX_BACKGROUND_BYTES || !validAvatarMagic(match[1], bytes)) {
    throw apiError("Ảnh nền chưa hợp lệ.", 400);
  }
  return `data:image/${match[1]};base64,${match[2]}`;
}

function storedAvatarData(profile) {
  try {
    return normalizeAvatarData(profile?.avatarData);
  } catch {
    return "";
  }
}

function publicMember(profile, decodedToken = {}, now = Date.now()) {
  const fallbackName =
    decodedToken.name ||
    profile?.email?.split("@")[0] ||
    decodedToken.email?.split("@")[0] ||
    "Thành viên";
  return {
    displayName: String(profile?.displayName || fallbackName).slice(0, 60),
    photoURL: String(profile?.photoURL || decodedToken.picture || "").slice(0, 500),
    avatarData: storedAvatarData(profile),
    joinedAt: now,
  };
}

function indexedUid(value) {
  return typeof value === "string" ? value : value?.uid;
}

async function releasePairCode(database, code, uid) {
  await database.ref(`pairCodes/${code}`).transaction((current) => {
    if (indexedUid(current) === uid) return null;
    return current;
  });
}

async function ensurePairCode(database, uid) {
  const profileRef = database.ref(`users/${uid}`);
  const profile = (await profileRef.get()).val() || {};
  const existingCode = normalizeCode(profile.pairCode);

  if (isPairCode(existingCode)) {
    const now = Date.now();
    const result = await database.ref(`pairCodes/${existingCode}`).transaction((current) => {
      const owner = indexedUid(current);
      if (owner && owner !== uid) return;
      return { uid, createdAt: Number(current?.createdAt) || now };
    });
    if (result.committed) return existingCode;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createPairCode();
    const now = Date.now();
    const result = await database.ref(`pairCodes/${code}`).transaction((current) => {
      if (current) return;
      return { uid, createdAt: now };
    });
    if (!result.committed) continue;
    try {
      await profileRef.child("pairCode").set(code);
      return code;
    } catch (error) {
      await releasePairCode(database, code, uid);
      throw error;
    }
  }

  throw new Error("Could not allocate a unique personal pair code.");
}

function validPairRequest(request, targetUid, now = Date.now()) {
  return Boolean(
    request &&
      request.targetUid === targetUid &&
      Number(request.expiresAt) > now,
  );
}

async function pairingStatus(database, uid) {
  const code = await ensurePairCode(database, uid);
  const profile = (await database.ref(`users/${uid}`).get()).val() || {};
  if (profile.coupleId) return { code, linked: true, coupleId: profile.coupleId };

  const requestRef = database.ref(`pairRequests/${uid}`);
  const request = (await requestRef.get()).val();
  if (!request) return { code, linked: false, waiting: false };
  if (Number(request.expiresAt) <= Date.now()) {
    await requestRef.remove();
    return { code, linked: false, waiting: false };
  }

  const targetProfile = (await database.ref(`users/${request.targetUid}`).get()).val() || {};
  if (targetProfile.coupleId) {
    await requestRef.remove();
    return { code, linked: false, waiting: false };
  }

  return {
    code,
    linked: false,
    waiting: true,
    targetCode: request.targetCode,
    targetName: String(targetProfile.displayName || "Người ấy").slice(0, 60),
    expiresAt: Number(request.expiresAt),
  };
}

async function claimUser(database, uid, operationId, matchKey, now) {
  const result = await database.ref(`pairClaims/${uid}`).transaction((current) => {
    const expired = !current || Number(current.expiresAt) <= now;
    if (!expired && current.operationId !== operationId) return;
    return {
      operationId,
      pairKey: matchKey,
      expiresAt: now + PAIR_CLAIM_LIFETIME_MS,
    };
  });
  return result.committed && result.snapshot.val()?.operationId === operationId;
}

async function releaseClaims(database, uids, operationId) {
  await Promise.all(
    uids.map((uid) =>
      database.ref(`pairClaims/${uid}`).transaction((current) => {
        if (current?.operationId === operationId) return null;
        return current;
      }),
    ),
  );
}

async function submitPairCode(database, uid, decodedToken, rawCode) {
  const ownCode = await ensurePairCode(database, uid);
  const code = normalizeCode(rawCode);
  if (!isPairCode(code)) {
    throw apiError("Mã cá nhân chưa đúng định dạng.", 400);
  }
  if (code === ownCode) {
    throw apiError("Bạn cần nhập mã của người ấy, không phải mã của mình.", 400);
  }

  const index = (await database.ref(`pairCodes/${code}`).get()).val();
  const targetUid = indexedUid(index);
  if (!targetUid) throw apiError("Không tìm thấy tài khoản dùng mã này.", 404);
  if (targetUid === uid) {
    throw apiError("Bạn cần nhập mã của người ấy, không phải mã của mình.", 400);
  }

  const [profileSnapshot, targetProfileSnapshot] = await Promise.all([
    database.ref(`users/${uid}`).get(),
    database.ref(`users/${targetUid}`).get(),
  ]);
  const profile = profileSnapshot.val() || {};
  const targetProfile = targetProfileSnapshot.val() || {};
  if (profile.coupleId) throw apiError("Tài khoản của bạn đã được liên kết.", 409);
  if (targetProfile.coupleId) throw apiError("Người dùng mã này đã liên kết với tài khoản khác.", 409);

  const now = Date.now();
  await database.ref(`pairRequests/${uid}`).set({
    targetUid,
    targetCode: code,
    createdAt: now,
    expiresAt: now + PAIR_REQUEST_LIFETIME_MS,
  });

  const reciprocal = (await database.ref(`pairRequests/${targetUid}`).get()).val();
  const targetName = String(targetProfile.displayName || "Người ấy").slice(0, 60);
  if (!validPairRequest(reciprocal, uid, now)) {
    return {
      code: ownCode,
      matched: false,
      waiting: true,
      targetCode: code,
      targetName,
      expiresAt: now + PAIR_REQUEST_LIFETIME_MS,
    };
  }

  const operationId = crypto.randomUUID();
  const matchKey = pairKey(uid, targetUid);
  const claimOrder = [uid, targetUid].sort();
  const claimed = [];
  for (const claimUid of claimOrder) {
    if (!(await claimUser(database, claimUid, operationId, matchKey, now))) {
      await releaseClaims(database, claimed, operationId);
      return {
        code: ownCode,
        matched: false,
        waiting: true,
        processing: true,
        targetCode: code,
        targetName,
      };
    }
    claimed.push(claimUid);
  }

  try {
    const [latestProfileSnapshot, latestTargetSnapshot, ownRequestSnapshot, theirRequestSnapshot] =
      await Promise.all([
        database.ref(`users/${uid}`).get(),
        database.ref(`users/${targetUid}`).get(),
        database.ref(`pairRequests/${uid}`).get(),
        database.ref(`pairRequests/${targetUid}`).get(),
      ]);
    const latestProfile = latestProfileSnapshot.val() || {};
    const latestTarget = latestTargetSnapshot.val() || {};

    if (latestProfile.coupleId || latestTarget.coupleId) {
      if (latestProfile.coupleId && latestProfile.coupleId === latestTarget.coupleId) {
        await releaseClaims(database, claimed, operationId);
        return { code: ownCode, matched: true, coupleId: latestProfile.coupleId };
      }
      throw apiError("Một trong hai tài khoản vừa được liên kết ở nơi khác.", 409);
    }

    if (
      !validPairRequest(ownRequestSnapshot.val(), targetUid) ||
      !validPairRequest(theirRequestSnapshot.val(), uid)
    ) {
      await releaseClaims(database, claimed, operationId);
      return { code: ownCode, matched: false, waiting: true, targetCode: code, targetName };
    }

    const matchedAt = Date.now();
    const coupleId = crypto.randomUUID().replaceAll("-", "");
    await database.ref().update({
      [`couples/${coupleId}/meta`]: {
        status: "active",
        pairingMethod: "mutual-code",
        createdAt: matchedAt,
        createdBy: uid,
      },
      [`couples/${coupleId}/members/${uid}`]: publicMember(latestProfile, decodedToken, matchedAt),
      [`couples/${coupleId}/members/${targetUid}`]: publicMember(latestTarget, {}, matchedAt),
      [`users/${uid}/coupleId`]: coupleId,
      [`users/${targetUid}/coupleId`]: coupleId,
      [`pairRequests/${uid}`]: null,
      [`pairRequests/${targetUid}`]: null,
      [`pairClaims/${uid}`]: null,
      [`pairClaims/${targetUid}`]: null,
    });
    return { code: ownCode, matched: true, coupleId };
  } catch (error) {
    await releaseClaims(database, claimed, operationId);
    throw error;
  }
}

async function leaveCouple(database, uid) {
  const profileRef = database.ref(`users/${uid}`);
  const profile = (await profileRef.get()).val() || {};
  if (!profile.coupleId) {
    await database.ref(`pairRequests/${uid}`).remove();
    return { left: true };
  }

  const coupleId = profile.coupleId;
  const couple = (await database.ref(`couples/${coupleId}`).get()).val() || {};
  const memberUids = [...new Set([uid, ...Object.keys(couple.members || {})])];
  const memberProfiles = await Promise.all(
    memberUids.map((memberUid) => database.ref(`users/${memberUid}`).get()),
  );
  const updates = {
    [`couples/${coupleId}/members`]: null,
    [`couples/${coupleId}/presence`]: null,
    [`couples/${coupleId}/meta/status`]: "closed",
    [`couples/${coupleId}/meta/closedAt`]: Date.now(),
    [`couples/${coupleId}/meta/closedBy`]: uid,
  };
  memberUids.forEach((memberUid, index) => {
    if (memberProfiles[index].val()?.coupleId === coupleId) {
      updates[`users/${memberUid}/coupleId`] = null;
    }
    updates[`pairRequests/${memberUid}`] = null;
    updates[`pairClaims/${memberUid}`] = null;
  });
  if (couple.meta?.inviteCode) updates[`invites/${couple.meta.inviteCode}`] = null;
  await database.ref().update(updates);
  return { left: true };
}

async function updateAvatar(database, uid, rawAvatarData) {
  const avatarData = normalizeAvatarData(rawAvatarData);
  const profile = (await database.ref(`users/${uid}`).get()).val() || {};
  await database.ref(`users/${uid}/avatarData`).set(avatarData || null);
  if (profile.coupleId) {
    await database.ref(`couples/${profile.coupleId}/members/${uid}`).transaction((current) => {
      // A cold transaction starts with null, then retries with server data after a hash mismatch.
      if (!current) return null;
      const member = { ...current };
      if (avatarData) member.avatarData = avatarData;
      else delete member.avatarData;
      return member;
    });
  }
  return { updated: true, customAvatar: Boolean(avatarData) };
}

async function updatePulseBackground(database, uid, rawBackgroundData) {
  const imageData = normalizeBackgroundData(rawBackgroundData);
  const profile = (await database.ref(`users/${uid}`).get()).val() || {};
  if (!profile.coupleId) throw apiError("Tài khoản chưa liên kết với người ấy.", 409);
  const memberSnapshot = await database.ref(`couples/${profile.coupleId}/members/${uid}`).get();
  if (!memberSnapshot.exists()) throw apiError("Bạn không còn quyền sửa không gian này.", 403);
  await database.ref(`couples/${profile.coupleId}/shared/pulseBackground`).set(
    imageData
      ? { imageData, updatedAt: Date.now(), updatedBy: uid }
      : null,
  );
  return { updated: true, customBackground: Boolean(imageData) };
}

async function ensureDailyEncouragement(database, uid, options = {}) {
  const profile = (await database.ref(`users/${uid}`).get()).val() || {};
  if (!profile.coupleId) throw apiError("Tài khoản chưa liên kết với người ấy.", 409);
  const memberSnapshot = await database.ref(`couples/${profile.coupleId}/members/${uid}`).get();
  if (!memberSnapshot.exists()) throw apiError("Bạn không còn quyền xem không gian này.", 403);

  const dateKey = options.dateKey || dateKeyInTimeZone(options.date || new Date());
  const assignedAt = options.assignedAt || Date.now();
  const encouragementRef = database.ref(
    `couples/${profile.coupleId}/shared/dailyEncouragement`,
  );
  const result = await encouragementRef.transaction((current) =>
    buildDailyEncouragementState(
      current,
      dateKey,
      assignedAt,
      options.randomIndex,
    ).state,
  );
  const encouragement = result.snapshot?.val()?.current;
  if (!encouragement) throw apiError("Chưa thể chọn lời nhắn cho hôm nay.", 500);
  return { encouragement };
}

async function cleanupExpiredCoupons(database, coupleId, rawIds, now = Date.now()) {
  const couponIds = [...new Set(Array.isArray(rawIds) ? rawIds : [])]
    .map((value) => String(value || "").trim())
    .filter((value) => /^[A-Za-z0-9_-]{1,120}$/.test(value))
    .slice(0, 50);
  if (!couponIds.length) return 0;

  const snapshots = await Promise.all(
    couponIds.map((id) =>
      database.ref(`couples/${coupleId}/shared/coupons/${id}`).get(),
    ),
  );
  const updates = {};
  snapshots.forEach((snapshot, index) => {
    const coupon = snapshot.val();
    const redeemedAt = Number(coupon?.redeemedAt);
    if (
      coupon?.status === "redeemed" &&
      redeemedAt > 0 &&
      redeemedAt + COUPON_HISTORY_TTL_MS <= now
    ) {
      updates[`shared/coupons/${couponIds[index]}`] = null;
    }
  });
  if (Object.keys(updates).length) {
    await database.ref(`couples/${coupleId}`).update(updates);
  }
  return Object.keys(updates).length;
}

async function cleanupUserExpiredCoupons(database, uid, rawIds) {
  const profile = (await database.ref(`users/${uid}`).get()).val() || {};
  if (!profile.coupleId) throw apiError("Tài khoản chưa liên kết với người ấy.", 409);
  const memberSnapshot = await database.ref(`couples/${profile.coupleId}/members/${uid}`).get();
  if (!memberSnapshot.exists()) throw apiError("Bạn không còn quyền xem không gian này.", 403);
  const deleted = await cleanupExpiredCoupons(database, profile.coupleId, rawIds);
  return { deleted };
}

module.exports = async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    const decodedToken = await authenticateRequest(request);
    const { database } = adminServices();
    const action = request.body?.action;
    const intervals = {
      status: 300,
      "submit-code": 1000,
      "update-avatar": 1000,
      "update-pulse-background": 1500,
      "daily-encouragement": 500,
      "cleanup-coupons": 300,
      leave: 1500,
    };
    if (!Object.hasOwn(intervals, action)) {
      throw apiError("Thao tác ghép đôi không hợp lệ.", 400);
    }
    await enforceRateLimit(database, decodedToken.uid, `couple-${action}`, intervals[action]);

    let result;
    if (action === "status") result = await pairingStatus(database, decodedToken.uid);
    else if (action === "submit-code") {
      result = await submitPairCode(
        database,
        decodedToken.uid,
        decodedToken,
        request.body?.code,
      );
    } else if (action === "update-avatar") {
      result = await updateAvatar(database, decodedToken.uid, request.body?.avatarData);
    } else if (action === "update-pulse-background") {
      result = await updatePulseBackground(
        database,
        decodedToken.uid,
        request.body?.imageData,
      );
    } else if (action === "daily-encouragement") {
      result = await ensureDailyEncouragement(database, decodedToken.uid);
    } else if (action === "cleanup-coupons") {
      result = await cleanupUserExpiredCoupons(
        database,
        decodedToken.uid,
        request.body?.couponIds,
      );
    } else result = await leaveCouple(database, decodedToken.uid);
    sendJson(response, 200, result);
  } catch (error) {
    handleApiError(response, error);
  }
};

module.exports._test = {
  COUPON_HISTORY_TTL_MS,
  cleanupExpiredCoupons,
  cleanupUserExpiredCoupons,
  createPairCode,
  buildDailyEncouragementState,
  dateKeyInTimeZone,
  ensurePairCode,
  ensureDailyEncouragement,
  isPairCode,
  leaveCouple,
  normalizeCode,
  pairKey,
  pairingStatus,
  normalizeAvatarData,
  normalizeBackgroundData,
  submitPairCode,
  updateAvatar,
  updatePulseBackground,
  validPairRequest,
};
