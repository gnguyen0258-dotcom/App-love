const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }
  return { projectId, clientEmail, privateKey };
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = readServiceAccount();
  return initializeApp({
    credential: cert(serviceAccount),
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      `https://${serviceAccount.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`,
  });
}

async function authenticateRequest(request) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    const error = new Error("Bạn cần đăng nhập lại.");
    error.statusCode = 401;
    throw error;
  }
  try {
    return await getAuth(getAdminApp()).verifyIdToken(token, true);
  } catch {
    const error = new Error("Phiên đăng nhập không còn hợp lệ.");
    error.statusCode = 401;
    throw error;
  }
}

function adminServices() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    database: getDatabase(app),
    messaging: getMessaging(app),
  };
}

async function enforceRateLimit(database, uid, action, intervalMs) {
  const now = Date.now();
  const rateRef = database.ref(`rateLimits/${uid}/${action}`);
  const result = await rateRef.transaction((lastValue) => {
    if (typeof lastValue === "number" && now - lastValue < intervalMs) return;
    return now;
  });
  if (!result.committed) {
    const error = new Error("Bạn thao tác hơi nhanh. Hãy thử lại sau một chút.");
    error.statusCode = 429;
    throw error;
  }
}

function sendJson(response, statusCode, body) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(statusCode).json(body);
}

function requirePost(request, response) {
  if (request.method === "POST") return true;
  response.setHeader("Allow", "POST");
  sendJson(response, 405, { error: "Phương thức không được hỗ trợ." });
  return false;
}

function handleApiError(response, error) {
  const statusCode = Number(error.statusCode) || 500;
  if (statusCode >= 500) console.error(error);
  sendJson(response, statusCode, {
    error: statusCode >= 500 ? "Máy chủ chưa thể hoàn tất thao tác." : error.message,
  });
}

module.exports = {
  adminServices,
  authenticateRequest,
  enforceRateLimit,
  handleApiError,
  requirePost,
  sendJson,
};
