const CACHE_NAME = "heartsync-shell-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith("/api/")) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/?view=chat", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ("navigate" in client) await client.navigate(targetUrl);
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDG0U1T339wFXipvDFH7JjC7q2NKvRdDnU",
  authDomain: "applove-d9878.firebaseapp.com",
  databaseURL: "https://applove-d9878-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "applove-d9878",
  storageBucket: "applove-d9878.firebasestorage.app",
  messagingSenderId: "869706177743",
  appId: "1:869706177743:web:1c9822d97249daa4926bba",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || "HeartSync";
  const options = {
    body: data.body || "Bạn có một lời nhắn mới.",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: data.messageId ? `heartsync-${data.messageId}` : "heartsync-message",
    renotify: true,
    data: { url: data.link || "/?view=chat" },
  };
  return self.registration.showNotification(title, options);
});
