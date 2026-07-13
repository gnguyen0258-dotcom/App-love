const now = Date.now();
const localNow = new Date(now);
const date = new Date(now - localNow.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const ACTIVITY_TTL_MS = 24 * 60 * 60 * 1000;
const COUPON_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

function relativeDate(days) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const demoUser = {
  uid: "demo-giang",
  displayName: "Giang",
  email: "giang@example.com",
  photoURL: "",
};

let demoProfile = {
  displayName: "Giang",
  email: demoUser.email,
  photoURL: "",
  coupleId: "demo-couple",
  preferences: { showMessagePreview: false, quietHoursEnabled: false },
  devices: {},
};

let demoCouple = {
  meta: {
    status: "active",
    createdAt: now - 94 * 24 * 60 * 60 * 1000,
  },
  members: {
    "demo-giang": { displayName: "Giang", joinedAt: now - 94 * 24 * 60 * 60 * 1000 },
    "demo-partner": { displayName: "Người ấy", joinedAt: now - 94 * 24 * 60 * 60 * 1000 },
  },
  presence: {
    "demo-giang": { online: true, lastSeen: now },
    "demo-partner": { online: true, lastSeen: now },
  },
  checkins: {
    [date]: {
      "demo-giang": { mood: "Bình yên", need: "Muốn được trò chuyện", note: "Tối nay mình đi dạo nhé.", updatedAt: now - 25 * 60 * 1000 },
      "demo-partner": { mood: "Hơi mệt", need: "Cần một cái ôm", note: "Hôm nay công việc hơi nhiều.", updatedAt: now - 11 * 60 * 1000 },
    },
  },
  activities: {
    "activity-demo": {
      id: "activity-demo",
      actorId: "demo-partner",
      actorName: "Người ấy",
      text: "Gửi một cái ôm",
      type: "nudge-hug",
      kind: "activity",
      createdAt: now - 15 * 60 * 1000,
      expiresAt: now - 15 * 60 * 1000 + ACTIVITY_TTL_MS,
    },
  },
  shared: {
    nicknames: {},
    relationship: {
      startDate: relativeDate(-460),
      updatedAt: now,
      updatedBy: "demo-giang",
    },
    vault: {
      favoriteFoods: "Bún chả, lẩu Thái, sushi",
      favoriteDrinks: "Trà đào ít đường, cacao nóng",
      favoriteFlowers: "Hoa linh lan, tulip trắng",
      bodyGender: "female",
      height: "160",
      weight: "48",
      chest: "82",
      waist: "64",
      footLength: "24.1",
      notes: "Không thích rau mùi. Khi mệt chỉ cần được ôm và nghe kể chuyện.",
      updatedAt: now,
      updatedBy: "demo-partner",
    },
    cycle: {
      length: 28,
      periodDays: {
        [relativeDate(-31)]: true,
        [relativeDate(-30)]: true,
        [relativeDate(-29)]: true,
        [relativeDate(-3)]: true,
        [relativeDate(-2)]: true,
        [relativeDate(-1)]: true,
      },
      updatedAt: now,
      updatedBy: "demo-partner",
    },
    events: {
      "demo-date": {
        title: "Hẹn ăn tối",
        date: relativeDate(3),
        note: "Chọn quán trước tối thứ Sáu",
        createdAt: now,
        createdBy: "demo-giang",
      },
      "demo-anniversary": {
        title: "Chuyến đi cuối tuần",
        date: relativeDate(12),
        note: "Mang máy ảnh và áo khoác",
        createdAt: now,
        createdBy: "demo-partner",
      },
    },
    dailyQuestions: {
      [date]: {
        "demo-partner": {
          text: "Lúc anh để ý những điều nhỏ em kể và nhớ chúng vào hôm sau.",
          updatedAt: now - 18 * 60 * 1000,
        },
      },
    },
    dailyEncouragement: {
      current: {
        date,
        quoteId: "o01-a01",
        text: "Hôm nay, hai đứa hãy nhớ rằng cả hai đều xứng đáng với một ngày dịu dàng.",
        assignedAt: now - 30 * 60 * 1000,
      },
      used: { "o01-a01": date },
    },
    dateIdeas: {
      "idea-1": { text: "Đi ăn món chưa ai trong hai đứa từng thử", createdBy: "demo-giang", createdAt: now - 3_600_000 },
      "idea-2": { text: "Tắt điện thoại và đi dạo 30 phút", createdBy: "demo-partner", createdAt: now - 2_800_000 },
      "idea-3": { text: "Mua nguyên liệu rồi cùng nấu bữa tối", createdBy: "demo-giang", createdAt: now - 1_900_000 },
    },
    dateDraw: {
      ideaId: "idea-2",
      drawnAt: now - 900_000,
      drawnBy: "demo-partner",
    },
    coupons: {
      "coupon-1": {
        title: "Một buổi tối được chọn phim",
        note: "Kèm bỏng ngô và không chê gu phim",
        status: "available",
        createdAt: now - 86_400_000,
        createdBy: "demo-partner",
        assignedTo: "demo-giang",
        redeemedAt: 0,
        redeemedBy: "",
      },
      "coupon-2": {
        title: "Một cái ôm thật lâu",
        note: "Dùng bất cứ khi nào cần",
        status: "available",
        createdAt: now - 43_200_000,
        createdBy: "demo-giang",
        assignedTo: "demo-partner",
        redeemedAt: 0,
        redeemedBy: "",
      },
      "coupon-expired": {
        title: "Phiếu lịch sử đã hết hạn",
        note: "Dữ liệu demo dùng để kiểm tra tự động dọn phiếu",
        status: "redeemed",
        createdAt: now - 3 * COUPON_HISTORY_TTL_MS,
        createdBy: "demo-partner",
        assignedTo: "demo-giang",
        redeemedAt: now - COUPON_HISTORY_TTL_MS - 60_000,
        redeemedBy: "demo-giang",
      },
    },
  },
};

let demoMessages = [
  { id: "m1", senderId: "demo-partner", senderName: "Người ấy", text: "Hôm nay anh về lúc mấy giờ?", kind: "message", createdAt: now - 50 * 60 * 1000 },
  { id: "m2", senderId: "demo-giang", senderName: "Giang", text: "Khoảng 7 giờ. Anh mua món em thích nhé?", kind: "message", createdAt: now - 45 * 60 * 1000 },
  { id: "m4", senderId: "demo-partner", senderName: "Người ấy", text: "Vậy tối mình đi dạo một vòng nha.", kind: "message", createdAt: now - 10 * 60 * 1000 },
];

const listeners = {
  auth: new Set(),
  profile: new Set(),
  couple: new Set(),
  messages: new Set(),
};

let demoPairing = {
  code: "GIAN-G025",
  linked: false,
  waiting: false,
};

function subscribe(setName, callback, currentValue) {
  listeners[setName].add(callback);
  queueMicrotask(() => callback(currentValue()));
  return () => listeners[setName].delete(callback);
}

function publish(setName, value) {
  listeners[setName].forEach((callback) => callback(value));
}

export function createDemoService(route = "app") {
  let demoAuthUser = route === "auth" ? null : demoUser;
  if (route === "pair") {
    demoProfile = { ...demoProfile, coupleId: null };
    demoPairing = { code: "GIAN-G025", linked: false, waiting: false };
  }

  return {
    initSession: async () => {},
    watchAuth(callback) {
      return subscribe("auth", callback, () => demoAuthUser);
    },
    async signInGoogle() {
      demoAuthUser = demoUser;
      publish("auth", demoAuthUser);
      return { user: demoUser };
    },
    async signInEmail() {
      demoAuthUser = demoUser;
      publish("auth", demoAuthUser);
      return { user: demoUser };
    },
    async createAccount() {
      demoAuthUser = demoUser;
      publish("auth", demoAuthUser);
      return { user: demoUser };
    },
    ensureProfile: async () => demoProfile,
    watchProfile(_uid, callback) {
      return subscribe("profile", callback, () => demoProfile);
    },
    watchCouple(_coupleId, callback) {
      return subscribe("couple", callback, () => demoCouple);
    },
    watchMessages(_coupleId, callback) {
      return subscribe("messages", callback, () => demoMessages);
    },
    startPresence() {},
    stopPresence() {},
    async saveCheckin(_coupleId, uid, checkin) {
      demoCouple.checkins[date][uid] = { ...checkin, updatedAt: Date.now() };
      publish("couple", demoCouple);
    },
    async savePreference(_uid, key, value) {
      demoProfile.preferences[key] = value;
      publish("profile", demoProfile);
    },
    async saveNicknames(_coupleId, nicknames) {
      demoCouple.shared.nicknames ||= {};
      Object.entries(nicknames || {}).forEach(([uid, value]) => {
        const nickname = String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
        if (nickname) demoCouple.shared.nicknames[uid] = nickname;
        else delete demoCouple.shared.nicknames[uid];
      });
      publish("couple", demoCouple);
    },
    async saveRelationshipDate(_coupleId, uid, startDate) {
      demoCouple.shared.relationship = { startDate, updatedAt: Date.now(), updatedBy: uid };
      publish("couple", demoCouple);
    },
    async saveVault(_coupleId, uid, vault) {
      demoCouple.shared.vault = { ...vault, updatedAt: Date.now(), updatedBy: uid };
      publish("couple", demoCouple);
    },
    async saveCycle(_coupleId, uid, cycle) {
      demoCouple.shared.cycle = {
        length: Number(cycle.length) || 28,
        periodDays: Object.fromEntries((cycle.periodDays || []).map((day) => [day, true])),
        updatedAt: Date.now(),
        updatedBy: uid,
      };
      publish("couple", demoCouple);
    },
    async addCalendarEvent(_coupleId, uid, event) {
      const eventId = crypto.randomUUID();
      demoCouple.shared.events[eventId] = {
        ...event,
        createdAt: Date.now(),
        createdBy: uid,
      };
      publish("couple", demoCouple);
      return eventId;
    },
    async deleteCalendarEvent(_coupleId, eventId) {
      delete demoCouple.shared.events[eventId];
      publish("couple", demoCouple);
    },
    async saveDailyAnswer(_coupleId, uid, answerDate, text) {
      demoCouple.shared.dailyQuestions[answerDate] ||= {};
      demoCouple.shared.dailyQuestions[answerDate][uid] = {
        text: String(text).trim(),
        updatedAt: Date.now(),
      };
      publish("couple", demoCouple);
    },
    async addDateIdea(_coupleId, uid, text) {
      const ideaId = crypto.randomUUID();
      demoCouple.shared.dateIdeas[ideaId] = {
        text: String(text).trim(),
        createdBy: uid,
        createdAt: Date.now(),
      };
      publish("couple", demoCouple);
      return ideaId;
    },
    async deleteDateIdea(_coupleId, ideaId) {
      delete demoCouple.shared.dateIdeas[ideaId];
      publish("couple", demoCouple);
    },
    async drawDateIdea(_coupleId, uid, ideaId) {
      demoCouple.shared.dateDraw = { ideaId, drawnAt: Date.now(), drawnBy: uid };
      publish("couple", demoCouple);
    },
    async createLoveCoupon(_coupleId, uid, partnerUid, coupon) {
      const couponId = crypto.randomUUID();
      demoCouple.shared.coupons[couponId] = {
        ...coupon,
        status: "available",
        createdAt: Date.now(),
        createdBy: uid,
        assignedTo: partnerUid,
        redeemedAt: 0,
        redeemedBy: "",
      };
      publish("couple", demoCouple);
      return couponId;
    },
    async redeemLoveCoupon(_coupleId, uid, couponId) {
      Object.assign(demoCouple.shared.coupons[couponId], {
        status: "redeemed",
        redeemedAt: Date.now(),
        redeemedBy: uid,
      });
      publish("couple", demoCouple);
    },
    async deleteExpiredCoupons(couponIds) {
      const currentTime = Date.now();
      let deleted = 0;
      for (const id of couponIds || []) {
        const coupon = demoCouple.shared.coupons?.[id];
        const redeemedAt = Number(coupon?.redeemedAt);
        if (
          coupon?.status === "redeemed" &&
          redeemedAt > 0 &&
          redeemedAt + COUPON_HISTORY_TTL_MS <= currentTime
        ) {
          delete demoCouple.shared.coupons[id];
          deleted += 1;
        }
      }
      if (deleted) publish("couple", demoCouple);
      return { deleted };
    },
    async getPairingStatus() {
      return { ...demoPairing };
    },
    async submitPairCode(rawCode) {
      const normalized = String(rawCode || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .replace(/^(.{4})(.{4})$/, "$1-$2");
      if (normalized === demoPairing.code) {
        throw new Error("Bạn cần nhập mã của người ấy, không phải mã của mình.");
      }
      if (normalized === "NGAY-AY25") {
        demoPairing = {
          code: demoPairing.code,
          linked: true,
          matched: true,
          waiting: false,
          coupleId: "demo-couple",
        };
        demoProfile = { ...demoProfile, coupleId: "demo-couple" };
        publish("profile", demoProfile);
        return { ...demoPairing };
      }
      demoPairing = {
        code: demoPairing.code,
        linked: false,
        matched: false,
        waiting: true,
        targetCode: normalized,
        targetName: "Người dùng mã này",
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      return { ...demoPairing };
    },
    async leaveCouple() {
      demoProfile = { ...demoProfile, coupleId: null };
      demoPairing = { code: demoPairing.code, linked: false, waiting: false };
      publish("profile", demoProfile);
    },
    async updateAvatar(avatarData) {
      demoProfile = { ...demoProfile, avatarData: avatarData || null };
      if (demoProfile.coupleId && demoCouple.members[demoUser.uid]) {
        demoCouple.members[demoUser.uid] = {
          ...demoCouple.members[demoUser.uid],
          avatarData: avatarData || null,
        };
        publish("couple", demoCouple);
      }
      publish("profile", demoProfile);
      return { updated: true, customAvatar: Boolean(avatarData) };
    },
    async updatePulseBackground(imageData) {
      if (imageData) {
        demoCouple.shared.pulseBackground = {
          imageData,
          updatedAt: Date.now(),
          updatedBy: demoUser.uid,
        };
      } else {
        delete demoCouple.shared.pulseBackground;
      }
      publish("couple", demoCouple);
      return { updated: true, customBackground: Boolean(imageData) };
    },
    async ensureDailyEncouragement() {
      if (demoCouple.shared.dailyEncouragement?.current?.date !== date) {
        demoCouple.shared.dailyEncouragement = {
          current: {
            date,
            quoteId: `demo-${date}`,
            text: "Ngày mới đã đến; hai đứa cứ bình tĩnh, tử tế và luôn ở cùng một phía nhé.",
            assignedAt: Date.now(),
          },
          used: demoCouple.shared.dailyEncouragement?.used || {},
        };
        publish("couple", demoCouple);
      }
      return { encouragement: demoCouple.shared.dailyEncouragement.current };
    },
    async sendMessage({ text, kind = "message", stickerId = "" }) {
      const senderName = demoCouple.shared.nicknames?.[demoUser.uid] || demoUser.displayName;
      const message = {
        id: crypto.randomUUID(),
        senderId: demoUser.uid,
        senderName,
        text,
        kind,
        ...(stickerId ? { stickerId } : {}),
        createdAt: Date.now(),
      };
      demoMessages = [...demoMessages, message];
      publish("messages", demoMessages);
      return { message };
    },
    async sendActivity({ text, type }) {
      const createdAt = Date.now();
      const id = crypto.randomUUID();
      const actorName = demoCouple.shared.nicknames?.[demoUser.uid] || demoUser.displayName;
      const activity = {
        id,
        actorId: demoUser.uid,
        actorName,
        text,
        type,
        kind: "activity",
        createdAt,
        expiresAt: createdAt + ACTIVITY_TTL_MS,
      };
      demoCouple.activities ||= {};
      demoCouple.activities[id] = activity;
      publish("couple", demoCouple);
      return { activity };
    },
    async deleteExpiredActivities(activityIds) {
      const currentTime = Date.now();
      let deleted = 0;
      for (const id of activityIds || []) {
        if (Number(demoCouple.activities?.[id]?.expiresAt) <= currentTime) {
          delete demoCouple.activities[id];
          deleted += 1;
        }
      }
      if (deleted) publish("couple", demoCouple);
      return { deleted };
    },
    notificationCapability: async () => ({ supported: true, permission: "default", registered: false }),
    enableNotifications: async () => ({ supported: true, permission: "granted", registered: true }),
    restoreNotifications: async () => ({ supported: true, permission: "default", registered: false }),
    async signOut() {
      demoAuthUser = null;
      publish("auth", demoAuthUser);
      await new Promise((resolve) => setTimeout(resolve, 80));
    },
    todayKey: () => date,
  };
}
