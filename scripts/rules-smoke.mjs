import assert from "node:assert/strict";
import { createRequire } from "node:module";

const PROJECT_ID = "demo-heartsync";
const DATABASE_NAMESPACE = "demo-heartsync-default-rtdb";
const AUTH_ORIGIN = "http://127.0.0.1:9099";
const DATABASE_ORIGIN = "http://127.0.0.1:9000";

process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
process.env.GCLOUD_PROJECT = PROJECT_ID;

const require = createRequire(import.meta.url);
const coupleApi = require("../api/couple.js");
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = await import(
  "firebase-admin/app"
);
const { getDatabase: getAdminDatabase } = await import("firebase-admin/database");
const adminApp = initializeAdminApp(
  {
    projectId: PROJECT_ID,
    databaseURL: `${DATABASE_ORIGIN}?ns=${DATABASE_NAMESPACE}`,
  },
  "pairing-rules-smoke",
);
const adminDatabase = getAdminDatabase(adminApp);

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function createUser(label) {
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const response = await request(
    `${AUTH_ORIGIN}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `${label}-${suffix}@example.com`,
        password: "password123",
        returnSecureToken: true,
      }),
    },
  );

  assert.equal(response.status, 200, `Could not create ${label}: ${response.text}`);
  const account = JSON.parse(response.text);
  assert.ok(account.localId, `${label} has no UID`);
  assert.ok(account.idToken, `${label} has no ID token`);
  return { uid: account.localId, token: account.idToken };
}

function databaseUrl(path, token) {
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  const url = new URL(`${DATABASE_ORIGIN}/${normalizedPath}.json`);
  url.searchParams.set("ns", DATABASE_NAMESPACE);
  if (token) url.searchParams.set("auth", token);
  return url;
}

async function databaseRequest(method, path, { body, token, admin = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (admin) headers.authorization = "Bearer owner";

  return request(databaseUrl(path, token), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function assertAllowed(response, label) {
  assert.equal(response.status, 200, `${label}: ${response.status} ${response.text}`);
}

function assertDenied(response, label) {
  assert.ok(
    response.status === 401 || response.status === 403,
    `${label}: expected a permission error, got ${response.status} ${response.text}`,
  );
  assert.match(response.text, /permission denied/i, `${label}: missing permission error body`);
}

const first = await createUser("first");
const second = await createUser("second");
assert.notEqual(first.uid, second.uid, "The clients must represent different users");

const coupleId = `couple-${Date.now()}`;
const pairingUsers = [];
const pairingCodes = [];
let pairedCoupleId = null;

async function testMutualPairing() {
  const firstPairUser = await createUser("pair-one");
  const secondPairUser = await createUser("pair-two");
  pairingUsers.push(firstPairUser, secondPairUser);
  await adminDatabase.ref().update({
    [`users/${firstPairUser.uid}`]: {
      displayName: "Pair One",
      email: "pair-one@example.com",
    },
    [`users/${secondPairUser.uid}`]: {
      displayName: "Pair Two",
      email: "pair-two@example.com",
    },
  });

  const firstStatus = await coupleApi._test.pairingStatus(adminDatabase, firstPairUser.uid);
  const secondStatus = await coupleApi._test.pairingStatus(adminDatabase, secondPairUser.uid);
  pairingCodes.push(firstStatus.code, secondStatus.code);
  assert.match(firstStatus.code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.match(secondStatus.code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.notEqual(firstStatus.code, secondStatus.code, "Each account receives a unique code");

  const firstIntent = await coupleApi._test.submitPairCode(
    adminDatabase,
    firstPairUser.uid,
    { name: "Pair One", email: "pair-one@example.com" },
    secondStatus.code,
  );
  assert.equal(firstIntent.matched, false, "The first code entry must only create a pending intent");
  assert.equal(firstIntent.waiting, true);
  assert.equal(
    (await adminDatabase.ref(`users/${firstPairUser.uid}/coupleId`).get()).exists(),
    false,
    "One-sided pairing must not create a couple",
  );

  const mutualIntent = await coupleApi._test.submitPairCode(
    adminDatabase,
    secondPairUser.uid,
    { name: "Pair Two", email: "pair-two@example.com" },
    firstStatus.code,
  );
  assert.equal(mutualIntent.matched, true, "The reciprocal code entry completes pairing");
  pairedCoupleId = mutualIntent.coupleId;

  const [firstProfile, secondProfile, pairedCouple] = await Promise.all([
    adminDatabase.ref(`users/${firstPairUser.uid}`).get(),
    adminDatabase.ref(`users/${secondPairUser.uid}`).get(),
    adminDatabase.ref(`couples/${pairedCoupleId}`).get(),
  ]);
  assert.equal(firstProfile.val().coupleId, pairedCoupleId);
  assert.equal(secondProfile.val().coupleId, pairedCoupleId);
  assert.equal(Object.keys(pairedCouple.val().members).length, 2);
  assert.equal(pairedCouple.val().meta.pairingMethod, "mutual-code");
  assertAllowed(
    await databaseRequest("GET", `couples/${pairedCoupleId}`, { token: firstPairUser.token }),
    "A mutually paired account can read the shared space",
  );

  await coupleApi._test.leaveCouple(adminDatabase, firstPairUser.uid);
  const [firstAfterLeave, secondAfterLeave] = await Promise.all([
    adminDatabase.ref(`users/${firstPairUser.uid}/coupleId`).get(),
    adminDatabase.ref(`users/${secondPairUser.uid}/coupleId`).get(),
  ]);
  assert.equal(firstAfterLeave.exists(), false, "Leaving clears the first account link");
  assert.equal(secondAfterLeave.exists(), false, "Leaving clears the partner account link");
  assertDenied(
    await databaseRequest("GET", `couples/${pairedCoupleId}`, { token: secondPairUser.token }),
    "Leaving revokes shared-space access for both accounts",
  );
}

try {
  assertAllowed(
    await databaseRequest("PUT", `users/${first.uid}/displayName`, {
      token: first.token,
      body: "Nguoi thu nhat",
    }),
    "A user can write their own profile",
  );
  assertDenied(
    await databaseRequest("PUT", `users/${second.uid}/displayName`, {
      token: first.token,
      body: "Khong duoc phep",
    }),
    "A user must not write another profile",
  );
  assertDenied(
    await databaseRequest("PUT", `users/${first.uid}/pairCode`, {
      token: first.token,
      body: "FAKE-CODE",
    }),
    "A personal pair code must only be assigned by the trusted API",
  );
  assertDenied(
    await databaseRequest("GET", "pairCodes/TEST-CODE", { token: first.token }),
    "Clients must not query the personal code index",
  );
  assertDenied(
    await databaseRequest("PUT", `pairRequests/${first.uid}`, {
      token: first.token,
      body: { targetUid: second.uid, targetCode: "TEST-CODE" },
    }),
    "Clients must not forge mutual pairing requests",
  );

  assertAllowed(
    await databaseRequest("PATCH", "", {
      admin: true,
      body: {
        [`users/${first.uid}/coupleId`]: coupleId,
        [`couples/${coupleId}/meta`]: { createdAt: Date.now(), status: "active" },
        [`couples/${coupleId}/members/${first.uid}`]: {
          displayName: "Nguoi thu nhat",
          joinedAt: Date.now(),
        },
      },
    }),
    "The trusted backend can create a couple",
  );

  const memberRead = await databaseRequest("GET", `couples/${coupleId}`, {
    token: first.token,
  });
  assertAllowed(memberRead, "A member can read their couple");
  assert.ok(JSON.parse(memberRead.text).members[first.uid], "The member data is readable");
  assertDenied(
    await databaseRequest("GET", `couples/${coupleId}`, { token: second.token }),
    "A non-member must not read the couple",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/shared/nicknames/${second.uid}`, {
      token: first.token,
      body: "Nguoi ay",
    }),
    "A member cannot assign a nickname to an account outside the couple",
  );

  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/relationship`, {
      token: first.token,
      body: {
        startDate: "2024-01-15",
        updatedAt: Date.now(),
        updatedBy: first.uid,
      },
    }),
    "A member can save the relationship date",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/shared/relationship`, {
      token: second.token,
      body: {
        startDate: "2024-01-16",
        updatedAt: Date.now(),
        updatedBy: second.uid,
      },
    }),
    "A non-member must not change shared relationship data",
  );
  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/vault`, {
      token: first.token,
      body: {
        favoriteFoods: "Bun cha",
        favoriteDrinks: "Tra dao",
        favoriteFlowers: "Tulip",
        height: "160",
        weight: "48",
        chest: "82",
        waist: "64",
        notes: "Private couple notes",
        updatedAt: Date.now(),
        updatedBy: first.uid,
      },
    }),
    "A member can save the shared vault",
  );
  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/cycle`, {
      token: first.token,
      body: {
        length: 28,
        periodDays: { "2026-07-09": true, "2026-07-10": true },
        updatedAt: Date.now(),
        updatedBy: first.uid,
      },
    }),
    "A member can save valid cycle data",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/shared/cycle`, {
      token: first.token,
      body: {
        length: 120,
        periodDays: { "2026-07-11": true },
        updatedAt: Date.now(),
        updatedBy: first.uid,
      },
    }),
    "Invalid cycle lengths must be rejected",
  );
  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/events/test-event`, {
      token: first.token,
      body: {
        title: "Hen an toi",
        date: "2026-07-14",
        note: "Chon quan",
        createdAt: Date.now(),
        createdBy: first.uid,
      },
    }),
    "A member can add a valid calendar event",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/shared/events/forged-event`, {
      token: first.token,
      body: {
        title: "Forged author",
        date: "2026-07-14",
        note: "",
        createdAt: Date.now(),
        createdBy: second.uid,
      },
    }),
    "A member cannot forge the calendar event author",
  );

  assertAllowed(
    await databaseRequest("PATCH", "", {
      admin: true,
      body: {
        [`users/${second.uid}/coupleId`]: coupleId,
        [`couples/${coupleId}/members/${second.uid}`]: {
          displayName: "Nguoi thu hai",
          joinedAt: Date.now(),
        },
      },
    }),
    "The trusted backend can complete the second membership",
  );
  assertAllowed(
    await databaseRequest("PATCH", `couples/${coupleId}/shared/nicknames`, {
      token: first.token,
      body: {
        [first.uid]: "Minh",
        [second.uid]: "Be yeu",
      },
    }),
    "Either member can save both synchronized nicknames",
  );
  const nicknameRead = await databaseRequest("GET", `couples/${coupleId}/shared/nicknames`, {
    token: second.token,
  });
  assertAllowed(nicknameRead, "The partner can read synchronized nicknames");
  assert.equal(JSON.parse(nicknameRead.text)[first.uid], "Minh");
  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/nicknames/${first.uid}`, {
      token: second.token,
      body: "Nguoi thuong",
    }),
    "The partner can update either nickname",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/shared/nicknames/${first.uid}`, {
      token: second.token,
      body: "x".repeat(33),
    }),
    "Nicknames longer than 32 characters must be rejected",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/shared/nicknames/not-a-member`, {
      token: first.token,
      body: "Khong hop le",
    }),
    "Clients cannot create nickname entries for unknown members",
  );
  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/dailyQuestions/2026-07-11/${first.uid}`, {
      token: first.token,
      body: { text: "Cau tra loi cua toi", updatedAt: Date.now() },
    }),
    "A member can save their own daily answer",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/shared/dailyQuestions/2026-07-11/${second.uid}`, {
      token: first.token,
      body: { text: "Gia mao cau tra loi", updatedAt: Date.now() },
    }),
    "A member cannot answer the daily question for their partner",
  );
  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/dateIdeas/cute-idea`, {
      token: first.token,
      body: { text: "Di an kem", createdBy: first.uid, createdAt: Date.now() },
    }),
    "A member can add a date idea",
  );
  assertDenied(
    await databaseRequest("DELETE", `couples/${coupleId}/shared/dateIdeas/cute-idea`, {
      token: second.token,
    }),
    "A partner cannot delete an idea they did not create",
  );
  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/dateDraw`, {
      token: second.token,
      body: { ideaId: "cute-idea", drawnAt: Date.now(), drawnBy: second.uid },
    }),
    "Either member can draw an existing date idea",
  );
  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/shared/coupons/cute-coupon`, {
      token: first.token,
      body: {
        title: "Mot cai om",
        note: "Dung bat cu luc nao",
        status: "available",
        createdAt: Date.now(),
        createdBy: first.uid,
        assignedTo: second.uid,
        redeemedAt: 0,
        redeemedBy: "",
      },
    }),
    "A member can create a coupon for their partner",
  );
  assertDenied(
    await databaseRequest("PATCH", `couples/${coupleId}/shared/coupons/cute-coupon`, {
      token: first.token,
      body: { status: "redeemed", redeemedAt: Date.now(), redeemedBy: first.uid },
    }),
    "The coupon creator cannot redeem the partner's coupon",
  );
  assertAllowed(
    await databaseRequest("PATCH", `couples/${coupleId}/shared/coupons/cute-coupon`, {
      token: second.token,
      body: { status: "redeemed", redeemedAt: Date.now(), redeemedBy: second.uid },
    }),
    "The assigned partner can redeem the coupon",
  );

  assertAllowed(
    await databaseRequest("PUT", `couples/${coupleId}/checkins/2026-07-11/${first.uid}`, {
      token: first.token,
      body: {
        mood: "Binh yen",
        need: "Muon tro chuyen",
        note: "Mot ngay on",
        updatedAt: Date.now(),
      },
    }),
    "A member can write their own check-in",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/checkins/2026-07-11/${second.uid}`, {
      token: first.token,
      body: {
        mood: "Gia mao",
        need: "Khong duoc phep",
        note: "",
        updatedAt: Date.now(),
      },
    }),
    "A member must not write a partner check-in",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/messages/fake-message`, {
      token: first.token,
      body: { text: "Bypass API", senderId: first.uid, createdAt: Date.now() },
    }),
    "Client message writes must go through the verified API",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/activities/fake-activity`, {
      token: first.token,
      body: {
        actorId: first.uid,
        text: "Bypass activity API",
        type: "nudge-heart",
        createdAt: Date.now(),
        expiresAt: Date.now() + 86_400_000,
      },
    }),
    "Client activity writes must go through the verified API",
  );
  assertDenied(
    await databaseRequest("PUT", `couples/${coupleId}/members/${second.uid}`, {
      token: first.token,
      body: { displayName: "Tu them thanh vien", joinedAt: Date.now() },
    }),
    "Clients must not modify membership",
  );

  await testMutualPairing();

  console.log("Realtime Database rules and mutual pairing smoke tests passed");
} finally {
  await databaseRequest("DELETE", coupleId ? `couples/${coupleId}` : "", { admin: true });
  await databaseRequest("DELETE", `users/${first.uid}`, { admin: true });
  await databaseRequest("DELETE", `users/${second.uid}`, { admin: true });
  if (pairedCoupleId) await adminDatabase.ref(`couples/${pairedCoupleId}`).remove();
  await Promise.all([
    ...pairingUsers.map((user) => adminDatabase.ref(`users/${user.uid}`).remove()),
    ...pairingCodes.map((code) => adminDatabase.ref(`pairCodes/${code}`).remove()),
  ]);
  await deleteAdminApp(adminApp);
}
