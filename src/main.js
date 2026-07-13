import "./styles.css";
import {
  Archive,
  ArrowRight,
  Award,
  Bell,
  BellRing,
  BookHeart,
  CalendarDays,
  Calculator,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Dices,
  Flower2,
  Gift,
  Grid2X2,
  Heart,
  HeartHandshake,
  HeartPulse,
  House,
  Link2,
  LockKeyhole,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Plus,
  Quote,
  PartyPopper,
  Ruler,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  SmilePlus,
  Smartphone,
  Sparkles,
  Sprout,
  Sticker,
  StickyNote,
  Sunrise,
  Timer,
  TicketCheck,
  Trophy,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
  Utensils,
  Wifi,
  X,
  createIcons,
} from "lucide";
import { firebaseService } from "./firebase-client.js";
import { createDemoService } from "./demo-service.js";
import {
  clothingRecommendation,
  normalizeGender,
  shoeRecommendation,
} from "./size-guide.mjs";
import chatMedia from "../shared/chat-media.json";

const ICONS = {
  Archive,
  ArrowRight,
  Award,
  Bell,
  BellRing,
  BookHeart,
  CalendarDays,
  Calculator,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Dices,
  Flower2,
  Gift,
  Grid2X2,
  Heart,
  HeartHandshake,
  HeartPulse,
  House,
  Link2,
  LockKeyhole,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Plus,
  Quote,
  PartyPopper,
  Ruler,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  SmilePlus,
  Smartphone,
  Sparkles,
  Sprout,
  Sticker,
  StickyNote,
  Sunrise,
  Timer,
  TicketCheck,
  Trophy,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
  Utensils,
  Wifi,
  X,
};

const params = new URLSearchParams(window.location.search);
const previewRoute = params.get("preview");
const isPreview = previewRoute !== null;
const service = isPreview ? createDemoService(previewRoute || "app") : firebaseService;
const appRoot = document.getElementById("app");
const toastHost = document.getElementById("toast-host");

const toolItems = [
  ["days", "timer", "Tính ngày"],
  ["vault", "archive", "Kho lưu trữ"],
  ["cycle", "heart-pulse", "Chu kỳ"],
  ["calendar", "calendar-days", "Lịch"],
  ["love", "heart-handshake", "Góc yêu"],
];
const validViews = new Set(["today", "chat", "tools", "couple", "settings"]);
const validTools = new Set(toolItems.map(([tool]) => tool));
const requestedView = params.get("view");
const requestedTool = params.get("tool");
const now = new Date();
const MAX_AVATAR_FILE_BYTES = 12 * 1024 * 1024;
const MAX_AVATAR_DATA_LENGTH = 150_000;
const MAX_BACKGROUND_FILE_BYTES = 15 * 1024 * 1024;
const MAX_BACKGROUND_DATA_LENGTH = 340_000;
const COUPON_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

const notificationPreferences = [
  ["notificationMessages", "message-circle", "Tin nhắn", "Lời nhắn và sticker mới"],
  ["notificationCalendar", "calendar-days", "Lịch", "Sự kiện chung vào đầu ngày"],
  ["notificationCycle", "heart-pulse", "Chu kỳ", "Nhắc trước ngày xanh 3 ngày"],
  ["notificationCheckin", "heart-handshake", "Check-in", "Check-in và những tương tác nhỏ"],
];

const moods = ["Vui vẻ", "Bình yên", "Hơi mệt", "Lo lắng", "Buồn", "Cần nghỉ"];
const needs = ["Muốn được trò chuyện", "Cần một cái ôm", "Cần không gian", "Muốn đi đâu đó"];
const nudgeLabels = {
  miss: "Đang nhớ bạn",
  hug: "Gửi một cái ôm",
  kiss: "Gửi một nụ hôn",
  heart: "Tim mình đang nhớ bạn",
};
const stickersById = new Map(
  chatMedia.stickerPacks.flatMap((pack) => pack.items).map((sticker) => [sticker.id, sticker]),
);
const stickerTones = new Set(["coral", "gold", "lilac", "mint", "rose", "sky"]);

const dailyQuestions = [
  "Khoảnh khắc gần đây nào khiến bạn thấy được người ấy yêu thương?",
  "Nếu cuối tuần chỉ dành cho hai đứa, bạn muốn làm gì nhất?",
  "Một thói quen nhỏ của người ấy mà bạn âm thầm thích là gì?",
  "Hôm nay bạn muốn được người ấy quan tâm theo cách nào?",
  "Kỷ niệm nào của hai đứa luôn làm bạn mỉm cười?",
  "Có điều gì bạn muốn cảm ơn người ấy nhưng chưa nói không?",
  "Một nơi hai đứa nhất định phải cùng nhau đến là đâu?",
  "Bài hát nào lúc này làm bạn nghĩ đến người ấy?",
  "Điều gì ở hai đứa khiến bạn thấy thật tự hào?",
  "Một món ăn bạn muốn cùng người ấy thử trong tháng này?",
  "Lần đầu gặp nhau, chi tiết nào về người ấy làm bạn nhớ nhất?",
  "Bạn muốn hai đứa tạo thêm thói quen chung nào?",
  "Một lời khen thật cụ thể bạn dành cho người ấy hôm nay?",
  "Khi mệt, điều nhỏ nào từ người ấy giúp bạn thấy dễ chịu hơn?",
  "Nếu gửi người ấy một tấm bưu thiếp lúc này, bạn sẽ viết gì?",
  "Một giấc mơ chung bạn mong hai đứa thực hiện được?",
  "Khoảnh khắc bình thường nào bên nhau lại quý giá với bạn?",
  "Bạn muốn được ôm ở đâu trong chuyến đi tiếp theo của hai đứa?",
  "Có chuyện gì vui hôm nay bạn muốn kể riêng cho người ấy?",
  "Một điều mới bạn muốn học cùng người ấy là gì?",
  "Bạn nghĩ điểm mạnh nhất của hai đứa khi ở cạnh nhau là gì?",
  "Một buổi hẹn hoàn hảo không cần tốn nhiều tiền sẽ như thế nào?",
  "Nếu được quay lại một ngày của hai đứa, bạn chọn ngày nào?",
  "Bạn muốn nhắn điều gì cho phiên bản hai đứa của một năm sau?",
];

const couponPresets = [
  "Một cái ôm thật lâu",
  "Một buổi tối được chọn phim",
  "Một bữa ăn do mình chuẩn bị",
  "Một lần được dỗ dành không hỏi lý do",
  "Một buổi hẹn bí mật",
  "Một ngày được chọn mọi món ăn",
];

const surpriseMessages = [
  "Có người đang nghĩ về bạn nhiều hơn bình thường.",
  "Chuẩn bị nhận một cái ôm thật chặt nhé.",
  "Tối nay mình dành riêng một chút thời gian cho nhau nhé.",
  "Bạn vừa được chọn là điều dễ thương nhất hôm nay.",
  "Không có lý do gì cả, chỉ là mình đang rất nhớ bạn.",
  "Một bất ngờ nhỏ đang tìm đường đến chỗ bạn.",
];

function emptyEncouragementRequest() {
  return { requestedDate: "", loading: false, error: "", record: null };
}

const state = {
  user: null,
  profile: null,
  couple: null,
  messages: [],
  view: validViews.has(requestedView) ? requestedView : "today",
  toolView: validTools.has(requestedTool) ? requestedTool : "days",
  cycleCursor: { year: now.getFullYear(), month: now.getMonth() },
  calendarCursor: { year: now.getFullYear(), month: now.getMonth() },
  selectedEventDate: localDateKey(now),
  authMode: "login",
  pairing: { loading: true, code: "", linked: false, waiting: false },
  busy: false,
  error: "",
  messageDraft: "",
  chatPicker: null,
  emojiGroup: "feelings",
  dailyAnswerDraft: "",
  encouragementRequest: emptyEncouragementRequest(),
  checkinDraft: { mood: "", need: "", note: "" },
  openedLetters: {},
  notification: { supported: false, permission: "default", registered: false },
};

let authUnsubscribe = null;
let profileUnsubscribe = null;
let coupleUnsubscribe = null;
let messagesUnsubscribe = null;
let activeCoupleId = null;
let notificationRestoredFor = null;
let pairingLoadedFor = null;
let relationshipClockInterval = null;
let activityExpiryTimer = null;
let activityCleanupRetryTimer = null;
let couponExpiryTimer = null;
let couponCleanupRetryTimer = null;
let dailyRolloverTimer = null;
let observedDailyDate = service.todayKey();
let busyOperationId = 0;

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? escapeHTML(url.href) : "";
  } catch {
    return "";
  }
}

function safeAvatarData(value) {
  const data = String(value || "");
  if (data.length > 160_000) return "";
  return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)
    ? escapeHTML(data)
    : "";
}

function safeBackgroundData(value) {
  const data = String(value || "");
  if (data.length > 360_000) return "";
  return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)
    ? escapeHTML(data)
    : "";
}

function cleanNickname(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function stickerForId(value) {
  return stickersById.get(String(value || "").trim().toLowerCase()) || null;
}

function stickerTone(value) {
  return stickerTones.has(value) ? value : "coral";
}

async function prepareImageData(file, {
  maxFileBytes,
  maxDataLength,
  aspectRatio,
  variants,
  fill,
  label,
}) {
  if (!file || (file.type && !file.type.startsWith("image/"))) {
    throw new Error("Hãy chọn một tệp ảnh.");
  }
  if (file.size > maxFileBytes) {
    throw new Error(`${label} gốc quá lớn. Hãy chọn tệp nhỏ hơn.`);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Không thể đọc ảnh này. Hãy thử JPG, PNG hoặc WebP."));
      image.src = objectUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Ảnh chưa hợp lệ.");

    const sourceAspect = image.naturalWidth / image.naturalHeight;
    const sourceWidth = sourceAspect > aspectRatio
      ? image.naturalHeight * aspectRatio
      : image.naturalWidth;
    const sourceHeight = sourceAspect > aspectRatio
      ? image.naturalHeight
      : image.naturalWidth / aspectRatio;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    for (const [width, quality] of variants) {
      const height = Math.max(1, Math.round(width / aspectRatio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Thiết bị chưa thể xử lý ảnh.");
      context.fillStyle = fill;
      context.fillRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        width,
        height,
      );
      const webp = canvas.toDataURL("image/webp", quality);
      const imageData = webp.startsWith("data:image/webp")
        ? webp
        : canvas.toDataURL("image/jpeg", quality);
      if (imageData.length <= maxDataLength) return imageData;
    }
    throw new Error(`${label} vẫn quá lớn sau khi nén. Hãy chọn ảnh khác.`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function prepareAvatarData(file) {
  return prepareImageData(file, {
    maxFileBytes: MAX_AVATAR_FILE_BYTES,
    maxDataLength: MAX_AVATAR_DATA_LENGTH,
    aspectRatio: 1,
    variants: [[256, 0.82], [224, 0.76], [192, 0.7], [160, 0.64]],
    fill: "#f7f7f5",
    label: "Ảnh đại diện",
  });
}

function prepareBackgroundData(file) {
  return prepareImageData(file, {
    maxFileBytes: MAX_BACKGROUND_FILE_BYTES,
    maxDataLength: MAX_BACKGROUND_DATA_LENGTH,
    aspectRatio: 16 / 9,
    variants: [[1280, 0.8], [1080, 0.74], [900, 0.68], [720, 0.62]],
    fill: "#24776f",
    label: "Ảnh nền",
  });
}

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateFromKey(value, hour = 12) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;
  return date;
}

function dateOrdinal(value) {
  const date = dateFromKey(value);
  if (!date) return Number.NaN;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function daysBetween(start, end) {
  return dateOrdinal(end) - dateOrdinal(start);
}

function addDaysToKey(value, amount) {
  const date = dateFromKey(value);
  if (!date) return localDateKey();
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function formatDate(value, options = {}) {
  const date = dateFromKey(value);
  if (!date) return "Chưa đặt ngày";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(date);
}

function monthLabel(year, month) {
  return new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1),
  );
}

function readLegacyJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function relationshipStartDate() {
  const shared = state.couple?.shared?.relationship?.startDate;
  if (dateFromKey(shared)) return shared;
  const legacy = localStorage.getItem("heartsync_anniversary");
  if (dateFromKey(legacy)) return legacy;
  const createdAt = Number(state.couple?.meta?.createdAt);
  if (createdAt) return localDateKey(new Date(createdAt));
  return localDateKey();
}

function vaultData() {
  const shared = state.couple?.shared?.vault;
  if (shared) {
    return {
      ...shared,
      bodyGender: normalizeGender(shared.bodyGender),
      footLength: String(shared.footLength || ""),
    };
  }

  const legacy = readLegacyJSON("heartsync_vault");
  const items = Array.isArray(legacy) ? Object.fromEntries(legacy.map((item) => [item.id, item])) : {};
  return {
    favoriteFoods: (items.food?.foods || []).join(", "),
    favoriteDrinks: (items.food?.drinks || []).join(", "),
    favoriteFlowers: (items.flowers?.selection || []).join(", "),
    height: String(items.size?.height || ""),
    weight: String(items.size?.weight || ""),
    chest: String(items.size?.chest || ""),
    waist: String(items.size?.waist || ""),
    bodyGender: "female",
    footLength: "",
    notes: String(items.hates?.notes || ""),
  };
}

function cycleData() {
  const shared = state.couple?.shared?.cycle;
  const legacy = shared ? null : readLegacyJSON("heartsync_cycle_data");
  const source = shared || legacy || {};
  const storedDays = source.periodDays || {};
  const periodDays = Array.isArray(storedDays)
    ? storedDays
    : Object.entries(storedDays)
        .filter(([, selected]) => selected === true)
        .map(([date]) => date);
  return {
    length: Math.min(60, Math.max(15, Number.parseInt(source.length, 10) || 28)),
    periodDays: [...new Set(periodDays.filter((date) => dateFromKey(date)))].sort(),
  };
}

function calendarEvents() {
  return Object.entries(state.couple?.shared?.events || {})
    .map(([id, event]) => ({ id, ...event }))
    .filter((event) => event.title && dateFromKey(event.date))
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.createdAt) - Number(b.createdAt));
}

function questionOfDay() {
  const index = Math.abs(Math.floor(dateOrdinal(service.todayKey()))) % dailyQuestions.length;
  return dailyQuestions[index];
}

function validDailyEncouragement(value, dateKey = service.todayKey()) {
  return value &&
    value.date === dateKey &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    typeof value.quoteId === "string" &&
    typeof value.text === "string" &&
    value.text.length > 0 &&
    value.text.length <= 300 &&
    Number(value.assignedAt) > 0;
}

function dailyEncouragement() {
  const dateKey = service.todayKey();
  const shared = state.couple?.shared?.dailyEncouragement?.current;
  if (validDailyEncouragement(shared, dateKey)) return shared;
  const requested = state.encouragementRequest.record;
  return validDailyEncouragement(requested, dateKey) ? requested : null;
}

function dailyEncouragementDateLabel(dateKey) {
  const label = formatDate(dateKey, { weekday: "long", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dateIdeas() {
  return Object.entries(state.couple?.shared?.dateIdeas || {})
    .map(([id, idea]) => ({ id, ...idea }))
    .filter((idea) => idea.text)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

function couponEntries() {
  return Object.entries(state.couple?.shared?.coupons || {})
    .map(([id, coupon]) => ({ id, ...coupon }))
    .filter((coupon) => coupon.title);
}

function couponHistoryExpiresAt(coupon) {
  const redeemedAt = Number(coupon?.redeemedAt);
  return coupon?.status === "redeemed" && redeemedAt > 0
    ? redeemedAt + COUPON_HISTORY_TTL_MS
    : 0;
}

function loveCoupons(currentTime = Date.now()) {
  return couponEntries()
    .filter((coupon) => {
      const expiresAt = couponHistoryExpiresAt(coupon);
      return !expiresAt || expiresAt > currentTime;
    })
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

function preferenceEnabled(key) {
  return state.profile?.preferences?.[key] !== false;
}

function tomorrowDateKey() {
  return addDaysToKey(service.todayKey(), 1);
}

function futureLetters() {
  return Object.entries(state.couple?.shared?.futureLetters || {})
    .map(([id, letter]) => ({ id, ...letter }))
    .filter((letter) => letter.title && Number(letter.opensAt))
    .sort((left, right) => Number(left.opensAt) - Number(right.opensAt));
}

function interactionDayCount() {
  const days = new Set();
  const addTimestamp = (timestamp) => {
    const value = Number(timestamp);
    if (Number.isFinite(value) && value > 0) days.add(localDateKey(new Date(value)));
  };
  Object.keys(state.couple?.checkins || {}).forEach((dateKey) => days.add(dateKey));
  Object.keys(state.couple?.shared?.dailyQuestions || {}).forEach((dateKey) => days.add(dateKey));
  Object.values(state.couple?.messages || {}).forEach((message) => addTimestamp(message.createdAt));
  state.messages.forEach((message) => addTimestamp(message.createdAt));
  Object.values(state.couple?.activities || {}).forEach((activity) => addTimestamp(activity.createdAt));
  dateIdeas().forEach((idea) => addTimestamp(idea.createdAt));
  couponEntries().forEach((coupon) => addTimestamp(coupon.createdAt));
  futureLetters().forEach((letter) => addTimestamp(letter.createdAt));
  return Math.max(days.size, Number(state.couple?.shared?.stats?.interactionDays) || 0);
}

function totalMessageCount() {
  return Math.max(
    Object.keys(state.couple?.messages || {}).length,
    state.messages.length,
    Number(state.couple?.shared?.stats?.messageCount) || 0,
  );
}

function growthStage() {
  const days = interactionDayCount();
  const stages = [
    { min: 0, next: 3, name: "Hạt mầm", note: "Một điều nhỏ đang chờ được hai bạn chăm.", level: 0 },
    { min: 3, next: 7, name: "Mầm non", note: "Mầm yêu đã nhú lên từ những lần hai bạn ghé vào.", level: 1 },
    { min: 7, next: 14, name: "Chồi xanh", note: "Mỗi ngày trò chuyện đang giúp chồi xanh hơn.", level: 2 },
    { min: 14, next: 30, name: "Nụ yêu", note: "Một nụ hoa nhỏ đã xuất hiện trong khu vườn chung.", level: 3 },
    { min: 30, next: 60, name: "Hoa đầu mùa", note: "Sự hiện diện đều đặn của hai bạn đã nở thành hoa.", level: 4 },
    { min: 60, next: 100, name: "Vườn nhỏ", note: "Khu vườn đã đủ đầy bởi những ngày cùng chăm sóc.", level: 5 },
    { min: 100, next: null, name: "Cây kỷ niệm", note: "Một biểu tượng bền bỉ cho hành trình hai đứa.", level: 6 },
  ];
  const stage = [...stages].reverse().find((item) => days >= item.min) || stages[0];
  const progress = stage.next
    ? Math.min(100, Math.round(((days - stage.min) / (stage.next - stage.min)) * 100))
    : 100;
  return { ...stage, days, progress, remaining: stage.next ? stage.next - days : 0 };
}

function firstTripAchievement() {
  return state.couple?.shared?.achievements?.firstTrip || null;
}

function periodBlocks(periodDays) {
  if (!periodDays.length) return [];
  return periodDays.reduce((blocks, date) => {
    const current = blocks.at(-1);
    if (current && daysBetween(current.at(-1), date) === 1) current.push(date);
    else blocks.push([date]);
    return blocks;
  }, []);
}

function cyclePhase(position) {
  if (!position) return { label: "Chưa có dữ liệu", className: "none" };
  if (position <= 5) return { label: "Kỳ kinh", className: "period" };
  if (position === 14) return { label: "Rụng trứng ước tính", className: "ovulation" };
  if (position >= 10 && position <= 18) {
    return { label: "Cửa sổ dễ thụ thai ước tính", className: "fertile" };
  }
  return { label: "Khả năng thấp theo ước tính", className: "low" };
}

function cycleSummary() {
  const cycle = cycleData();
  const blocks = periodBlocks(cycle.periodDays);
  const starts = blocks.map(([start]) => start);
  const gaps = starts
    .slice(1)
    .map((start, index) => daysBetween(starts[index], start))
    .filter((gap) => gap >= 15 && gap <= 60);
  const inferredLength = gaps.length
    ? Math.round(gaps.reduce((total, gap) => total + gap, 0) / gaps.length)
    : cycle.length;
  const length = Math.min(60, Math.max(15, inferredLength));
  const today = localDateKey();
  const latestStart = starts.filter((start) => start <= today).at(-1) || starts.at(-1) || null;
  if (!latestStart) {
    return { ...cycle, length, blocks, position: 0, nextPeriod: null, phase: cyclePhase(0) };
  }
  const offset = daysBetween(latestStart, today);
  const position = ((offset % length) + length) % length + 1;
  let nextPeriod = addDaysToKey(latestStart, length);
  while (nextPeriod < today) nextPeriod = addDaysToKey(nextPeriod, length);
  return { ...cycle, length, blocks, latestStart, position, nextPeriod, phase: cyclePhase(position) };
}

function monthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(localDateKey(new Date(year, month, day)));
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}

function relationshipElapsed(startDate) {
  const start = dateFromKey(startDate, 0);
  const difference = Math.max(0, Date.now() - (start?.getTime() || Date.now()));
  return {
    dayNumber: Math.max(1, daysBetween(startDate, localDateKey()) + 1 || 1),
    hours: Math.floor((difference / 3_600_000) % 24),
    minutes: Math.floor((difference / 60_000) % 60),
    seconds: Math.floor((difference / 1_000) % 60),
  };
}

function relationshipMilestones(startDate) {
  const elapsed = Math.max(1, daysBetween(startDate, localDateKey()) + 1 || 1);
  const base = [100, 200, 365, 500, 730, 1000, 1500, 2000];
  let upcoming = base.filter((day) => day >= elapsed).slice(0, 4);
  if (upcoming.length < 4) {
    const nextRound = Math.ceil(elapsed / 500) * 500;
    upcoming = [...new Set([...upcoming, nextRound, nextRound + 500, nextRound + 1000])].slice(0, 4);
  }
  return upcoming.map((day) => ({ day, date: addDaysToKey(startDate, day - 1) }));
}

function clothingResultDetail(result) {
  if (result.size === "—") return "Nhập chiều cao hoặc cân nặng để tính.";
  const dimensions = [
    result.heightSize ? `chiều cao ${result.heightSize}` : "",
    result.weightSize ? `cân nặng ${result.weightSize}` : "",
  ].filter(Boolean).join(", ");
  const fitNote = result.heightSize && result.weightSize && result.heightSize !== result.weightSize
    ? " Chọn mức lớn hơn để hạn chế bị chật."
    : "";
  const extrapolation = result.extrapolated
    ? " Kết quả ngoài bảng được ngoại suy từ bước size gần nhất."
    : "";
  return `Bảng ${result.genderLabel.toLowerCase()}: ${dimensions}.${fitNote}${extrapolation}`;
}

function shoeResultDetail(result) {
  if (result.us === "—") return "Nhập chiều dài chân để quy đổi.";
  return result.extrapolated
    ? `Bảng giày ${result.genderLabel.toLowerCase()} · ngoại suy từ hai hàng gần biên nhất.`
    : `Đối chiếu theo bảng giày ${result.genderLabel.toLowerCase()}.`;
}

function initials(name = "Bạn") {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "B";
}

function avatarMarkup(person, extraClass = "") {
  const name = person?.displayName || "Bạn";
  const photo = safeAvatarData(person?.avatarData) || safeImageUrl(person?.photoURL);
  return `<span class="avatar ${extraClass}" aria-hidden="true">${
    photo ? `<img src="${photo}" alt="" referrerpolicy="no-referrer" />` : escapeHTML(initials(name))
  }</span>`;
}

function avatarEditorMarkup(compact = false) {
  const hasCustomAvatar = Boolean(safeAvatarData(state.profile?.avatarData));
  const displayName = !compact && state.profile?.coupleId
    ? myMember().displayName
    : state.profile.displayName || "Bạn";
  return `
    <div class="avatar-editor ${compact ? "avatar-editor--compact" : ""}">
      ${avatarMarkup({ ...state.profile, displayName }, "avatar--profile")}
      <div class="avatar-editor__copy">
        <strong>${escapeHTML(displayName)}</strong>
        <span>${hasCustomAvatar ? "Ảnh riêng đang hiển thị cho hai bạn." : "Đang dùng ảnh từ tài khoản Google."}</span>
      </div>
      <div class="avatar-editor__actions">
        <input class="sr-only" id="avatar-file-input" type="file" accept="image/*" />
        <button class="btn btn--secondary" type="button" data-action="choose-avatar" ${state.busy ? "disabled" : ""}>
          <i data-lucide="camera"></i> ${hasCustomAvatar ? "Đổi ảnh" : "Chọn ảnh"}
        </button>
        ${hasCustomAvatar ? `
          <button class="icon-button icon-button--danger" type="button" data-action="remove-avatar" title="Dùng lại ảnh Google" aria-label="Dùng lại ảnh Google" ${state.busy ? "disabled" : ""}>
            <i data-lucide="trash-2"></i>
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

function refreshIcons() {
  createIcons({ icons: ICONS, attrs: { "aria-hidden": "true" } });
}

function render() {
  if (!state.user) renderAuth();
  else if (!state.profile) renderBoot();
  else if (!state.profile.coupleId) renderPairing();
  else renderApp();
  refreshIcons();
}

function renderBoot() {
  appRoot.innerHTML = `
    <main class="boot-screen" aria-live="polite">
      <div class="brand-mark brand-mark--loading" aria-hidden="true"><span></span></div>
      <p>Đang đồng bộ không gian của hai bạn...</p>
    </main>
  `;
}

function brandMarkup(light = false) {
  return `
    <div class="brand-lockup${light ? " brand-lockup--light" : ""}">
      <span class="brand-mark" aria-hidden="true"><span></span></span>
      <span>HeartSync</span>
    </div>
  `;
}

function renderAuth() {
  const signup = state.authMode === "signup";
  appRoot.innerHTML = `
    <main class="auth-shell">
      <section class="auth-story" aria-labelledby="auth-story-title">
        ${brandMarkup(true)}
        <div class="auth-story__copy">
          <p class="eyebrow">Chỉ hai người, một nhịp chung</p>
          <h1 id="auth-story-title">Một nơi nhỏ để luôn tìm thấy nhau.</h1>
          <p class="auth-story__note">Những ngày bình thường cũng đáng được giữ lại.</p>
        </div>
        <p class="auth-story__footer">Không gian riêng tư dành cho hai tài khoản đã liên kết.</p>
      </section>

      <section class="auth-panel" aria-labelledby="auth-title">
        <button class="icon-button auth-refresh-button" type="button" data-action="refresh-app" title="Làm mới trang" aria-label="Làm mới trang">
          <i data-lucide="refresh-cw"></i>
        </button>
        <div class="auth-form-wrap">
          <h2 id="auth-title">${signup ? "Tạo tài khoản" : "Chào bạn trở lại"}</h2>
          <p>${signup ? "Bắt đầu không gian của hai người." : "Phiên của bạn sẽ được giữ trên thiết bị này."}</p>

          <div class="segmented" role="tablist" aria-label="Chọn hình thức đăng nhập">
            <button type="button" role="tab" aria-selected="${!signup}" data-action="auth-mode" data-mode="login">Đăng nhập</button>
            <button type="button" role="tab" aria-selected="${signup}" data-action="auth-mode" data-mode="signup">Tạo tài khoản</button>
          </div>

          <button class="btn btn--secondary btn--block" type="button" data-action="google-auth" ${state.busy ? "disabled" : ""}>
            <i data-lucide="user-round"></i>
            Tiếp tục với Google
          </button>

          <div class="divider">hoặc dùng email</div>

          <form class="form-stack" data-form="auth" novalidate>
            ${signup ? `
              <div class="field">
                <label for="auth-name">Tên hiển thị</label>
                <input id="auth-name" name="name" autocomplete="name" maxlength="60" required />
              </div>
            ` : ""}
            <div class="field">
              <label for="auth-email">Email</label>
              <input id="auth-email" name="email" type="email" autocomplete="email" required />
            </div>
            <div class="field">
              <label for="auth-password">Mật khẩu</label>
              <input id="auth-password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="6" required />
            </div>
            <button class="btn btn--primary btn--block" type="submit" ${state.busy ? "disabled" : ""}>
              ${state.busy ? "Đang xử lý..." : signup ? "Tạo tài khoản" : "Đăng nhập"}
              <i data-lucide="arrow-right"></i>
            </button>
          </form>
          <p class="form-error" role="alert">${escapeHTML(state.error)}</p>
          <p class="auth-privacy"><i data-lucide="shield-check"></i> Tài khoản chỉ truy cập dữ liệu của cặp đôi đã xác nhận.</p>
        </div>
      </section>
    </main>
  `;
}

function renderPairing() {
  const pairing = state.pairing || {};
  appRoot.innerHTML = `
    <main class="onboarding-shell">
      <section class="onboarding-copy">
        ${brandMarkup(true)}
        <div>
          <p class="eyebrow">Xin chào ${escapeHTML(state.profile.displayName || state.user.displayName || "bạn")}</p>
          <h1>Hai mã riêng, một xác nhận chung.</h1>
          <p>Mỗi Gmail giữ mã của riêng mình. Không gian chỉ mở khi hai bạn đã nhập đúng mã của nhau.</p>
        </div>
        <div class="onboarding-copy__actions">
          <button class="btn btn--quiet" type="button" data-action="refresh-app"><i data-lucide="refresh-cw"></i> Làm mới</button>
          <button class="btn btn--quiet" type="button" data-action="logout"><i data-lucide="log-out"></i> Đăng xuất</button>
        </div>
      </section>

      <section class="onboarding-form" aria-labelledby="pair-title">
        <div class="onboarding-form__inner pairing-form-wrap">
          <div class="pairing-heading">
            <p class="eyebrow">Xác nhận hai chiều</p>
            <h2 id="pair-title">Trao đổi mã với người ấy</h2>
            <p>Mỗi người đăng nhập Gmail của mình, gửi mã cá nhân cho đối phương rồi nhập mã nhận được.</p>
          </div>

          ${avatarEditorMarkup(true)}

          <div class="mutual-pairing-grid">
            <section class="personal-code-panel" aria-labelledby="personal-code-title">
              <div class="pair-step"><span>01</span><i data-lucide="lock-keyhole"></i></div>
              <div>
                <h3 id="personal-code-title">Mã của bạn</h3>
                <p>Gửi mã này cho người ấy.</p>
              </div>
              <div class="personal-code" aria-live="polite">
                ${pairing.loading ? "ĐANG-CẤP" : escapeHTML(pairing.code || "CHƯA-CÓ")}
              </div>
              <button class="btn btn--secondary btn--block" type="button" data-action="copy-personal-code" ${!pairing.code || pairing.loading ? "disabled" : ""}>
                <i data-lucide="copy"></i> Sao chép mã của tôi
              </button>
            </section>

            <section class="partner-code-panel" aria-labelledby="partner-code-title">
              <div class="pair-step"><span>02</span><i data-lucide="user-plus"></i></div>
              <div>
                <h3 id="partner-code-title">Mã của người ấy</h3>
                <p>Nhập mã người ấy đã gửi cho bạn.</p>
              </div>
              <form class="form-stack" data-form="mutual-pair">
                <div class="field">
                  <label class="sr-only" for="partner-code">Mã cá nhân của người ấy</label>
                  <input class="code-input" id="partner-code" name="code" autocomplete="off" maxlength="9" value="${escapeHTML(pairing.targetCode || "")}" placeholder="ABCD-EFGH" required />
                </div>
                <button class="btn btn--primary btn--block" type="submit" ${state.busy || pairing.loading ? "disabled" : ""}>
                  <i data-lucide="link-2"></i> Xác nhận mã người ấy
                </button>
              </form>
              ${isPreview ? `<p class="demo-code-hint">Mã demo của người ấy: <strong>NGAY-AY25</strong></p>` : ""}
            </section>
          </div>

          ${pairing.waiting ? `
            <div class="pairing-waiting" role="status">
              <span class="pairing-waiting__icon"><i data-lucide="clock-3"></i></span>
              <div>
                <strong>${pairing.processing ? "Đang hoàn tất xác nhận" : `Đang chờ ${escapeHTML(pairing.targetName || "người ấy")}`}</strong>
                <p>${pairing.processing ? "Hai mã đã khớp. Hệ thống đang khóa và tạo không gian chung." : `Bạn đã nhập mã ${escapeHTML(pairing.targetCode || "")}. Người ấy cần nhập mã ${escapeHTML(pairing.code || "của bạn")}.`}</p>
              </div>
            </div>
          ` : ""}

          <p class="pairing-security"><i data-lucide="shield-check"></i> Biết một mã là chưa đủ. Máy chủ chỉ liên kết khi cả hai chiều cùng khớp.</p>
          <p class="form-error" role="alert">${escapeHTML(state.error)}</p>
        </div>
      </section>
    </main>
  `;
}

function memberEntries() {
  const nicknames = state.couple?.shared?.nicknames || {};
  return Object.entries(state.couple?.members || {})
    .map(([uid, value]) => ({
      uid,
      ...value,
      accountName: value.displayName || "Thành viên",
      displayName: cleanNickname(nicknames[uid]) || value.displayName || "Thành viên",
    }))
    .sort((first, second) => Number(first.uid !== state.user.uid) - Number(second.uid !== state.user.uid));
}

function myMember() {
  return memberEntries().find((member) => member.uid === state.user.uid) || {
    uid: state.user.uid,
    displayName: state.profile.displayName || state.user.displayName || "Bạn",
    photoURL: state.profile.photoURL || state.user.photoURL || "",
    avatarData: state.profile.avatarData || "",
  };
}

function partnerMember() {
  return memberEntries().find((member) => member.uid !== state.user.uid) || null;
}

function memberDisplayName(uid, fallback = "Người ấy") {
  return memberEntries().find((member) => member.uid === uid)?.displayName || fallback;
}

function partnerOnline() {
  const partner = partnerMember();
  return partner ? Boolean(state.couple?.presence?.[partner.uid]?.online) : false;
}

function relationshipDays() {
  const createdAt = Number(state.couple?.meta?.createdAt);
  if (!createdAt) return 1;
  return Math.max(1, Math.floor((Date.now() - createdAt) / 86_400_000) + 1);
}

function renderApp() {
  const me = myMember();
  const partner = partnerMember();
  const pairName = partner
    ? `${me.displayName || "Bạn"} & ${partner.displayName || "Người ấy"}`
    : "Đang chờ người ấy";
  const online = partnerOnline();

  appRoot.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        ${brandMarkup()}
        <p class="sidebar-intro">Không gian riêng của hai người.</p>
        ${navigationMarkup("desktop")}
        <div class="sidebar-memory" aria-label="Số ngày trong không gian chung">
          <span>Nhật ký chung</span>
          <strong>Ngày ${relationshipDays()}</strong>
        </div>
        <div class="sidebar-profile">
          <div class="profile-chip">
            ${avatarMarkup({ ...state.profile, displayName: me.displayName })}
            <div class="profile-chip__meta">
              <strong>${escapeHTML(me.displayName || "Bạn")}</strong>
              <span>${escapeHTML(state.user.email || "Đã đăng nhập")}</span>
            </div>
          </div>
        </div>
      </aside>

      <div class="main-column">
        <header class="topbar">
          <div class="topbar__identity">
            <div class="topbar__avatars" aria-hidden="true">
              ${avatarMarkup(me, "avatar--topbar")}
              ${partner ? avatarMarkup(partner, "avatar--topbar") : ""}
              <span class="status-dot ${online ? "status-dot--online" : ""}"></span>
            </div>
            <div class="topbar__pair">
              <div>
                <strong>${escapeHTML(pairName)}</strong>
                <span>${partner ? (online ? "Đang ở đây" : "Sẽ thấy lời nhắn khi quay lại") : "Liên kết cũ chưa hoàn tất"}</span>
              </div>
            </div>
          </div>
          <div class="topbar__actions">
            <button class="icon-button" type="button" data-action="refresh-app" title="Làm mới ứng dụng" aria-label="Làm mới ứng dụng">
              <i data-lucide="refresh-cw"></i>
            </button>
            <button class="icon-button" type="button" data-action="go-settings" title="Cài đặt thông báo" aria-label="Cài đặt thông báo">
              <i data-lucide="${state.notification.permission === "granted" ? "bell-ring" : "bell"}"></i>
            </button>
          </div>
        </header>

        ${renderCurrentView()}
      </div>
      ${navigationMarkup("mobile")}
    </div>
  `;

  if (state.view === "chat") queueMicrotask(scrollMessagesToEnd);
}

function navigationMarkup(mode) {
  if (mode === "mobile") {
    const items = [
      ["today", "house", "Hôm nay"],
      ["chat", "message-circle", "Tin nhắn"],
      ["tools", "grid-2x2", "Tiện ích"],
      ["couple", "users-round", "Hai đứa"],
      ["settings", "settings", "Cài đặt"],
    ];
    return `<nav class="mobile-nav" aria-label="Điều hướng chính">
      ${items.map(([view, icon, label]) => `
        <button class="nav-item" type="button" data-action="navigate" data-view="${view}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}" ${state.view === view ? 'aria-current="page"' : ""}>
          <i data-lucide="${icon}"></i><span>${label}</span>
        </button>
      `).join("")}
    </nav>`;
  }

  const mainItems = [
    ["today", "house", "Hôm nay"],
    ["chat", "message-circle", "Trò chuyện"],
  ];
  const accountItems = [
    ["couple", "users-round", "Hai đứa"],
    ["settings", "settings", "Cài đặt"],
  ];
  const itemMarkup = ([view, icon, label]) => `
    <button class="nav-item" type="button" data-action="navigate" data-view="${view}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}" ${state.view === view ? 'aria-current="page"' : ""}>
      <i data-lucide="${icon}"></i><span>${label}</span>
    </button>`;

  return `<nav class="nav-list" aria-label="Điều hướng chính">
    ${mainItems.map(itemMarkup).join("")}
    <span class="nav-section-label">Tiện ích chung</span>
    ${toolItems.map(([tool, icon, label]) => `
      <button class="nav-item" type="button" data-action="navigate" data-view="tools" data-tool="${tool}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}" ${state.view === "tools" && state.toolView === tool ? 'aria-current="page"' : ""}>
        <i data-lucide="${icon}"></i><span>${label}</span>
      </button>
    `).join("")}
    <span class="nav-section-label">Tài khoản</span>
    ${accountItems.map(itemMarkup).join("")}
  </nav>`;
}

function renderCurrentView() {
  if (state.view === "chat") return renderChat();
  if (state.view === "tools") return renderTools();
  if (state.view === "couple") return renderCouple();
  if (state.view === "settings") return renderSettings();
  return renderToday();
}

function recentCheckinFor(uid, currentTime = Date.now()) {
  if (!uid) return null;
  const today = service.todayKey();
  const records = Object.entries(state.couple?.checkins || {})
    .map(([dateKey, members]) => ({ dateKey, ...(members?.[uid] || {}) }))
    .filter((record) => Number(record.updatedAt) > 0)
    .sort((first, second) => Number(second.updatedAt) - Number(first.updatedAt));
  const todayRecord = records.find((record) => record.dateKey === today);
  if (todayRecord) return todayRecord;
  return records.find((record) => currentTime - Number(record.updatedAt) < 86_400_000) || null;
}

function checkinMomentLabel(checkin) {
  if (!checkin) return "Chưa check-in";
  const today = service.todayKey();
  const prefix = checkin.dateKey === today
    ? "Hôm nay"
    : daysBetween(checkin.dateKey, today) === 1
      ? "Hôm qua"
      : formatDate(checkin.dateKey);
  return `${prefix} · ${formatTime(checkin.updatedAt)}`;
}

function checkinShareMarkup(member, checkin, mine = false) {
  const displayName = mine ? "Bạn" : member?.displayName || "Người ấy";
  const note = String(checkin?.note || "").trim();
  const emptyMessage = checkin
    ? mine
      ? "Bạn chưa viết lời nhắn trong lần check-in này."
      : `${displayName} chưa viết lời nhắn trong lần check-in này.`
    : mine
      ? "Bạn chưa gửi check-in trong 24 giờ qua."
      : `${displayName} chưa gửi check-in trong 24 giờ qua.`;
  return `
    <article class="checkin-share${mine ? " checkin-share--mine" : ""}" data-checkin-owner="${mine ? "mine" : "partner"}" data-checkin-date="${escapeHTML(checkin?.dateKey || "")}">
      <header class="checkin-share__head">
        <div class="checkin-share__person">
          ${avatarMarkup(member || { displayName }, "avatar--checkin")}
          <div>
            <strong>${escapeHTML(displayName)}</strong>
            <span>${escapeHTML(checkinMomentLabel(checkin))}</span>
          </div>
        </div>
        <i data-lucide="mail"></i>
      </header>
      <div class="checkin-share__signals">
        ${checkin?.mood ? `<span>${escapeHTML(checkin.mood)}</span>` : ""}
        ${checkin?.need ? `<span>${escapeHTML(checkin.need)}</span>` : ""}
      </div>
      <div class="checkin-share__message">
        <small>${mine ? "Lời bạn đã gửi" : `Một câu từ ${escapeHTML(displayName)}`}</small>
        <p data-checkin-note class="${note ? "" : "checkin-share__empty"}">${escapeHTML(note || emptyMessage)}</p>
      </div>
    </article>
  `;
}

function renderToday() {
  const me = myMember();
  const partner = partnerMember();
  const pulseBackground = safeBackgroundData(state.couple?.shared?.pulseBackground?.imageData);
  const today = state.couple?.checkins?.[service.todayKey()] || {};
  const mine = today[state.user.uid] || {};
  const theirs = partner ? today[partner.uid] || {} : {};
  const mineShared = recentCheckinFor(state.user.uid);
  const theirsShared = recentCheckinFor(partner?.uid);
  if (!state.checkinDraft.mood && mine.mood) state.checkinDraft.mood = mine.mood;
  if (!state.checkinDraft.need && mine.need) state.checkinDraft.need = mine.need;
  if (!state.checkinDraft.note && mine.note) state.checkinDraft.note = mine.note;

  return `
    <main class="view" id="main-content">
      <header class="page-head today-heading">
        <div>
          <p>${timeGreeting()}, ${escapeHTML(state.profile.displayName || "bạn")}</p>
          <h1>Hôm nay của hai đứa</h1>
          <span class="today-date">${escapeHTML(formatDate(service.todayKey(), { weekday: "long", day: "numeric", month: "long" }))}</span>
        </div>
        <span class="eyebrow">Ngày ${relationshipDays()}</span>
      </header>

      <div class="today-grid">
        <div>
          <section class="pair-pulse${pulseBackground ? " pair-pulse--custom" : ""}" aria-label="Nhịp đôi hôm nay"${pulseBackground ? ` style="background-image: url('${pulseBackground}')"` : ""}>
            <div class="pulse-background-actions">
              <input class="sr-only" id="pulse-background-file-input" type="file" accept="image/jpeg,image/png,image/webp" />
              <button class="pulse-background-button" type="button" data-action="choose-pulse-background" title="Đổi ảnh nền chung" aria-label="Đổi ảnh nền chung" ${state.busy ? "disabled" : ""}>
                <i data-lucide="camera"></i>
              </button>
              ${pulseBackground ? `
                <button class="pulse-background-button" type="button" data-action="remove-pulse-background" title="Dùng lại nền xanh" aria-label="Dùng lại nền xanh" ${state.busy ? "disabled" : ""}>
                  <i data-lucide="trash-2"></i>
                </button>
              ` : ""}
            </div>
            <div class="pulse-person">
              ${avatarMarkup(me)}
              <strong>${escapeHTML(me.displayName || "Bạn")}</strong>
              <span>${escapeHTML(mine.mood || "Chưa check-in")}</span>
            </div>
            <div class="pulse-center" id="pulse-center">
              <button class="pulse-center__heart" type="button" data-action="send-nudge" data-kind="heart" ${partner ? "" : "disabled"} aria-label="Gửi một nhịp tim">
                <i data-lucide="heart"></i>
              </button>
              <small>${partner ? "Chạm để gửi nhịp" : "Đang chờ kết nối"}</small>
            </div>
            <div class="pulse-person">
              ${avatarMarkup(partner || { displayName: "Người ấy" })}
              <strong>${escapeHTML(partner?.displayName || "Người ấy")}</strong>
              <span>${escapeHTML(theirs.mood || (partner ? "Chưa check-in" : "Chưa tham gia"))}</span>
            </div>
          </section>

          <section class="checkin-shares" aria-label="Lời nhắn check-in của hai bạn" aria-live="polite">
            ${checkinShareMarkup(me, mineShared, true)}
            ${checkinShareMarkup(partner, theirsShared)}
          </section>

          <section class="section-panel checkin-panel">
            <div class="section-panel__head">
              <h2>Check-in của bạn</h2>
              <span>Chia sẻ với người ấy</span>
            </div>
            <form class="checkin-form" data-form="checkin">
              <div class="field">
                <label>Hôm nay bạn thấy thế nào?</label>
                <div class="mood-row">
                  ${moods.map((mood) => `<button class="mood-option" type="button" data-action="choose-mood" data-value="${escapeHTML(mood)}" aria-pressed="${state.checkinDraft.mood === mood}">${escapeHTML(mood)}</button>`).join("")}
                </div>
              </div>
              <div class="field">
                <label>Bạn cần điều gì?</label>
                <div class="need-row">
                  ${needs.map((need) => `<button class="need-option" type="button" data-action="choose-need" data-value="${escapeHTML(need)}" aria-pressed="${state.checkinDraft.need === need}">${escapeHTML(need)}</button>`).join("")}
                </div>
              </div>
              <div class="field">
                <label for="checkin-note">Một câu cho người ấy</label>
                <textarea id="checkin-note" name="note" maxlength="240" placeholder="Ví dụ: Tối nay mình đi dạo nhé.">${escapeHTML(state.checkinDraft.note)}</textarea>
              </div>
              <button class="btn btn--primary" type="submit" ${state.busy ? "disabled" : ""}><i data-lucide="check"></i> Lưu check-in</button>
            </form>
          </section>
        </div>

        <aside class="aside-stack">
          ${partner ? "" : waitingMarkup()}
          <section class="section-panel">
            <div class="section-panel__head">
              <h2>Gửi nhanh</h2>
              <span>Không cần gõ</span>
            </div>
            <div class="nudge-row">
              <button class="nudge-button" type="button" data-action="send-nudge" data-kind="miss" ${partner ? "" : "disabled"}>Đang nhớ</button>
              <button class="nudge-button" type="button" data-action="send-nudge" data-kind="hug" ${partner ? "" : "disabled"}>Một cái ôm</button>
              <button class="nudge-button" type="button" data-action="send-nudge" data-kind="kiss" ${partner ? "" : "disabled"}>Một nụ hôn</button>
            </div>
          </section>
          <section class="section-panel">
            <div class="section-panel__head">
              <h2>Gần đây</h2>
              <span>${activeActivities().length} hoạt động</span>
            </div>
            ${recentActivityMarkup()}
          </section>
        </aside>
      </div>
    </main>
  `;
}

function waitingMarkup() {
  return `
    <div class="waiting-band">
      <strong>Không gian này chưa đủ hai người</strong>
      <span>Hủy liên kết trong mục Hai đứa rồi ghép lại bằng mã cá nhân hai chiều.</span>
    </div>
  `;
}

function activityEntries() {
  return Object.entries(state.couple?.activities || {})
    .map(([id, activity]) => ({ id, ...activity }))
    .filter((activity) => Number(activity.createdAt) > 0 && Number(activity.expiresAt) > 0);
}

function activeActivities(currentTime = Date.now()) {
  return activityEntries()
    .filter((activity) => Number(activity.expiresAt) > currentTime)
    .sort((first, second) => Number(second.createdAt) - Number(first.createdAt));
}

function activityIconName(type) {
  if (String(type).startsWith("nudge")) return "heart";
  if (type === "daily-answer") return "sticky-note";
  if (type === "date-idea") return "dices";
  if (type === "love-coupon" || type === "coupon-redeemed") return "ticket-check";
  if (type === "surprise") return "party-popper";
  return "sparkles";
}

function recentActivityMarkup() {
  const recent = activeActivities();
  if (!recent.length) return `<p class="activity-empty">Chưa có hoạt động nào trong 24 giờ qua.</p>`;
  return `<div class="activity-list">
    ${recent.map((activity) => `
      <div class="activity-item" data-activity-id="${escapeHTML(activity.id)}" data-created-at="${Number(activity.createdAt)}" data-expires-at="${Number(activity.expiresAt)}">
        <span class="activity-icon"><i data-lucide="${activityIconName(activity.type)}"></i></span>
        <div>
          <p>${escapeHTML(activity.actorId === state.user.uid ? "Bạn" : memberDisplayName(activity.actorId, activity.actorName || "Người ấy"))}</p>
          <small>${escapeHTML(activity.text || "Hoạt động mới")}</small>
        </div>
        <span class="activity-time">${formatTime(activity.createdAt)}</span>
      </div>
    `).join("")}
  </div>`;
}

function renderChat() {
  const partner = partnerMember();
  return `
    <main class="view view--chat" id="main-content">
      <section class="chat-layout" aria-label="Cuộc trò chuyện">
        <header class="chat-head">
          <div class="chat-head__person">
            ${avatarMarkup(partner || { displayName: "Người ấy" }, "avatar--chat")}
            <div>
              <h2>${escapeHTML(partner?.displayName || "Người ấy")}</h2>
              <p>${partner ? (partnerOnline() ? "Đang ở đây" : "Thông báo sẽ được gửi tới thiết bị") : "Chưa tham gia không gian"}</p>
            </div>
          </div>
          <span class="chat-head__mark"><i data-lucide="message-circle"></i></span>
        </header>
        <div class="message-list" id="message-list" aria-live="polite">
          ${messageListMarkup()}
        </div>
        <div class="composer-dock">
          ${chatPickerMarkup()}
          <form class="composer" data-form="message">
            <div class="composer-tools" aria-label="Thêm vào tin nhắn">
              <button class="icon-button ${state.chatPicker === "emoji" ? "is-active" : ""}" type="button" data-action="toggle-chat-picker" data-picker="emoji" aria-label="Mở thư viện biểu tượng" title="Biểu tượng" aria-expanded="${state.chatPicker === "emoji"}" aria-controls="chat-media-picker" ${partner ? "" : "disabled"}><i data-lucide="smile-plus"></i></button>
              <button class="icon-button ${state.chatPicker === "sticker" ? "is-active" : ""}" type="button" data-action="toggle-chat-picker" data-picker="sticker" aria-label="Mở thư viện sticker" title="Sticker" aria-expanded="${state.chatPicker === "sticker"}" aria-controls="chat-media-picker" ${partner ? "" : "disabled"}><i data-lucide="sticker"></i></button>
            </div>
            <label class="sr-only" for="message-input">Lời nhắn</label>
            <textarea id="message-input" name="message" maxlength="1000" rows="1" placeholder="Viết cho người ấy..." ${partner ? "" : "disabled"}>${escapeHTML(state.messageDraft)}</textarea>
            <button class="btn btn--primary" type="submit" aria-label="Gửi lời nhắn" title="Gửi lời nhắn" ${partner && !state.busy ? "" : "disabled"}><i data-lucide="send"></i></button>
          </form>
        </div>
      </section>
    </main>
  `;
}

function chatPickerMarkup() {
  if (!state.chatPicker) return "";
  const emojiActive = state.chatPicker === "emoji";
  return `
    <section class="chat-picker" id="chat-media-picker" aria-label="Thư viện biểu tượng và sticker">
      <div class="chat-picker__toolbar">
        <div class="chat-picker__tabs" role="tablist" aria-label="Loại nội dung">
          <button type="button" role="tab" data-action="select-chat-picker" data-picker="emoji" aria-selected="${emojiActive}"><i data-lucide="smile-plus"></i><span>Biểu tượng</span></button>
          <button type="button" role="tab" data-action="select-chat-picker" data-picker="sticker" aria-selected="${!emojiActive}"><i data-lucide="sticker"></i><span>Sticker</span></button>
        </div>
        <button class="icon-button" type="button" data-action="close-chat-picker" aria-label="Đóng thư viện" title="Đóng"><i data-lucide="x"></i></button>
      </div>
      <div class="chat-picker__body">
        ${emojiActive ? emojiLibraryMarkup() : stickerLibraryMarkup()}
      </div>
    </section>
  `;
}

function emojiLibraryMarkup() {
  const activeGroup = chatMedia.emojiGroups.find((group) => group.id === state.emojiGroup)
    || chatMedia.emojiGroups[0];
  return `<div class="emoji-library">
    <nav class="emoji-category-nav" role="tablist" aria-label="Nhóm biểu tượng">
      ${chatMedia.emojiGroups.map((group) => `
        <button type="button" role="tab" id="emoji-tab-${escapeHTML(group.id)}" data-action="select-emoji-group" data-group-id="${escapeHTML(group.id)}" aria-controls="emoji-group-panel" aria-selected="${group.id === activeGroup.id}" title="${escapeHTML(group.label)}">
          <span aria-hidden="true">${escapeHTML(group.icon || group.items[0])}</span>
          <span class="sr-only">${escapeHTML(group.label)}</span>
        </button>
      `).join("")}
    </nav>
    <section class="media-group" id="emoji-group-panel" role="tabpanel" aria-labelledby="emoji-tab-${escapeHTML(activeGroup.id)}">
        <h3>${escapeHTML(activeGroup.label)}</h3>
        <div class="emoji-grid">
          ${activeGroup.items.map((emoji) => `
            <button class="emoji-button" type="button" data-action="insert-emoji" data-emoji="${escapeHTML(emoji)}" aria-label="Chèn ${escapeHTML(emoji)}" title="${escapeHTML(emoji)}">${escapeHTML(emoji)}</button>
          `).join("")}
        </div>
      </section>
  </div>`;
}

function stickerLibraryMarkup() {
  return `<div class="sticker-library">
    ${chatMedia.stickerPacks.map((pack) => `
      <section class="media-group" aria-labelledby="sticker-pack-${escapeHTML(pack.id)}">
        <h3 id="sticker-pack-${escapeHTML(pack.id)}">${escapeHTML(pack.label)}</h3>
        <div class="sticker-grid">
          ${pack.items.map((sticker) => `
            <button class="sticker-button" type="button" data-action="send-sticker" data-sticker-id="${escapeHTML(sticker.id)}" aria-label="Gửi sticker ${escapeHTML(sticker.label)}" title="${escapeHTML(sticker.label)}">
              ${stickerArtMarkup(sticker)}
            </button>
          `).join("")}
        </div>
      </section>
    `).join("")}
  </div>`;
}

function stickerArtMarkup(sticker) {
  return `
    <span class="sticker-art sticker-art--${stickerTone(sticker.tone)}" role="img" aria-label="${escapeHTML(sticker.label)}">
      <span class="sticker-art__symbol" aria-hidden="true">${escapeHTML(sticker.symbol)}</span>
      <strong>${escapeHTML(sticker.label)}</strong>
    </span>
  `;
}

function chatMessages() {
  return state.messages.filter((message) => !["activity", "nudge"].includes(message.kind));
}

function messageListMarkup() {
  const messages = chatMessages();
  if (!messages.length) {
    return `<div class="message-empty"><i data-lucide="sparkles"></i><p>Chưa có lời nhắn. Bắt đầu bằng một câu thật tự nhiên.</p></div>`;
  }
  return messages
    .map((message) => {
      const mine = message.senderId === state.user.uid;
      const senderName = memberDisplayName(message.senderId, message.senderName || "Người ấy");
      const sticker = message.kind === "sticker" ? stickerForId(message.stickerId) : null;
      if (sticker) {
        return `
          <div class="message-sticker ${mine ? "message-sticker--mine" : ""}">
            ${stickerArtMarkup(sticker)}
            <small>${mine ? "Bạn" : escapeHTML(senderName)} · ${formatTime(message.createdAt)}</small>
          </div>
        `;
      }
      if (message.kind === "nudge") {
        return `<div class="message-bubble message-bubble--nudge">${escapeHTML(mine ? `Bạn: ${message.text}` : `${senderName}: ${message.text}`)}</div>`;
      }
      return `
        <div class="message-bubble ${mine ? "message-bubble--mine" : ""}">
          <p>${escapeHTML(message.text)}</p>
          <small>${mine ? "Bạn" : escapeHTML(senderName)} · ${formatTime(message.createdAt)}</small>
        </div>
      `;
    })
    .join("");
}

function renderTools() {
  const activeTool = toolItems.find(([tool]) => tool === state.toolView) || toolItems[0];
  return `
    <main class="view tools-view" id="main-content">
      <header class="page-head tools-heading">
        <div><p>Những điều hai bạn cùng chăm sóc</p><h1 class="page-title">${escapeHTML(activeTool[2])}</h1></div>
        <span class="eyebrow">Đồng bộ cho hai người</span>
      </header>
      <div class="tool-tabs" role="tablist" aria-label="Chọn tiện ích">
        ${toolItems.map(([tool, icon, label]) => `
          <button type="button" role="tab" data-action="select-tool" data-tool="${tool}" aria-selected="${state.toolView === tool}">
            <i data-lucide="${icon}"></i><span>${label}</span>
          </button>
        `).join("")}
      </div>
      <div class="tool-content">
        ${renderActiveTool()}
      </div>
    </main>
  `;
}

function renderActiveTool() {
  if (state.toolView === "love") return renderLoveTool();
  if (state.toolView === "vault") return renderVaultTool();
  if (state.toolView === "cycle") return renderCycleTool();
  if (state.toolView === "calendar") return renderCalendarTool();
  return renderRelationshipTool();
}

function renderRelationshipTool() {
  const startDate = relationshipStartDate();
  const elapsed = relationshipElapsed(startDate);
  const milestones = relationshipMilestones(startDate);
  const usingLegacy = !state.couple?.shared?.relationship && dateFromKey(localStorage.getItem("heartsync_anniversary"));
  return `
    <section class="relationship-layout" aria-labelledby="relationship-counter-title">
      <div class="relationship-counter">
        <div>
          <p class="eyebrow">Bắt đầu từ ${escapeHTML(formatDate(startDate))}</p>
          <h2 id="relationship-counter-title">Hai bạn đã bên nhau</h2>
        </div>
        <div class="relationship-counter__number">
          <strong id="relationship-day-number">${elapsed.dayNumber}</strong>
          <span>ngày</span>
        </div>
        <div class="relationship-clock" id="relationship-clock" aria-label="Thời gian bên nhau">
          ${String(elapsed.hours).padStart(2, "0")}:${String(elapsed.minutes).padStart(2, "0")}:${String(elapsed.seconds).padStart(2, "0")}
        </div>
      </div>

      <div class="relationship-side">
        ${usingLegacy ? `
          <div class="legacy-notice">
            <i data-lucide="archive"></i>
            <div><strong>Đã tìm thấy ngày từ bản cũ</strong><span>Bấm Lưu để đồng bộ ngày này cho cả hai tài khoản.</span></div>
          </div>
        ` : ""}
        <section class="section-panel">
          <div class="section-panel__head"><h2>Ngày bắt đầu yêu</h2><i data-lucide="calendar-days"></i></div>
          <form class="inline-date-form" data-form="relationship-date">
            <div class="field">
              <label for="relationship-date">Ngày của hai bạn</label>
              <input id="relationship-date" name="startDate" type="date" value="${escapeHTML(startDate)}" max="${localDateKey()}" required />
            </div>
            <button class="btn btn--primary" type="submit" ${state.busy ? "disabled" : ""}><i data-lucide="save"></i> Lưu ngày</button>
          </form>
        </section>
      </div>

      <section class="section-panel relationship-milestones">
        <div class="section-panel__head"><h2>Cột mốc tiếp theo</h2><i data-lucide="gift"></i></div>
        <div class="milestone-list">
          ${milestones.map((milestone, index) => `
            <div class="milestone-row ${index === 0 ? "milestone-row--next" : ""}">
              <span>${milestone.day} ngày</span>
              <strong>${escapeHTML(formatDate(milestone.date))}</strong>
            </div>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function updateRelationshipClock() {
  const clock = document.getElementById("relationship-clock");
  const dayNumber = document.getElementById("relationship-day-number");
  if (!clock || !dayNumber) return;
  const elapsed = relationshipElapsed(relationshipStartDate());
  dayNumber.textContent = String(elapsed.dayNumber);
  clock.textContent = `${String(elapsed.hours).padStart(2, "0")}:${String(elapsed.minutes).padStart(2, "0")}:${String(elapsed.seconds).padStart(2, "0")}`;
}

function renderVaultTool() {
  const vault = vaultData();
  const clothing = clothingRecommendation({
    gender: vault.bodyGender,
    height: vault.height,
    weight: vault.weight,
  });
  const shoes = shoeRecommendation({
    gender: vault.bodyGender,
    footLength: vault.footLength,
  });
  const hasLegacy = !state.couple?.shared?.vault && Array.isArray(readLegacyJSON("heartsync_vault"));
  return `
    <form class="vault-form" data-form="vault">
      ${hasLegacy ? `
        <div class="legacy-notice vault-form__notice">
          <i data-lucide="archive"></i>
          <div><strong>Đã đọc dữ liệu Kho từ bản cũ</strong><span>Kiểm tra lại rồi bấm Lưu kho chung để đồng bộ cho người ấy.</span></div>
        </div>
      ` : ""}

      <section class="section-panel vault-section">
        <div class="section-panel__head"><h2>Món ăn và đồ uống</h2><i data-lucide="utensils"></i></div>
        <div class="vault-fields-two">
          <div class="field">
            <label for="vault-foods">Món ăn yêu thích</label>
            <textarea id="vault-foods" name="favoriteFoods" maxlength="600" placeholder="Ví dụ: bún chả, sushi, lẩu Thái">${escapeHTML(vault.favoriteFoods)}</textarea>
          </div>
          <div class="field">
            <label for="vault-drinks">Đồ uống yêu thích</label>
            <textarea id="vault-drinks" name="favoriteDrinks" maxlength="600" placeholder="Ví dụ: trà đào ít đường">${escapeHTML(vault.favoriteDrinks)}</textarea>
          </div>
        </div>
      </section>

      <section class="section-panel vault-section vault-section--compact">
        <div class="section-panel__head"><h2>Loài hoa yêu thích</h2><i data-lucide="flower-2"></i></div>
        <div class="field">
          <label for="vault-flowers">Có thể ghi nhiều loài hoa</label>
          <input id="vault-flowers" name="favoriteFlowers" maxlength="300" value="${escapeHTML(vault.favoriteFlowers)}" placeholder="Hoa linh lan, tulip trắng..." />
        </div>
      </section>

      <section class="section-panel vault-section">
        <div class="section-panel__head"><h2>Size và chỉ số cơ thể</h2><i data-lucide="ruler"></i></div>
        <fieldset class="size-gender-control">
          <legend>Chọn bảng size</legend>
          <div>
            <label>
              <input class="sr-only" type="radio" name="bodyGender" value="female" ${vault.bodyGender === "female" ? "checked" : ""} />
              <span>Nữ</span>
            </label>
            <label>
              <input class="sr-only" type="radio" name="bodyGender" value="male" ${vault.bodyGender === "male" ? "checked" : ""} />
              <span>Nam</span>
            </label>
          </div>
        </fieldset>
        <div class="measurement-layout">
          <div>
            <div class="measurement-grid">
              ${[
                ["height", "Chiều cao", vault.height, "cm", 100, 230],
                ["weight", "Cân nặng", vault.weight, "kg", 20, 250],
                ["chest", "Vòng ngực", vault.chest, "cm", 30, 250],
                ["waist", "Vòng eo", vault.waist, "cm", 30, 250],
              ].map(([name, label, value, unit, minimum, maximum]) => `
                <div class="field measurement-field">
                  <label for="vault-${name}">${label}</label>
                  <div><input id="vault-${name}" name="${name}" type="number" inputmode="decimal" min="${minimum}" max="${maximum}" step="0.1" value="${escapeHTML(value)}" /><span>${unit}</span></div>
                </div>
              `).join("")}
            </div>
            <p class="size-method-note">Vòng ngực và vòng eo được lưu để đối chiếu khi mua hàng; size áo dùng bảng chiều cao và cân nặng.</p>
          </div>
          <div class="size-result" aria-live="polite">
            <span id="vault-size-label">Size áo ${escapeHTML(clothing.genderLabel)}</span>
            <strong id="vault-size-result">${escapeHTML(clothing.size)}</strong>
            <small id="vault-size-detail">${escapeHTML(clothingResultDetail(clothing))}</small>
          </div>
        </div>

        <div class="shoe-guide">
          <div class="shoe-guide__head">
            <div><h3>Size giày</h3><span>VN · US · UK</span></div>
            <i data-lucide="ruler"></i>
          </div>
          <div class="shoe-guide__layout">
            <div class="field measurement-field shoe-length-field">
              <label for="vault-foot-length">Chiều dài chân</label>
              <div><input id="vault-foot-length" name="footLength" type="number" inputmode="decimal" min="18" max="36" step="0.1" value="${escapeHTML(vault.footLength)}" /><span>cm</span></div>
            </div>
            <div class="shoe-size-results" aria-live="polite">
              ${[
                ["vn", "VN", shoes.vn],
                ["us", "US", shoes.us],
                ["uk", "UK", shoes.uk],
              ].map(([key, label, value]) => `
                <div><span>${label}</span><strong id="vault-shoe-${key}">${escapeHTML(value)}</strong></div>
              `).join("")}
            </div>
          </div>
          <p class="shoe-size-detail" id="vault-shoe-detail">${escapeHTML(shoeResultDetail(shoes))}</p>
        </div>
      </section>

      <section class="section-panel vault-section">
        <div class="section-panel__head"><h2>Điều cần ghi nhớ</h2><i data-lucide="sticky-note"></i></div>
        <div class="field">
          <label for="vault-notes">Điều người ấy không thích, dị ứng hoặc cần được quan tâm</label>
          <textarea id="vault-notes" name="notes" maxlength="1200" placeholder="Ghi lại những điều nhỏ nhưng quan trọng...">${escapeHTML(vault.notes)}</textarea>
        </div>
      </section>

      <div class="form-actions">
        <span>Chỉ hai tài khoản đã liên kết mới đọc được kho này.</span>
        <button class="btn btn--primary" type="submit" ${state.busy ? "disabled" : ""}><i data-lucide="save"></i> Lưu kho chung</button>
      </div>
    </form>
  `;
}

function updateVaultSizeResults(form) {
  if (!form) return;
  const data = new FormData(form);
  const gender = normalizeGender(data.get("bodyGender"));
  const clothing = clothingRecommendation({
    gender,
    height: data.get("height"),
    weight: data.get("weight"),
  });
  const shoes = shoeRecommendation({ gender, footLength: data.get("footLength") });
  const clothingLabel = document.getElementById("vault-size-label");
  const clothingValue = document.getElementById("vault-size-result");
  const clothingDetail = document.getElementById("vault-size-detail");
  if (clothingLabel) clothingLabel.textContent = `Size áo ${clothing.genderLabel}`;
  if (clothingValue) clothingValue.textContent = clothing.size;
  if (clothingDetail) clothingDetail.textContent = clothingResultDetail(clothing);
  for (const key of ["vn", "us", "uk"]) {
    const output = document.getElementById(`vault-shoe-${key}`);
    if (output) output.textContent = shoes[key];
  }
  const shoeDetail = document.getElementById("vault-shoe-detail");
  if (shoeDetail) shoeDetail.textContent = shoeResultDetail(shoes);
}

function renderCycleTool() {
  const cycle = cycleData();
  const summary = cycleSummary();
  const { year, month } = state.cycleCursor;
  const cells = monthCells(year, month);
  const today = localDateKey();
  const progress = summary.position ? Math.round((summary.position / summary.length) * 360) : 0;
  const daysUntilNext = summary.nextPeriod ? daysBetween(today, summary.nextPeriod) : null;
  const prediction = summary.nextPeriod
    ? daysUntilNext === 0
      ? "Dự kiến hôm nay"
      : `${Math.max(0, daysUntilNext)} ngày nữa`
    : "Cần đánh dấu kỳ kinh đầu tiên";

  const calendarMarkup = cells.map((date) => {
    if (!date) return `<span class="calendar-day calendar-day--empty" aria-hidden="true"></span>`;
    const recorded = cycle.periodDays.includes(date);
    let position = 0;
    if (summary.latestStart) {
      const offset = daysBetween(summary.latestStart, date);
      position = ((offset % summary.length) + summary.length) % summary.length + 1;
    }
    const classes = ["calendar-day", "cycle-day"];
    if (date === today) classes.push("is-today");
    if (recorded) classes.push("is-recorded");
    else if (position === 14) classes.push("is-ovulation");
    else if (position >= 10 && position <= 18) classes.push("is-fertile");
    else if (position >= 1 && position <= 5) classes.push("is-predicted-period");
    const day = Number(date.slice(-2));
    return `
      <button class="${classes.join(" ")}" type="button" data-action="toggle-period-day" data-date="${date}" aria-pressed="${recorded}" aria-label="${recorded ? "Bỏ" : "Đánh dấu"} ngày kinh ${escapeHTML(formatDate(date))}">
        <span>${day}</span>
      </button>`;
  }).join("");

  return `
    <div class="cycle-layout">
      <section class="cycle-summary">
        <div class="cycle-ring" style="--cycle-progress: ${progress}deg">
          <div>
            <strong>${summary.position || "–"}</strong>
            <span>ngày trong chu kỳ</span>
          </div>
        </div>
        <div class="cycle-summary__copy">
          <p class="eyebrow">${escapeHTML(summary.phase.label)}</p>
          <h2>${escapeHTML(prediction)}</h2>
          <span>${summary.nextPeriod ? `Ngày dự kiến: ${escapeHTML(formatDate(summary.nextPeriod))}` : "Chạm vào các ngày trên lịch để bắt đầu."}</span>
        </div>
        <div class="cycle-stat">
          <span>Độ dài ước tính</span>
          <strong>${summary.length} ngày</strong>
        </div>
      </section>

      <section class="section-panel cycle-calendar-panel">
        <div class="calendar-toolbar">
          <button class="icon-button" type="button" data-action="change-cycle-month" data-delta="-1" title="Tháng trước" aria-label="Tháng trước"><i data-lucide="chevron-left"></i></button>
          <div><span>Theo dõi chu kỳ</span><h2>${escapeHTML(monthLabel(year, month))}</h2></div>
          <button class="icon-button" type="button" data-action="change-cycle-month" data-delta="1" title="Tháng sau" aria-label="Tháng sau"><i data-lucide="chevron-right"></i></button>
        </div>
        <div class="calendar-weekdays" aria-hidden="true"><span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span></div>
        <div class="calendar-grid">${calendarMarkup}</div>
        <div class="cycle-legend" aria-label="Chú giải chu kỳ">
          <span><i class="legend-dot legend-dot--recorded"></i>Đã ghi nhận</span>
          <span><i class="legend-dot legend-dot--predicted"></i>Kỳ kinh dự kiến</span>
          <span><i class="legend-dot legend-dot--fertile"></i>Dễ thụ thai ước tính</span>
          <span><i class="legend-dot legend-dot--ovulation"></i>Rụng trứng ước tính</span>
        </div>
      </section>

      <aside class="cycle-side">
        <section class="section-panel">
          <div class="section-panel__head"><h2>Thiết lập</h2><i data-lucide="calculator"></i></div>
          <form class="form-stack" data-form="cycle-settings">
            <div class="field">
              <label for="cycle-length">Độ dài chu kỳ mặc định</label>
              <input id="cycle-length" name="length" type="number" inputmode="numeric" min="15" max="60" value="${cycle.length}" required />
            </div>
            <button class="btn btn--secondary" type="submit" ${state.busy ? "disabled" : ""}><i data-lucide="save"></i> Lưu thiết lập</button>
          </form>
        </section>
        <div class="health-note">
          <i data-lucide="shield-check"></i>
          <p><strong>Chỉ là dự báo tham khảo.</strong> Không dùng kết quả này để tránh thai, chẩn đoán hoặc thay thế tư vấn y tế.</p>
        </div>
      </aside>
    </div>
  `;
}

function renderCalendarTool() {
  const { year, month } = state.calendarCursor;
  const events = calendarEvents();
  const eventsByDate = events.reduce((result, event) => {
    (result[event.date] ||= []).push(event);
    return result;
  }, {});
  const startDate = relationshipStartDate();
  const anniversary = dateFromKey(startDate);
  const today = localDateKey();
  const members = Object.fromEntries(memberEntries().map((member) => [member.uid, member.displayName]));
  const cells = monthCells(year, month);

  const calendarMarkup = cells.map((date) => {
    if (!date) return `<span class="calendar-day calendar-day--empty" aria-hidden="true"></span>`;
    const dateValue = dateFromKey(date);
    const dateEvents = eventsByDate[date] || [];
    const isAnniversary = anniversary && date >= startDate && dateValue.getMonth() === anniversary.getMonth() && dateValue.getDate() === anniversary.getDate();
    const classes = ["calendar-day", "event-day"];
    if (date === today) classes.push("is-today");
    if (date === state.selectedEventDate) classes.push("is-selected");
    if (dateEvents.length) classes.push("has-events");
    if (isAnniversary) classes.push("has-anniversary");
    return `
      <button class="${classes.join(" ")}" type="button" data-action="select-calendar-day" data-date="${date}" aria-label="${escapeHTML(formatDate(date))}${dateEvents.length ? `, ${dateEvents.length} sự kiện` : ""}">
        <span>${Number(date.slice(-2))}</span>
        <i class="event-markers" aria-hidden="true">${dateEvents.length ? "<b></b>" : ""}${isAnniversary ? "<b></b>" : ""}</i>
      </button>`;
  }).join("");

  const upcoming = events.filter((event) => event.date >= today).slice(0, 8);
  const visibleEvents = upcoming.length ? upcoming : events.slice(-6).reverse();
  return `
    <div class="events-layout">
      <section class="section-panel event-calendar-panel">
        <div class="calendar-toolbar">
          <button class="icon-button" type="button" data-action="change-event-month" data-delta="-1" title="Tháng trước" aria-label="Tháng trước"><i data-lucide="chevron-left"></i></button>
          <div><span>Lịch chung</span><h2>${escapeHTML(monthLabel(year, month))}</h2></div>
          <button class="icon-button" type="button" data-action="change-event-month" data-delta="1" title="Tháng sau" aria-label="Tháng sau"><i data-lucide="chevron-right"></i></button>
        </div>
        <div class="calendar-weekdays" aria-hidden="true"><span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span></div>
        <div class="calendar-grid">${calendarMarkup}</div>
        <div class="calendar-caption"><span><i></i>Sự kiện</span><span><i></i>Ngày kỷ niệm</span></div>
      </section>

      <aside class="event-form-panel section-panel">
        <div class="section-panel__head"><h2>Thêm sự kiện</h2><i data-lucide="plus"></i></div>
        <form class="form-stack" data-form="calendar-event">
          <div class="field">
            <label for="event-title">Tên sự kiện</label>
            <input id="event-title" name="title" maxlength="100" placeholder="Ví dụ: Hẹn ăn tối" required />
          </div>
          <div class="field">
            <label for="event-date">Ngày</label>
            <input id="event-date" name="date" type="date" value="${escapeHTML(state.selectedEventDate)}" required />
          </div>
          <div class="field">
            <label for="event-note">Ghi chú</label>
            <textarea id="event-note" name="note" maxlength="500" placeholder="Địa điểm, việc cần chuẩn bị..."></textarea>
          </div>
          <button class="btn btn--primary" type="submit" ${state.busy ? "disabled" : ""}><i data-lucide="calendar-days"></i> Thêm vào lịch chung</button>
        </form>
      </aside>

      <section class="section-panel event-list-panel">
        <div class="section-panel__head"><h2>${upcoming.length ? "Sắp tới" : "Sự kiện đã lưu"}</h2><span>${events.length} sự kiện</span></div>
        ${visibleEvents.length ? `
          <div class="event-list">
            ${visibleEvents.map((event) => `
              <article class="event-row">
                <time datetime="${event.date}"><strong>${Number(event.date.slice(-2))}</strong><span>Th${Number(event.date.slice(5, 7))}</span></time>
                <div class="event-row__copy">
                  <strong>${escapeHTML(event.title)}</strong>
                  <span>${escapeHTML(formatDate(event.date, { weekday: "short" }))}${event.note ? ` · ${escapeHTML(event.note)}` : ""}</span>
                  <small>Thêm bởi ${escapeHTML(members[event.createdBy] || "thành viên")}</small>
                </div>
                <button class="icon-button icon-button--danger" type="button" data-action="delete-calendar-event" data-event-id="${escapeHTML(event.id)}" title="Xóa sự kiện" aria-label="Xóa ${escapeHTML(event.title)}"><i data-lucide="trash-2"></i></button>
              </article>
            `).join("")}
          </div>
        ` : `<div class="empty-state"><i data-lucide="calendar-days"></i><p>Chưa có sự kiện chung. Chọn một ngày để thêm lịch hẹn đầu tiên.</p></div>`}
      </section>
    </div>
  `;
}

function futureMailboxMarkup(partner, memberNames) {
  const letters = futureLetters();
  const currentTime = Date.now();
  return `
    <section class="section-panel future-mailbox-panel">
      <div class="section-panel__head">
        <div><p class="eyebrow">Gửi đến một ngày khác</p><h2>Hộp thư tương lai</h2></div>
        <span>${letters.length} lá thư</span>
      </div>
      <div class="future-mailbox-layout">
        <form class="future-letter-form" data-form="future-letter">
          <div class="field">
            <label for="future-letter-title">Tên lá thư</label>
            <input id="future-letter-title" name="title" maxlength="80" placeholder="Ví dụ: Mở khi mình tròn 500 ngày" required />
          </div>
          <div class="field">
            <label for="future-letter-date">Ngày được mở</label>
            <input id="future-letter-date" name="openDate" type="date" min="${escapeHTML(tomorrowDateKey())}" required />
          </div>
          <div class="field future-letter-form__body">
            <label for="future-letter-body">Điều bạn muốn gửi lại</label>
            <textarea id="future-letter-body" name="body" maxlength="4000" placeholder="Viết cho người ấy của một ngày trong tương lai..." required></textarea>
          </div>
          <button class="btn btn--primary" type="submit" ${partner && !state.busy ? "" : "disabled"}><i data-lucide="book-heart"></i> Niêm phong lá thư</button>
          <small>Nội dung được cất riêng trên máy chủ; người nhận chỉ mở được đúng ngày.</small>
        </form>

        <div class="future-letter-list" aria-live="polite">
          ${letters.map((letter) => {
            const isCreator = letter.createdBy === state.user.uid;
            const unlocked = currentTime >= Number(letter.opensAt);
            const body = state.openedLetters[letter.id];
            const daysLeft = Math.max(0, daysBetween(service.todayKey(), letter.openDate));
            const status = Number(letter.openedAt)
              ? `Đã mở bởi ${escapeHTML(memberNames[letter.openedBy] || "một người")}`
              : unlocked
                ? "Đã đến ngày mở"
                : isCreator
                  ? `Đã hẹn cho ${escapeHTML(formatDate(letter.openDate))}`
                  : `Còn ${daysLeft} ngày nữa`;
            return `
              <article class="future-letter ${unlocked ? "is-unlocked" : "is-locked"}" data-letter-id="${escapeHTML(letter.id)}">
                <span class="future-letter__seal"><i data-lucide="${unlocked ? "mail" : "lock-keyhole"}"></i></span>
                <div class="future-letter__copy">
                  <strong>${escapeHTML(letter.title)}</strong>
                  <span>${isCreator ? `Gửi đến ${escapeHTML(memberNames[letter.recipientUid] || "người ấy")}` : `Từ ${escapeHTML(memberNames[letter.createdBy] || "người ấy")}`} · ${status}</span>
                  ${body ? `<div class="future-letter__body"><p>${escapeHTML(body)}</p><small>${isCreator && !unlocked ? "Bản xem lại của người viết" : "Lá thư đã được mở"}</small></div>` : ""}
                </div>
                <div class="future-letter__actions">
                  ${(isCreator || unlocked) ? `<button class="btn btn--quiet" type="button" data-action="open-future-letter" data-letter-id="${escapeHTML(letter.id)}">${body ? "Thu lại" : isCreator && !unlocked ? "Xem lại" : "Mở thư"}</button>` : `<span class="future-letter__countdown">${daysLeft} ngày</span>`}
                  ${isCreator && !Number(letter.openedAt) ? `<button class="icon-button icon-button--danger" type="button" data-action="delete-future-letter" data-letter-id="${escapeHTML(letter.id)}" title="Xóa thư đã hẹn" aria-label="Xóa ${escapeHTML(letter.title)}"><i data-lucide="trash-2"></i></button>` : ""}
                </div>
              </article>
            `;
          }).join("") || `<div class="empty-state future-letter-empty"><i data-lucide="mail"></i><p>Chưa có lá thư nào được hẹn. Hãy gửi điều đầu tiên đến tương lai của hai đứa.</p></div>`}
        </div>
      </div>
    </section>
  `;
}

function bondGardenMarkup() {
  const growth = growthStage();
  return `
    <section class="section-panel bond-garden-panel">
      <div class="section-panel__head"><div><p class="eyebrow">Cùng chăm mỗi ngày</p><h2>Mầm yêu chung</h2></div><span>${growth.days} ngày tương tác</span></div>
      <div class="bond-garden__visual" data-growth-level="${growth.level}">
        <div class="bond-garden__plant" aria-hidden="true">
          <i class="bond-garden__sprout" data-lucide="sprout"></i>
          <i class="bond-garden__flower" data-lucide="flower-2"></i>
        </div>
        <div class="bond-garden__copy">
          <span>Giai đoạn ${growth.level + 1}</span>
          <strong>${escapeHTML(growth.name)}</strong>
          <p>${escapeHTML(growth.note)}</p>
        </div>
      </div>
      <div class="bond-progress" role="progressbar" aria-label="Tiến độ mầm yêu" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${growth.progress}"><span style="width: ${growth.progress}%"></span></div>
      <p class="bond-garden__next">${growth.next ? `Thêm ${growth.remaining} ngày có tin nhắn, check-in hoặc tương tác để sang giai đoạn mới.` : "Mầm yêu đã đạt giai đoạn cao nhất và sẽ tiếp tục ghi lại từng ngày hai bạn ở đây."}</p>
    </section>
  `;
}

function achievementsMarkup() {
  const days = relationshipElapsed(relationshipStartDate()).dayNumber;
  const messages = totalMessageCount();
  const firstTrip = firstTripAchievement();
  const achievements = [
    {
      icon: "heart",
      title: "100 ngày bên nhau",
      unlocked: days >= 100,
      progress: Math.min(100, days),
      detail: days >= 100 ? `Đã đi cùng nhau ${days} ngày` : `${days}/100 ngày`,
    },
    {
      icon: "award",
      title: "Chuyến đi đầu tiên",
      unlocked: Boolean(firstTrip?.date),
      progress: firstTrip?.date ? 100 : 0,
      detail: firstTrip?.date ? formatDate(firstTrip.date) : "Chờ hai bạn ghi nhận",
      manual: true,
    },
    {
      icon: "message-circle",
      title: "1.000 tin nhắn",
      unlocked: messages >= 1000,
      progress: Math.min(100, Math.round((messages / 1000) * 100)),
      detail: messages >= 1000 ? `${messages.toLocaleString("vi-VN")} lời nhắn đã gửi` : `${messages.toLocaleString("vi-VN")}/1.000 tin nhắn`,
    },
  ];
  return `
    <section class="section-panel achievements-panel">
      <div class="section-panel__head"><div><p class="eyebrow">Chỉ hai đứa nhìn thấy</p><h2>Bảng thành tựu</h2></div><i data-lucide="trophy"></i></div>
      <div class="achievement-list">
        ${achievements.map((item) => `
          <article class="achievement-item ${item.unlocked ? "is-unlocked" : ""}">
            <span class="achievement-item__icon"><i data-lucide="${item.icon}"></i></span>
            <div class="achievement-item__copy"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.detail)}</span><div class="achievement-progress"><i style="width: ${item.progress}%"></i></div></div>
            <span class="achievement-item__state"><i data-lucide="${item.unlocked ? "check" : "lock-keyhole"}"></i></span>
            ${item.manual && !item.unlocked ? `
              <form class="first-trip-form" data-form="first-trip">
                <label class="sr-only" for="first-trip-date">Ngày chuyến đi đầu tiên</label>
                <input id="first-trip-date" name="date" type="date" max="${escapeHTML(service.todayKey())}" required />
                <button class="btn btn--quiet" type="submit" ${state.busy ? "disabled" : ""}>Ghi nhận</button>
              </form>
            ` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderLoveTool() {
  const partner = partnerMember();
  const today = service.todayKey();
  const encouragement = dailyEncouragement();
  const encouragementError = state.encouragementRequest.error;
  const answers = state.couple?.shared?.dailyQuestions?.[today] || {};
  const myAnswer = answers[state.user.uid] || null;
  const partnerAnswer = partner ? answers[partner.uid] || null : null;
  const answeredCount = [myAnswer, partnerAnswer].filter(Boolean).length;
  const ideas = dateIdeas();
  const currentDraw = state.couple?.shared?.dateDraw || null;
  const drawnIdea = ideas.find((idea) => idea.id === currentDraw?.ideaId) || null;
  const coupons = loveCoupons();
  const availableForMe = coupons.filter(
    (coupon) => coupon.assignedTo === state.user.uid && coupon.status === "available",
  ).length;
  const memberNames = Object.fromEntries(
    memberEntries().map((member) => [member.uid, member.displayName || "Thành viên"]),
  );

  return `
    <div class="love-layout">
      <section class="daily-encouragement-panel" data-daily-encouragement data-date="${encouragement ? escapeHTML(encouragement.date) : ""}" aria-live="polite">
        <header class="daily-encouragement__head">
          <div>
            <p class="eyebrow"><i data-lucide="sunrise"></i> Mỗi ngày một câu</p>
            <h2>Khởi đầu ngày mới</h2>
          </div>
          <time datetime="${escapeHTML(today)}">${escapeHTML(dailyEncouragementDateLabel(today))}</time>
        </header>
        ${encouragement ? `
          <div class="daily-encouragement__quote">
            <span class="daily-encouragement__mark"><i data-lucide="quote"></i></span>
            <blockquote>${escapeHTML(encouragement.text)}</blockquote>
          </div>
          <footer class="daily-encouragement__foot">
            <span><i data-lucide="users-round"></i> Lời nhắc chung của hai đứa</span>
            <span><i data-lucide="sunrise"></i> Ngày mai gặp một câu mới</span>
          </footer>
        ` : encouragementError ? `
          <div class="daily-encouragement__status daily-encouragement__status--error">
            <div><strong>Chưa thể lấy lời nhắn hôm nay.</strong><span>${escapeHTML(encouragementError)}</span></div>
            <button class="icon-button" type="button" data-action="retry-daily-encouragement" aria-label="Thử lại lời nhắn hôm nay" title="Thử lại"><i data-lucide="refresh-cw"></i></button>
          </div>
        ` : `
          <div class="daily-encouragement__status" role="status">
            <i class="is-spinning" data-lucide="refresh-cw"></i>
            <span>Đang chọn một lời nhắn cho hôm nay...</span>
          </div>
        `}
      </section>

      ${bondGardenMarkup()}
      ${achievementsMarkup()}

      <section class="love-signal">
        <div>
          <p class="eyebrow">Một chạm nhỏ</p>
          <h2>Gửi chút dễ thương đến người ấy.</h2>
          <span>Mỗi lần chạm sẽ chọn một lời nhắn bất ngờ và gửi kèm thông báo.</span>
        </div>
        <button class="btn love-signal__button" type="button" data-action="send-surprise" ${partner && !state.busy ? "" : "disabled"}>
          <i data-lucide="party-popper"></i> Gửi bất ngờ
        </button>
      </section>

      ${futureMailboxMarkup(partner, memberNames)}

      <section class="section-panel daily-question-panel">
        <div class="section-panel__head">
          <div><p class="eyebrow">Câu hỏi hôm nay</p><h2>Chỉ mở khi bạn đã trả lời</h2></div>
          <span>${answeredCount}/2 câu trả lời</span>
        </div>
        <blockquote>${escapeHTML(questionOfDay())}</blockquote>
        ${myAnswer ? `
          <div class="daily-answer-grid">
            <article class="daily-answer">
              <span>Câu trả lời của bạn</span>
              <p>${escapeHTML(myAnswer.text)}</p>
            </article>
            <article class="daily-answer ${partnerAnswer ? "daily-answer--partner" : "daily-answer--locked"}">
              <span>${escapeHTML(partner?.displayName || "Người ấy")}</span>
              ${partnerAnswer
                ? `<p>${escapeHTML(partnerAnswer.text)}</p>`
                : `<div><i data-lucide="lock-keyhole"></i><p>Đang chờ người ấy trả lời.</p></div>`}
            </article>
          </div>
        ` : `
          ${partnerAnswer ? `<div class="answer-ready"><i data-lucide="sparkles"></i> Người ấy đã trả lời. Gửi câu của bạn để cùng mở đáp án.</div>` : ""}
          <form class="daily-answer-form" data-form="daily-question">
            <div class="field">
              <label for="daily-answer">Câu trả lời của bạn</label>
              <textarea id="daily-answer" name="answer" maxlength="300" placeholder="Viết điều bạn thật sự nghĩ..." required>${escapeHTML(state.dailyAnswerDraft)}</textarea>
            </div>
            <button class="btn btn--primary" type="submit" ${state.busy ? "disabled" : ""}><i data-lucide="heart"></i> Gửi câu trả lời</button>
          </form>
        `}
      </section>

      <section class="section-panel date-jar-panel">
        <div class="section-panel__head"><h2>Hũ hẹn hò</h2><span>${ideas.length} ý tưởng</span></div>
        <div class="date-draw ${drawnIdea ? "date-draw--ready" : ""}">
          <i data-lucide="dices"></i>
          <div>
            <span>${drawnIdea ? "Lần bốc gần nhất" : "Chưa bốc ý tưởng"}</span>
            <strong>${escapeHTML(drawnIdea?.text || "Thêm vài ý tưởng rồi để app chọn giúp hai đứa.")}</strong>
          </div>
        </div>
        <button class="btn btn--secondary btn--block" type="button" data-action="draw-date-idea" ${ideas.length && !state.busy ? "" : "disabled"}><i data-lucide="dices"></i> Bốc một cuộc hẹn</button>
        <form class="date-idea-form" data-form="date-idea">
          <div class="field">
            <label for="date-idea">Thêm ý tưởng mới</label>
            <div class="compact-input-row">
              <input id="date-idea" name="idea" maxlength="160" placeholder="Ví dụ: đi ăn kem lúc 10 giờ tối" required />
              <button class="icon-button" type="submit" title="Thêm ý tưởng" aria-label="Thêm ý tưởng" ${state.busy ? "disabled" : ""}><i data-lucide="plus"></i></button>
            </div>
          </div>
        </form>
        <div class="date-idea-list">
          ${ideas.slice(0, 5).map((idea) => `
            <div class="date-idea-row">
              <div><p>${escapeHTML(idea.text)}</p><span>${idea.createdBy === state.user.uid ? "Bạn thêm" : `${escapeHTML(memberNames[idea.createdBy] || "Người ấy")} thêm`}</span></div>
              ${idea.createdBy === state.user.uid ? `<button class="icon-button icon-button--danger" type="button" data-action="delete-date-idea" data-idea-id="${escapeHTML(idea.id)}" title="Xóa ý tưởng" aria-label="Xóa ý tưởng"><i data-lucide="trash-2"></i></button>` : ""}
            </div>
          `).join("") || `<p class="compact-empty">Hũ đang trống.</p>`}
        </div>
      </section>

      <section class="section-panel coupon-panel">
        <div class="section-panel__head"><h2>Phiếu yêu thương</h2><span>${availableForMe} phiếu dành cho bạn</span></div>
        <form class="coupon-form" data-form="love-coupon">
          <div class="field">
            <label for="coupon-title">Tặng người ấy một phiếu</label>
            <select id="coupon-title" name="title" required>
              ${couponPresets.map((title) => `<option value="${escapeHTML(title)}">${escapeHTML(title)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="coupon-note">Lời nhắn kèm</label>
            <input id="coupon-note" name="note" maxlength="300" placeholder="Có hiệu lực bất cứ lúc nào..." />
          </div>
          <button class="btn btn--primary btn--block" type="submit" ${partner && !state.busy ? "" : "disabled"}><i data-lucide="ticket-check"></i> Gửi phiếu</button>
        </form>
        <div class="coupon-list">
          ${coupons.slice(0, 6).map((coupon) => {
            const canRedeem = coupon.assignedTo === state.user.uid && coupon.status === "available";
            const redeemedAt = Number(coupon.redeemedAt) || 0;
            const expiresAt = couponHistoryExpiresAt(coupon);
            const label = coupon.status === "redeemed"
              ? "Đã sử dụng"
              : canRedeem
                ? "Dành cho bạn"
                : "Bạn đã gửi";
            return `
              <article class="coupon-row ${coupon.status === "redeemed" ? "coupon-row--redeemed" : ""}" data-coupon-id="${escapeHTML(coupon.id)}" data-redeemed-at="${redeemedAt}" data-expires-at="${expiresAt}">
                <span class="coupon-row__icon"><i data-lucide="ticket-check"></i></span>
                <div><strong>${escapeHTML(coupon.title)}</strong><p>${escapeHTML(coupon.note || label)}</p><small>${label}</small></div>
                ${canRedeem ? `<button class="btn btn--quiet" type="button" data-action="redeem-coupon" data-coupon-id="${escapeHTML(coupon.id)}">Dùng phiếu</button>` : ""}
              </article>`;
          }).join("") || `<p class="compact-empty">Chưa có phiếu nào được gửi.</p>`}
        </div>
      </section>
    </div>
  `;
}

function renderCouple() {
  const members = memberEntries();
  const partner = partnerMember();
  const nicknames = state.couple?.shared?.nicknames || {};
  return `
    <main class="view" id="main-content">
      <header class="page-head">
        <div><p>Không gian chung</p><h1 class="page-title">Hai đứa</h1></div>
        <span class="eyebrow">${members.length}/2 thành viên</span>
      </header>
      <div class="couple-grid">
        <section class="section-panel nickname-panel">
          <div class="section-panel__head"><h2>Biệt danh của hai đứa</h2><span>Đồng bộ ngay</span></div>
          <form class="nickname-form" data-form="nicknames">
            ${members.map((member, index) => `
              <div class="field">
                <label for="nickname-${index}">${member.uid === state.user.uid ? "Biệt danh của bạn" : "Biệt danh người ấy"}</label>
                <input id="nickname-${index}" data-nickname-uid="${escapeHTML(member.uid)}" maxlength="32" value="${escapeHTML(cleanNickname(nicknames[member.uid]))}" placeholder="${escapeHTML(member.accountName || member.displayName)}" />
                <small>Tên tài khoản: ${escapeHTML(member.accountName || member.displayName)}</small>
              </div>
            `).join("")}
            <button class="btn btn--primary" type="submit" ${state.busy || !members.length ? "disabled" : ""}><i data-lucide="save"></i> Lưu cho cả hai</button>
          </form>
          <p class="nickname-panel__note">Cả hai đều có thể sửa. Để trống một ô để dùng lại tên Google của người đó.</p>
        </section>

        <section class="section-panel">
          <div class="section-panel__head"><h2>Thành viên</h2><span>Đã xác nhận</span></div>
          <div class="member-list">
            ${members.map((member) => `
              <div class="member-row">
                ${avatarMarkup(member)}
                <div class="member-row__meta">
                  <strong>${escapeHTML(member.displayName || "Thành viên")}</strong>
                  <span>${member.uid === state.user.uid ? "Bạn" : partnerOnline() ? "Đang ở đây" : "Đã liên kết"}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </section>

        <section class="section-panel">
          <div class="section-panel__head"><h2>${partner ? "Đã xác nhận hai chiều" : "Liên kết chưa hoàn chỉnh"}</h2><i data-lucide="link-2"></i></div>
          ${partner ? `
            <p class="panel-copy">Hai Gmail đã nhập mã cá nhân của nhau. Chỉ hai tài khoản này có quyền đọc dữ liệu chung.</p>
          ` : `
            <p class="panel-copy">Đây là liên kết một chiều từ bản cũ. Hãy hủy liên kết rồi ghép lại để áp dụng xác nhận bằng hai mã.</p>
          `}
        </section>

        <section class="section-panel">
          <div class="section-panel__head"><h2>Quyền riêng tư</h2><i data-lucide="shield-check"></i></div>
          <p class="panel-copy">Check-in, Kho, Chu kỳ và Lịch thuộc không gian chung. Chỉ hai tài khoản đã liên kết mới có quyền đọc; cả hai đều có thể cập nhật.</p>
        </section>

        <section class="section-panel">
          <div class="section-panel__head"><h2>Liên kết tài khoản</h2><span>Thao tác nhạy cảm</span></div>
          <p class="panel-copy">Hủy liên kết sẽ ngắt quyền truy cập giữa hai tài khoản.</p>
          <button class="btn btn--danger" type="button" data-action="leave-couple"><i data-lucide="link-2"></i> Hủy liên kết</button>
        </section>
      </div>
    </main>
  `;
}

function renderSettings() {
  const preferences = state.profile.preferences || {};
  const previewEnabled = Boolean(preferences.showMessagePreview);
  const quietHoursEnabled = Boolean(preferences.quietHoursEnabled);
  const quietHoursStart = /^\d{2}:\d{2}$/.test(preferences.quietHoursStart)
    ? preferences.quietHoursStart
    : "22:00";
  const quietHoursEnd = /^\d{2}:\d{2}$/.test(preferences.quietHoursEnd)
    ? preferences.quietHoursEnd
    : "07:00";
  const notificationTimeZone = preferences.notificationTimeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
  const granted = state.notification.permission === "granted" && state.notification.registered;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const canEnable = state.notification.supported && (!isIOS || standalone);
  const notificationButtonText = granted
    ? "Đã bật"
    : !canEnable
      ? isIOS && !standalone
        ? "Cài app trước"
        : "Không hỗ trợ"
      : state.notification.permission === "granted"
        ? "Kết nối lại"
        : "Bật";
  return `
    <main class="view" id="main-content">
      <header class="page-head">
        <div><p>Tài khoản và thiết bị</p><h1 class="page-title">Cài đặt</h1></div>
      </header>
      <div class="settings-grid">
        <section class="section-panel settings-profile-panel">
          <div class="section-panel__head"><h2>Ảnh đại diện</h2><i data-lucide="user-round"></i></div>
          ${avatarEditorMarkup()}
          <p class="avatar-editor__note">Chọn ảnh từ điện thoại. Ảnh được tự cắt vuông, nén và chỉ hiển thị cho hai tài khoản đã liên kết.</p>
        </section>

        <section class="section-panel">
          <div class="section-panel__head"><h2>Thông báo</h2><i data-lucide="bell"></i></div>
          <div class="setting-row">
            <div><strong>Thông báo màn hình khóa</strong><span>${granted ? "Thiết bị này đã sẵn sàng nhận lời nhắn." : "Nhận lời nhắn khi app đã đóng."}</span></div>
            <button class="btn ${granted ? "btn--quiet" : "btn--primary"}" type="button" data-action="enable-notifications" ${state.busy || granted || !canEnable ? "disabled" : ""}>${notificationButtonText}</button>
          </div>
          <div class="setting-row">
            <div><strong>Hiện nội dung lời nhắn</strong><span>Tắt để màn hình khóa chỉ báo có tin mới.</span></div>
            <button class="switch" type="button" role="switch" aria-checked="${previewEnabled}" data-action="toggle-preview" aria-label="Hiện nội dung lời nhắn trên màn hình khóa"></button>
          </div>
          <fieldset class="notification-preferences">
            <legend>Chọn loại muốn nhận</legend>
            ${notificationPreferences.map(([key, icon, title, description]) => `
              <div class="notification-preference-row">
                <span class="notification-preference-row__icon"><i data-lucide="${icon}"></i></span>
                <div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(description)}</span></div>
                <button class="switch" type="button" role="switch" aria-checked="${preferenceEnabled(key)}" data-action="toggle-notification-category" data-preference="${key}" aria-label="Nhận thông báo ${escapeHTML(title.toLowerCase())}"></button>
              </div>
            `).join("")}
          </fieldset>
          <div class="quiet-hours-setting">
            <div class="setting-row">
              <div><strong>Giờ yên lặng</strong><span>App vẫn lưu mọi thứ nhưng sẽ không hiện push trong khoảng này.</span></div>
              <button class="switch" type="button" role="switch" aria-checked="${quietHoursEnabled}" data-action="toggle-quiet-hours" aria-label="Bật giờ yên lặng"></button>
            </div>
            ${quietHoursEnabled ? `
              <form class="quiet-hours-form" data-form="quiet-hours">
                <div class="field"><label for="quiet-start">Từ</label><input id="quiet-start" name="start" type="time" value="${escapeHTML(quietHoursStart)}" required /></div>
                <div class="field"><label for="quiet-end">Đến</label><input id="quiet-end" name="end" type="time" value="${escapeHTML(quietHoursEnd)}" required /></div>
                <button class="btn btn--quiet" type="submit" ${state.busy ? "disabled" : ""}><i data-lucide="moon"></i> Lưu giờ</button>
                <small>Múi giờ: ${escapeHTML(notificationTimeZone)}</small>
              </form>
            ` : ""}
          </div>
          ${isIOS && !standalone ? `<div class="waiting-band waiting-band--spaced"><strong>Trên iPhone</strong><span>Thêm HeartSync vào Màn hình chính trước khi bật thông báo.</span></div>` : ""}
        </section>

        <section class="section-panel">
          <div class="section-panel__head"><h2>Phiên đăng nhập</h2><i data-lucide="smartphone"></i></div>
          <div class="setting-row">
            <div><strong>Giữ đăng nhập</strong><span>Tắt app hoặc đóng trình duyệt không làm mất phiên.</span></div>
            <i data-lucide="check"></i>
          </div>
          <button class="btn btn--secondary" type="button" data-action="logout"><i data-lucide="log-out"></i> Đăng xuất thiết bị này</button>
        </section>

        <section class="section-panel">
          <div class="section-panel__head"><h2>An toàn dữ liệu</h2><i data-lucide="shield-check"></i></div>
          <p class="panel-copy">Quyền đọc dữ liệu được kiểm tra theo tài khoản và thành viên cặp đôi trên máy chủ.</p>
        </section>
      </div>
    </main>
  `;
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function formatTime(timestamp) {
  const number = Number(timestamp);
  if (!number) return "vừa xong";
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(number);
}

function scrollMessagesToEnd() {
  const list = document.getElementById("message-list");
  if (list) list.scrollTop = list.scrollHeight;
}

function shiftMonth(cursor, delta) {
  const date = new Date(cursor.year, cursor.month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function randomItem(items) {
  if (!items.length) return null;
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return items[value[0] % items.length];
}

function syncRoute() {
  const next = new URL(window.location.href);
  next.searchParams.set("view", state.view);
  if (state.view === "tools") next.searchParams.set("tool", state.toolView);
  else next.searchParams.delete("tool");
  history.replaceState({}, "", next);
}

function toast(message, type = "success") {
  const maxVisible = window.matchMedia("(max-width: 900px)").matches ? 2 : 3;
  while (toastHost.children.length >= maxVisible) {
    toastHost.firstElementChild?.remove();
  }
  const element = document.createElement("div");
  element.className = `toast ${type === "error" ? "toast--error" : ""}`;
  element.textContent = message;
  toastHost.append(element);
  window.setTimeout(() => element.remove(), 3200);
}

async function maybeEnsureDailyEncouragement({ force = false } = {}) {
  const coupleId = state.profile?.coupleId;
  const requestDate = service.todayKey();
  if (!state.user || !coupleId || !state.couple) return;
  if (dailyEncouragement() && !force) {
    state.encouragementRequest = {
      requestedDate: requestDate,
      loading: false,
      error: "",
      record: null,
    };
    return;
  }
  if (state.encouragementRequest.loading) return;
  if (!force && state.encouragementRequest.requestedDate === requestDate) return;

  state.encouragementRequest = {
    requestedDate: requestDate,
    loading: true,
    error: "",
    record: null,
  };
  render();
  try {
    const result = await service.ensureDailyEncouragement();
    if (state.profile?.coupleId !== coupleId) return;
    state.encouragementRequest.record = result?.encouragement || null;
  } catch (error) {
    if (state.profile?.coupleId !== coupleId) return;
    state.encouragementRequest.error = error.message || "Kết nối chưa ổn định.";
  } finally {
    if (state.profile?.coupleId === coupleId) {
      state.encouragementRequest.loading = false;
      render();
    }
  }
}

function scheduleDailyRollover() {
  if (dailyRolloverTimer) window.clearTimeout(dailyRolloverTimer);
  const currentTime = new Date();
  const nextDay = new Date(currentTime);
  nextDay.setHours(24, 0, 1, 0);
  dailyRolloverTimer = window.setTimeout(handleDailyRollover, nextDay - currentTime);
}

function handleDailyRollover() {
  const currentDate = service.todayKey();
  if (currentDate !== observedDailyDate) {
    observedDailyDate = currentDate;
    state.encouragementRequest = emptyEncouragementRequest();
    render();
  }
  maybeEnsureDailyEncouragement();
  scheduleDailyRollover();
}

function clearActivityExpiryTimer() {
  if (activityExpiryTimer) window.clearTimeout(activityExpiryTimer);
  if (activityCleanupRetryTimer) window.clearTimeout(activityCleanupRetryTimer);
  activityExpiryTimer = null;
  activityCleanupRetryTimer = null;
}

function scheduleActivityExpiry() {
  clearActivityExpiryTimer();
  const coupleId = state.profile?.coupleId;
  if (!coupleId || !state.couple) return;

  const currentTime = Date.now();
  const activities = activityEntries();
  const expiredIds = activities
    .filter((activity) => Number(activity.expiresAt) <= currentTime)
    .map((activity) => activity.id);
  if (expiredIds.length) {
    service.deleteExpiredActivities(expiredIds).catch((error) => {
      console.warn("Expired activities could not be removed", error);
      if (activityCleanupRetryTimer) return;
      activityCleanupRetryTimer = window.setTimeout(() => {
        activityCleanupRetryTimer = null;
        scheduleActivityExpiry();
      }, 30_000);
    });
  }

  const nextExpiry = activities
    .map((activity) => Number(activity.expiresAt))
    .filter((expiresAt) => expiresAt > currentTime)
    .sort((first, second) => first - second)[0];
  if (!nextExpiry) return;
  activityExpiryTimer = window.setTimeout(() => {
    activityExpiryTimer = null;
    render();
    scheduleActivityExpiry();
  }, Math.max(50, nextExpiry - currentTime + 25));
}

function clearCouponExpiryTimer() {
  if (couponExpiryTimer) window.clearTimeout(couponExpiryTimer);
  if (couponCleanupRetryTimer) window.clearTimeout(couponCleanupRetryTimer);
  couponExpiryTimer = null;
  couponCleanupRetryTimer = null;
}

function scheduleCouponExpiry() {
  clearCouponExpiryTimer();
  const coupleId = state.profile?.coupleId;
  if (!coupleId || !state.couple) return;

  const currentTime = Date.now();
  const coupons = couponEntries();
  const expiredIds = coupons
    .filter((coupon) => {
      const expiresAt = couponHistoryExpiresAt(coupon);
      return expiresAt > 0 && expiresAt <= currentTime;
    })
    .map((coupon) => coupon.id);
  if (expiredIds.length) {
    service.deleteExpiredCoupons(expiredIds).catch((error) => {
      console.warn("Expired coupons could not be removed", error);
      if (couponCleanupRetryTimer) return;
      couponCleanupRetryTimer = window.setTimeout(() => {
        couponCleanupRetryTimer = null;
        scheduleCouponExpiry();
      }, 30_000);
    });
  }

  const nextExpiry = coupons
    .map(couponHistoryExpiresAt)
    .filter((expiresAt) => expiresAt > currentTime)
    .sort((first, second) => first - second)[0];
  if (!nextExpiry) return;
  couponExpiryTimer = window.setTimeout(() => {
    couponExpiryTimer = null;
    render();
    scheduleCouponExpiry();
  }, Math.max(50, nextExpiry - currentTime + 25));
}

function cleanupCoupleSubscriptions() {
  clearActivityExpiryTimer();
  clearCouponExpiryTimer();
  coupleUnsubscribe?.();
  messagesUnsubscribe?.();
  coupleUnsubscribe = null;
  messagesUnsubscribe = null;
  activeCoupleId = null;
  service.stopPresence();
  state.couple = null;
  state.messages = [];
  state.encouragementRequest = emptyEncouragementRequest();
}

function bindCouple(coupleId) {
  if (!coupleId || activeCoupleId === coupleId) return;
  cleanupCoupleSubscriptions();
  activeCoupleId = coupleId;
  coupleUnsubscribe = service.watchCouple(coupleId, (couple) => {
    state.couple = couple;
    scheduleActivityExpiry();
    scheduleCouponExpiry();
    render();
    maybeEnsureDailyEncouragement();
  });
  messagesUnsubscribe = service.watchMessages(coupleId, (messages) => {
    state.messages = messages;
    render();
  });
  service.startPresence(coupleId, state.user.uid);
}

async function loadPairingStatus() {
  if (!state.user || state.profile?.coupleId || pairingLoadedFor === state.user.uid) return;
  pairingLoadedFor = state.user.uid;
  state.pairing = { ...state.pairing, loading: true };
  render();
  try {
    state.pairing = { ...(await service.getPairingStatus()), loading: false };
  } catch (error) {
    pairingLoadedFor = null;
    state.pairing = { ...state.pairing, loading: false };
    state.error = error.message || "Chưa thể lấy mã cá nhân.";
  }
  render();
}

async function handleAuthenticatedUser(user) {
  // iOS PWA auth callbacks can arrive before the redirect/sign-out promise settles.
  busyOperationId += 1;
  state.busy = false;
  state.user = user;
  state.error = "";
  if (!user) {
    profileUnsubscribe?.();
    profileUnsubscribe = null;
    cleanupCoupleSubscriptions();
    state.profile = null;
    state.notification = { supported: false, permission: "default", registered: false };
    state.chatPicker = null;
    notificationRestoredFor = null;
    pairingLoadedFor = null;
    state.pairing = { loading: true, code: "", linked: false, waiting: false };
    render();
    return;
  }

  renderBoot();
  try {
    await service.ensureProfile(user);
  } catch (error) {
    state.error = error.message;
  }
  profileUnsubscribe?.();
  profileUnsubscribe = service.watchProfile(user.uid, async (profile) => {
    state.profile = profile;
    if (profile?.coupleId) {
      state.pairing = { ...state.pairing, linked: true, waiting: false };
      bindCouple(profile.coupleId);
    } else {
      cleanupCoupleSubscriptions();
      await loadPairingStatus();
    }

    if (!state.notification.registered) {
      state.notification = await service.notificationCapability();
    }
    if (notificationRestoredFor !== user.uid) {
      notificationRestoredFor = user.uid;
      state.notification = await service.restoreNotifications(user.uid, handleForegroundMessage);
    }
    render();
  });
}

function handleForegroundMessage(payload) {
  const title = payload?.data?.title || "HeartSync";
  const body = payload?.data?.body || "Bạn có một lời nhắn mới.";
  toast(`${title}: ${body}`);
}

async function runBusy(task, { startBeforeRender = false } = {}) {
  const operationId = ++busyOperationId;
  state.busy = true;
  state.error = "";
  try {
    const pendingTask = startBeforeRender ? task() : null;
    render();
    await (startBeforeRender ? pendingTask : task());
  } catch (error) {
    if (operationId !== busyOperationId) return;
    state.error = error.message || "Không thể hoàn tất thao tác.";
    toast(state.error, "error");
  } finally {
    if (operationId !== busyOperationId) return;
    state.busy = false;
    render();
  }
}

appRoot.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;

  if (action === "refresh-app") {
    window.location.reload();
  } else if (action === "auth-mode") {
    state.authMode = button.dataset.mode;
    state.error = "";
    render();
  } else if (action === "google-auth") {
    runBusy(() => service.signInGoogle(), { startBeforeRender: true });
  } else if (action === "copy-personal-code") {
    const code = state.pairing.code;
    if (code) navigator.clipboard.writeText(code).then(() => toast("Đã sao chép mã của bạn."));
  } else if (action === "navigate") {
    state.view = button.dataset.view;
    if (state.view !== "chat") state.chatPicker = null;
    if (button.dataset.tool) state.toolView = button.dataset.tool;
    syncRoute();
    render();
  } else if (action === "select-tool") {
    state.view = "tools";
    state.toolView = button.dataset.tool;
    syncRoute();
    render();
  } else if (action === "toggle-chat-picker") {
    const picker = button.dataset.picker;
    state.chatPicker = state.chatPicker === picker ? null : picker;
    render();
  } else if (action === "select-chat-picker") {
    state.chatPicker = button.dataset.picker;
    render();
  } else if (action === "close-chat-picker") {
    state.chatPicker = null;
    render();
    document.getElementById("message-input")?.focus();
  } else if (action === "select-emoji-group") {
    if (!chatMedia.emojiGroups.some((group) => group.id === button.dataset.groupId)) return;
    state.emojiGroup = button.dataset.groupId;
    render();
  } else if (action === "insert-emoji") {
    const input = document.getElementById("message-input");
    const emoji = button.dataset.emoji || "";
    if (!input || !emoji) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const nextValue = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
    if (nextValue.length > 1000) {
      toast("Lời nhắn đã đạt giới hạn 1.000 ký tự.", "error");
      return;
    }
    input.value = nextValue;
    state.messageDraft = nextValue;
    const nextCursor = start + emoji.length;
    input.focus();
    input.setSelectionRange(nextCursor, nextCursor);
  } else if (action === "send-sticker") {
    const sticker = stickerForId(button.dataset.stickerId);
    if (!sticker || !partnerMember()) return;
    state.chatPicker = null;
    runBusy(async () => {
      await service.sendMessage({
        text: sticker.label,
        kind: "sticker",
        stickerId: sticker.id,
      });
      toast("Đã gửi sticker.");
    });
  } else if (action === "change-cycle-month") {
    state.cycleCursor = shiftMonth(state.cycleCursor, Number(button.dataset.delta));
    render();
  } else if (action === "toggle-period-day") {
    const cycle = cycleData();
    const days = new Set(cycle.periodDays);
    if (days.has(button.dataset.date)) days.delete(button.dataset.date);
    else days.add(button.dataset.date);
    runBusy(async () => {
      await service.saveCycle(state.profile.coupleId, state.user.uid, {
        length: cycle.length,
        periodDays: [...days].sort(),
      });
      toast(days.has(button.dataset.date) ? "Đã ghi nhận ngày chu kỳ." : "Đã bỏ ngày đã chọn.");
    });
  } else if (action === "change-event-month") {
    state.calendarCursor = shiftMonth(state.calendarCursor, Number(button.dataset.delta));
    state.selectedEventDate = localDateKey(
      new Date(state.calendarCursor.year, state.calendarCursor.month, 1),
    );
    render();
  } else if (action === "select-calendar-day") {
    state.selectedEventDate = button.dataset.date;
    render();
  } else if (action === "delete-calendar-event") {
    const approved = window.confirm("Xóa sự kiện này khỏi lịch chung?");
    if (approved) {
      runBusy(async () => {
        await service.deleteCalendarEvent(state.profile.coupleId, button.dataset.eventId);
        toast("Đã xóa sự kiện.");
      });
    }
  } else if (action === "go-settings") {
    state.view = "settings";
    syncRoute();
    render();
  } else if (action === "retry-daily-encouragement") {
    state.encouragementRequest.requestedDate = "";
    state.encouragementRequest.error = "";
    maybeEnsureDailyEncouragement({ force: true });
  } else if (action === "choose-avatar") {
    document.getElementById("avatar-file-input")?.click();
  } else if (action === "remove-avatar") {
    runBusy(async () => {
      await service.updateAvatar("");
      toast("Đã dùng lại ảnh từ tài khoản Google.");
    });
  } else if (action === "choose-pulse-background") {
    document.getElementById("pulse-background-file-input")?.click();
  } else if (action === "remove-pulse-background") {
    runBusy(async () => {
      await service.updatePulseBackground("");
      toast("Đã dùng lại nền xanh mặc định.");
    });
  } else if (action === "choose-mood") {
    state.checkinDraft.mood = button.dataset.value;
    render();
  } else if (action === "choose-need") {
    state.checkinDraft.need = button.dataset.value;
    render();
  } else if (action === "send-surprise") {
    const text = randomItem(surpriseMessages);
    runBusy(async () => {
      await service.sendActivity({ text, type: "surprise" });
      navigator.vibrate?.([80, 40, 120]);
      toast("Bất ngờ nhỏ đã bay đến người ấy.");
    });
  } else if (action === "draw-date-idea") {
    const ideas = dateIdeas();
    const currentId = state.couple?.shared?.dateDraw?.ideaId;
    const choices = ideas.length > 1 ? ideas.filter((idea) => idea.id !== currentId) : ideas;
    const chosen = randomItem(choices);
    if (!chosen) return;
    runBusy(async () => {
      await service.drawDateIdea(state.profile.coupleId, state.user.uid, chosen.id);
      toast(`Cuộc hẹn được chọn: ${chosen.text}`);
    });
  } else if (action === "delete-date-idea") {
    const approved = window.confirm("Xóa ý tưởng này khỏi hũ hẹn hò?");
    if (approved) {
      runBusy(async () => {
        await service.deleteDateIdea(state.profile.coupleId, button.dataset.ideaId);
        toast("Đã bỏ ý tưởng khỏi hũ.");
      });
    }
  } else if (action === "redeem-coupon") {
    const coupon = loveCoupons().find((item) => item.id === button.dataset.couponId);
    runBusy(async () => {
      await service.redeemLoveCoupon(state.profile.coupleId, state.user.uid, button.dataset.couponId);
      await service.sendActivity({
        text: `Mình vừa dùng phiếu “${coupon?.title || "yêu thương"}”.`,
        type: "coupon-redeemed",
      });
      toast("Đã sử dụng phiếu yêu thương.");
    });
  } else if (action === "open-future-letter") {
    const letterId = button.dataset.letterId;
    if (state.openedLetters[letterId]) {
      delete state.openedLetters[letterId];
      render();
      return;
    }
    runBusy(async () => {
      const result = await service.openFutureLetter(letterId);
      state.openedLetters[letterId] = result.body;
      toast(result.preview ? "Đây là bản xem lại của người viết." : "Lá thư đã được mở.");
    });
  } else if (action === "delete-future-letter") {
    const approved = window.confirm("Xóa lá thư đã hẹn này? Nội dung đã niêm phong cũng sẽ bị xóa.");
    if (approved) {
      runBusy(async () => {
        await service.deleteFutureLetter(button.dataset.letterId);
        delete state.openedLetters[button.dataset.letterId];
        toast("Đã xóa lá thư đã hẹn.");
      });
    }
  } else if (action === "send-nudge") {
    const kind = button.dataset.kind;
    runBusy(async () => {
      document.getElementById("pulse-center")?.classList.add("is-beating");
      await service.sendActivity({
        text: nudgeLabels[kind] || nudgeLabels.heart,
        type: `nudge-${kind}`,
      });
      toast("Đã gửi đến người ấy.");
    });
  } else if (action === "enable-notifications") {
    runBusy(async () => {
      state.notification = await service.enableNotifications(state.user.uid, handleForegroundMessage);
      toast("Thông báo màn hình khóa đã bật.");
    });
  } else if (action === "toggle-preview") {
    const value = !state.profile.preferences?.showMessagePreview;
    runBusy(async () => {
      await service.savePreference(state.user.uid, "showMessagePreview", value);
      toast(value ? "Sẽ hiện nội dung trên màn hình khóa." : "Đã ẩn nội dung trên màn hình khóa.");
    });
  } else if (action === "toggle-notification-category") {
    const key = button.dataset.preference;
    if (!notificationPreferences.some(([preferenceKey]) => preferenceKey === key)) return;
    const value = !preferenceEnabled(key);
    runBusy(async () => {
      await service.savePreference(state.user.uid, key, value);
      toast(value ? "Đã bật loại thông báo này." : "Đã tạm dừng loại thông báo này.");
    });
  } else if (action === "toggle-quiet-hours") {
    const value = !state.profile.preferences?.quietHoursEnabled;
    runBusy(async () => {
      await service.savePreference(state.user.uid, "quietHoursEnabled", value);
      toast(value ? "Đã bật giờ yên lặng." : "Đã tắt giờ yên lặng.");
    });
  } else if (action === "logout") {
    runBusy(() => service.signOut());
  } else if (action === "leave-couple") {
    const approved = window.confirm("Hủy liên kết sẽ ngắt quyền truy cập giữa hai tài khoản. Tiếp tục?");
    if (approved) {
      runBusy(async () => {
        pairingLoadedFor = null;
        state.pairing = { loading: true, code: state.pairing.code || "", linked: false, waiting: false };
        await service.leaveCouple();
        await loadPairingStatus();
        toast("Đã hủy liên kết cho cả hai tài khoản.");
      });
    }
  }
});

appRoot.addEventListener("change", (event) => {
  if (!["avatar-file-input", "pulse-background-file-input"].includes(event.target.id)) return;
  const [file] = event.target.files || [];
  event.target.value = "";
  if (!file) return;
  if (event.target.id === "pulse-background-file-input") {
    runBusy(async () => {
      const imageData = await prepareBackgroundData(file);
      await service.updatePulseBackground(imageData);
      toast("Ảnh nền chung đã được đồng bộ.");
    });
    return;
  }
  runBusy(async () => {
    const avatarData = await prepareAvatarData(file);
    await service.updateAvatar(avatarData);
    toast("Ảnh đại diện đã được cập nhật.");
  });
});

appRoot.addEventListener("input", (event) => {
  if (event.target.id === "message-input") state.messageDraft = event.target.value;
  if (event.target.id === "checkin-note") state.checkinDraft.note = event.target.value;
  if (event.target.id === "daily-answer") state.dailyAnswerDraft = event.target.value;
  if (event.target.id === "event-date" && dateFromKey(event.target.value)) {
    state.selectedEventDate = event.target.value;
  }
  if (["bodyGender", "height", "weight", "chest", "waist", "footLength"].includes(event.target.name)) {
    const form = event.target.closest("form[data-form=\"vault\"]");
    updateVaultSizeResults(form);
  }
});

appRoot.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !state.chatPicker) return;
  state.chatPicker = null;
  render();
  document.getElementById("message-input")?.focus();
});

appRoot.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);

  if (form.dataset.form === "auth") {
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    const name = String(data.get("name") || "");
    if (!form.reportValidity()) return;
    runBusy(() =>
      state.authMode === "signup"
        ? service.createAccount({ name, email, password })
        : service.signInEmail(email, password),
    );
  } else if (form.dataset.form === "mutual-pair") {
    const code = String(data.get("code") || "");
    if (!form.reportValidity()) return;
    runBusy(async () => {
      const result = await service.submitPairCode(code);
      state.pairing = { ...state.pairing, ...result, loading: false };
      toast(
        result.matched
          ? "Hai mã đã khớp. Tài khoản đã được liên kết."
          : "Đã lưu mã người ấy. Đang chờ xác nhận chiều ngược lại.",
      );
    });
  } else if (form.dataset.form === "nicknames") {
    if (!form.reportValidity()) return;
    const nicknames = Object.fromEntries(
      [...form.querySelectorAll("[data-nickname-uid]")]
        .map((input) => [input.dataset.nicknameUid, cleanNickname(input.value)]),
    );
    runBusy(async () => {
      await service.saveNicknames(state.profile.coupleId, nicknames);
      toast("Biệt danh đã đồng bộ cho cả hai.");
    });
  } else if (form.dataset.form === "future-letter") {
    const title = String(data.get("title") || "").trim();
    const body = String(data.get("body") || "").trim();
    const openDate = String(data.get("openDate") || "");
    if (!form.reportValidity() || !title || !body || !dateFromKey(openDate)) return;
    if (openDate < tomorrowDateKey()) {
      toast("Ngày mở thư cần bắt đầu từ ngày mai.", "error");
      return;
    }
    runBusy(async () => {
      await service.createFutureLetter({ title, body, openDate });
      form.reset();
      toast("Lá thư đã được niêm phong đến ngày hẹn.");
    });
  } else if (form.dataset.form === "first-trip") {
    const date = String(data.get("date") || "");
    if (!form.reportValidity() || !dateFromKey(date)) return;
    if (date > service.todayKey()) {
      toast("Ngày chuyến đi không thể ở trong tương lai.", "error");
      return;
    }
    runBusy(async () => {
      await service.saveFirstTripAchievement(state.profile.coupleId, state.user.uid, date);
      toast("Đã ghi nhận chuyến đi đầu tiên của hai đứa.");
    });
  } else if (form.dataset.form === "daily-question") {
    const answer = String(data.get("answer") || "").trim();
    if (!form.reportValidity() || !answer) return;
    runBusy(async () => {
      await service.saveDailyAnswer(
        state.profile.coupleId,
        state.user.uid,
        service.todayKey(),
        answer,
      );
      state.dailyAnswerDraft = "";
      await service.sendActivity({
        text: "Mình đã trả lời câu hỏi hôm nay. Đến lượt bạn mở đáp án nhé.",
        type: "daily-answer",
      });
      toast("Đã cất câu trả lời của bạn.");
    });
  } else if (form.dataset.form === "date-idea") {
    const idea = String(data.get("idea") || "").trim();
    if (!form.reportValidity() || !idea) return;
    runBusy(async () => {
      await service.addDateIdea(state.profile.coupleId, state.user.uid, idea);
      await service.sendActivity({
        text: "Mình vừa thêm một ý tưởng mới vào Hũ hẹn hò.",
        type: "date-idea",
      });
      toast("Đã thả ý tưởng vào hũ.");
    });
  } else if (form.dataset.form === "love-coupon") {
    const partner = partnerMember();
    const title = String(data.get("title") || "").trim();
    const note = String(data.get("note") || "").trim();
    if (!partner || !form.reportValidity() || !title) return;
    runBusy(async () => {
      await service.createLoveCoupon(state.profile.coupleId, state.user.uid, partner.uid, {
        title,
        note,
      });
      await service.sendActivity({
        text: `Mình vừa gửi phiếu “${title}”.`,
        type: "love-coupon",
      });
      toast("Phiếu yêu thương đã được gửi.");
    });
  } else if (form.dataset.form === "relationship-date") {
    const startDate = String(data.get("startDate") || "");
    if (!form.reportValidity() || !dateFromKey(startDate)) return;
    if (startDate > localDateKey()) {
      toast("Ngày bắt đầu không thể ở trong tương lai.", "error");
      return;
    }
    runBusy(async () => {
      await service.saveRelationshipDate(state.profile.coupleId, state.user.uid, startDate);
      toast("Đã đồng bộ ngày bắt đầu yêu.");
    });
  } else if (form.dataset.form === "vault") {
    if (!form.reportValidity()) return;
    const vault = Object.fromEntries(
      ["favoriteFoods", "favoriteDrinks", "favoriteFlowers", "bodyGender", "height", "weight", "chest", "waist", "footLength", "notes"]
        .map((key) => [key, String(data.get(key) || "").trim()]),
    );
    runBusy(async () => {
      await service.saveVault(state.profile.coupleId, state.user.uid, vault);
      toast("Kho chung đã được cập nhật.");
    });
  } else if (form.dataset.form === "cycle-settings") {
    const length = Number.parseInt(data.get("length"), 10);
    if (!form.reportValidity() || length < 15 || length > 60) return;
    const cycle = cycleData();
    runBusy(async () => {
      await service.saveCycle(state.profile.coupleId, state.user.uid, {
        length,
        periodDays: cycle.periodDays,
      });
      toast("Đã lưu thiết lập chu kỳ.");
    });
  } else if (form.dataset.form === "calendar-event") {
    const title = String(data.get("title") || "").trim();
    const eventDate = String(data.get("date") || "");
    const note = String(data.get("note") || "").trim();
    if (!form.reportValidity() || !title || !dateFromKey(eventDate)) return;
    const selectedDate = dateFromKey(eventDate);
    state.selectedEventDate = eventDate;
    state.calendarCursor = { year: selectedDate.getFullYear(), month: selectedDate.getMonth() };
    runBusy(async () => {
      await service.addCalendarEvent(state.profile.coupleId, state.user.uid, {
        title,
        date: eventDate,
        note,
      });
      toast("Đã thêm vào lịch chung.");
    });
  } else if (form.dataset.form === "quiet-hours") {
    const start = String(data.get("start") || "");
    const end = String(data.get("end") || "");
    if (!form.reportValidity() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) return;
    if (start === end) {
      toast("Giờ bắt đầu và kết thúc cần khác nhau.", "error");
      return;
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
    runBusy(async () => {
      await service.savePreferences(state.user.uid, {
        quietHoursStart: start,
        quietHoursEnd: end,
        notificationTimeZone: timeZone,
      });
      toast(`Đã giữ yên lặng từ ${start} đến ${end}.`);
    });
  } else if (form.dataset.form === "checkin") {
    if (!state.checkinDraft.mood || !state.checkinDraft.need) {
      toast("Chọn tâm trạng và điều bạn cần trước khi lưu.", "error");
      return;
    }
    runBusy(async () => {
      await service.saveCheckin(state.profile.coupleId, state.user.uid, state.checkinDraft);
      toast("Đã chia sẻ check-in.");
    });
  } else if (form.dataset.form === "message") {
    const text = String(data.get("message") || "").trim();
    if (!text) return;
    state.messageDraft = "";
    state.chatPicker = null;
    runBusy(async () => {
      await service.sendMessage({ text });
      toast("Đã gửi lời nhắn.");
    });
  }
});

async function start() {
  try {
    await service.initSession();
    authUnsubscribe = service.watchAuth(handleAuthenticatedUser);
    relationshipClockInterval ||= window.setInterval(updateRelationshipClock, 1_000);
    scheduleDailyRollover();
    if ("serviceWorker" in navigator && !isPreview) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" }).catch(() => {});
    }
  } catch (error) {
    state.error = error.message;
    renderAuth();
    refreshIcons();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !state.profile?.coupleId) return;
  handleDailyRollover();
  render();
  scheduleActivityExpiry();
  scheduleCouponExpiry();
});

window.addEventListener("beforeunload", () => {
  if (relationshipClockInterval) window.clearInterval(relationshipClockInterval);
  if (dailyRolloverTimer) window.clearTimeout(dailyRolloverTimer);
  clearActivityExpiryTimer();
  authUnsubscribe?.();
  profileUnsubscribe?.();
  cleanupCoupleSubscriptions();
});

start();
