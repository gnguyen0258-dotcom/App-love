import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  get,
  getDatabase,
  limitToLast,
  onDisconnect,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const defaultConfig = {
  apiKey: "AIzaSyDG0U1T339wFXipvDFH7JjC7q2NKvRdDnU",
  authDomain: "applove-d9878.firebaseapp.com",
  databaseURL: "https://applove-d9878-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "applove-d9878",
  storageBucket: "applove-d9878.firebasestorage.app",
  messagingSenderId: "869706177743",
  appId: "1:869706177743:web:1c9822d97249daa4926bba",
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || defaultConfig.databaseURL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

let foregroundMessageUnsubscribe = null;
let presenceUnsubscribe = null;
let presenceRef = null;

function todayKey() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function deviceId() {
  const key = "heartsync_device_id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

function friendlyAuthError(error) {
  const messages = {
    "auth/email-already-in-use": "Email này đã có tài khoản.",
    "auth/invalid-credential": "Email hoặc mật khẩu chưa đúng.",
    "auth/invalid-email": "Email chưa đúng định dạng.",
    "auth/missing-password": "Hãy nhập mật khẩu.",
    "auth/weak-password": "Mật khẩu cần ít nhất 6 ký tự.",
    "auth/popup-blocked": "Safari đang chặn cửa sổ Google. Hãy tắt Chặn cửa sổ bật lên rồi thử lại.",
    "auth/popup-closed-by-user": "Cửa sổ đăng nhập đã được đóng.",
    "auth/web-storage-unsupported": "Safari đang chặn lưu phiên đăng nhập. Hãy cho phép cookie và thử lại.",
    "auth/unauthorized-domain": "Domain này chưa được cho phép trong Firebase Authentication.",
    "auth/operation-not-allowed": "Phương thức đăng nhập này chưa được bật trong Firebase.",
    "auth/network-request-failed": "Không thể kết nối. Hãy kiểm tra mạng và thử lại.",
  };
  return messages[error?.code] || error?.message || "Không thể đăng nhập lúc này.";
}

async function initSession() {
  await setPersistence(auth, browserLocalPersistence);
}

function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

async function signInGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

async function signInEmail(email, password) {
  try {
    return await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

async function createAccount({ name, email, password }) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    await ensureProfile(credential.user);
    return credential;
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

async function ensureProfile(user) {
  if (!user) return null;
  const profileRef = ref(database, `users/${user.uid}`);
  const snapshot = await get(profileRef);
  const existing = snapshot.val() || {};
  const displayName = user.displayName || existing.displayName || user.email?.split("@")[0] || "Bạn";
  const values = {
    displayName,
    email: user.email || "",
    photoURL: user.photoURL || "",
    lastSeen: serverTimestamp(),
  };
  if (!existing.createdAt) values.createdAt = serverTimestamp();
  if (!existing.preferences) {
    values.preferences = {
      showMessagePreview: false,
      quietHoursEnabled: false,
    };
  }
  await update(profileRef, values);
  return { ...existing, ...values };
}

function watchProfile(uid, callback) {
  return onValue(ref(database, `users/${uid}`), (snapshot) => callback(snapshot.val()));
}

function watchCouple(coupleId, callback) {
  return onValue(ref(database, `couples/${coupleId}`), (snapshot) => callback(snapshot.val()));
}

function watchMessages(coupleId, callback) {
  const messageQuery = query(
    ref(database, `couples/${coupleId}/messages`),
    orderByChild("createdAt"),
    limitToLast(100),
  );
  return onValue(messageQuery, (snapshot) => {
    const values = snapshot.val() || {};
    callback(Object.entries(values).map(([id, value]) => ({ id, ...value })));
  });
}

function startPresence(coupleId, uid) {
  stopPresence();
  presenceRef = ref(database, `couples/${coupleId}/presence/${uid}`);
  const connectedRef = ref(database, ".info/connected");
  presenceUnsubscribe = onValue(connectedRef, async (snapshot) => {
    if (snapshot.val() !== true) return;
    try {
      await onDisconnect(presenceRef).set({ online: false, lastSeen: serverTimestamp() });
      await set(presenceRef, { online: true, lastSeen: serverTimestamp() });
    } catch (error) {
      console.warn("Presence could not be updated", error);
    }
  });
}

function stopPresence() {
  if (presenceUnsubscribe) presenceUnsubscribe();
  presenceUnsubscribe = null;
  presenceRef = null;
}

async function saveCheckin(coupleId, uid, checkin) {
  await set(ref(database, `couples/${coupleId}/checkins/${todayKey()}/${uid}`), {
    mood: checkin.mood,
    need: checkin.need,
    note: checkin.note.slice(0, 240),
    updatedAt: serverTimestamp(),
  });
}

async function savePreference(uid, key, value) {
  await set(ref(database, `users/${uid}/preferences/${key}`), value);
}

async function saveNicknames(coupleId, nicknames) {
  const values = Object.fromEntries(
    Object.entries(nicknames || {}).map(([uid, value]) => {
      const nickname = String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
      return [uid, nickname || null];
    }),
  );
  await update(ref(database, `couples/${coupleId}/shared/nicknames`), values);
}

async function saveRelationshipDate(coupleId, uid, startDate) {
  await set(ref(database, `couples/${coupleId}/shared/relationship`), {
    startDate,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

async function saveVault(coupleId, uid, vault) {
  await set(ref(database, `couples/${coupleId}/shared/vault`), {
    favoriteFoods: String(vault.favoriteFoods || "").slice(0, 600),
    favoriteDrinks: String(vault.favoriteDrinks || "").slice(0, 600),
    favoriteFlowers: String(vault.favoriteFlowers || "").slice(0, 300),
    bodyGender: vault.bodyGender === "male" ? "male" : "female",
    height: String(vault.height || "").slice(0, 20),
    weight: String(vault.weight || "").slice(0, 20),
    chest: String(vault.chest || "").slice(0, 20),
    waist: String(vault.waist || "").slice(0, 20),
    footLength: String(vault.footLength || "").slice(0, 20),
    notes: String(vault.notes || "").slice(0, 1200),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

async function saveCycle(coupleId, uid, cycle) {
  const length = Math.min(60, Math.max(15, Number.parseInt(cycle.length, 10) || 28));
  const periodDays = Object.fromEntries(
    [...new Set(cycle.periodDays || [])]
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .slice(-400)
      .map((date) => [date, true]),
  );
  await set(ref(database, `couples/${coupleId}/shared/cycle`), {
    length,
    periodDays,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

async function addCalendarEvent(coupleId, uid, event) {
  const eventId = crypto.randomUUID();
  await set(ref(database, `couples/${coupleId}/shared/events/${eventId}`), {
    title: String(event.title || "").trim().slice(0, 100),
    date: event.date,
    note: String(event.note || "").trim().slice(0, 500),
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
  return eventId;
}

async function deleteCalendarEvent(coupleId, eventId) {
  await remove(ref(database, `couples/${coupleId}/shared/events/${eventId}`));
}

async function saveDailyAnswer(coupleId, uid, date, text) {
  await set(ref(database, `couples/${coupleId}/shared/dailyQuestions/${date}/${uid}`), {
    text: String(text || "").trim().slice(0, 300),
    updatedAt: serverTimestamp(),
  });
}

async function addDateIdea(coupleId, uid, text) {
  const ideaRef = push(ref(database, `couples/${coupleId}/shared/dateIdeas`));
  await set(ideaRef, {
    text: String(text || "").trim().slice(0, 160),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return ideaRef.key;
}

async function deleteDateIdea(coupleId, ideaId) {
  await remove(ref(database, `couples/${coupleId}/shared/dateIdeas/${ideaId}`));
}

async function drawDateIdea(coupleId, uid, ideaId) {
  await set(ref(database, `couples/${coupleId}/shared/dateDraw`), {
    ideaId,
    drawnAt: serverTimestamp(),
    drawnBy: uid,
  });
}

async function createLoveCoupon(coupleId, uid, partnerUid, coupon) {
  const couponRef = push(ref(database, `couples/${coupleId}/shared/coupons`));
  await set(couponRef, {
    title: String(coupon.title || "").trim().slice(0, 80),
    note: String(coupon.note || "").trim().slice(0, 300),
    status: "available",
    createdAt: serverTimestamp(),
    createdBy: uid,
    assignedTo: partnerUid,
    redeemedAt: 0,
    redeemedBy: "",
  });
  return couponRef.key;
}

async function redeemLoveCoupon(coupleId, uid, couponId) {
  await update(ref(database, `couples/${coupleId}/shared/coupons/${couponId}`), {
    status: "redeemed",
    redeemedAt: serverTimestamp(),
    redeemedBy: uid,
  });
}

async function apiRequest(path, body) {
  const user = auth.currentUser;
  if (!user) throw new Error("Phiên đăng nhập đã hết. Hãy đăng nhập lại.");
  const token = await user.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Không thể hoàn tất thao tác.");
  return payload;
}

function getPairingStatus() {
  return apiRequest("/api/couple", { action: "status" });
}

function submitPairCode(code) {
  return apiRequest("/api/couple", {
    action: "submit-code",
    code: code.trim().toUpperCase(),
  });
}

function leaveCouple() {
  return apiRequest("/api/couple", { action: "leave" });
}

function updateAvatar(avatarData) {
  return apiRequest("/api/couple", { action: "update-avatar", avatarData });
}

function updatePulseBackground(imageData) {
  return apiRequest("/api/couple", { action: "update-pulse-background", imageData });
}

function sendMessage({ text, kind = "message", stickerId = "" }) {
  return apiRequest("/api/message", { text, kind, stickerId });
}

function sendActivity({ text, type }) {
  return apiRequest("/api/message", {
    kind: "activity",
    activityType: type,
    text,
  });
}

function deleteExpiredActivities(activityIds) {
  return apiRequest("/api/message", {
    action: "cleanup-activities",
    activityIds,
  });
}

async function notificationCapability() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { supported: false, permission: "unsupported", registered: false };
  }
  const supported = await isSupported().catch(() => false);
  return { supported, permission: Notification.permission, registered: false };
}

async function enableNotifications(uid, onForegroundMessage) {
  const capability = await notificationCapability();
  if (!capability.supported) {
    throw new Error("Thiết bị hoặc trình duyệt này chưa hỗ trợ thông báo web.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Bạn chưa cho phép HeartSync gửi thông báo.");
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error("Thiếu VAPID key. Hãy thêm VITE_FIREBASE_VAPID_KEY trên Vercel.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Thiết bị chưa tạo được token thông báo.");

  await set(ref(database, `users/${uid}/devices/${deviceId()}`), {
    token,
    platform: navigator.platform || "web",
    userAgent: navigator.userAgent.slice(0, 220),
    updatedAt: serverTimestamp(),
  });

  if (foregroundMessageUnsubscribe) foregroundMessageUnsubscribe();
  foregroundMessageUnsubscribe = onMessage(messaging, onForegroundMessage);
  return { supported: true, permission: "granted", registered: true };
}

async function restoreNotifications(uid, onForegroundMessage) {
  const capability = await notificationCapability();
  if (!capability.supported || capability.permission !== "granted") return capability;
  try {
    return await enableNotifications(uid, onForegroundMessage);
  } catch {
    return { ...capability, registered: false };
  }
}

async function signOutUser() {
  stopPresence();
  await signOut(auth);
}

export const firebaseService = {
  initSession,
  watchAuth,
  signInGoogle,
  signInEmail,
  createAccount,
  ensureProfile,
  watchProfile,
  watchCouple,
  watchMessages,
  startPresence,
  stopPresence,
  saveCheckin,
  savePreference,
  saveNicknames,
  saveRelationshipDate,
  saveVault,
  saveCycle,
  addCalendarEvent,
  deleteCalendarEvent,
  saveDailyAnswer,
  addDateIdea,
  deleteDateIdea,
  drawDateIdea,
  createLoveCoupon,
  redeemLoveCoupon,
  getPairingStatus,
  submitPairCode,
  leaveCouple,
  updateAvatar,
  updatePulseBackground,
  sendMessage,
  sendActivity,
  deleteExpiredActivities,
  notificationCapability,
  enableNotifications,
  restoreNotifications,
  signOut: signOutUser,
  todayKey,
};
