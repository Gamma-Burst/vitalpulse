const CACHE_NAME = "followeight-pwa-v1";
const STATIC_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "FolloWeight · Rappel Objectif",
    body: "Prenez 2 minutes pour votre santé aujourd'hui.",
    url: "/",
  };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [120, 60, 120],
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "VP_SCHEDULE_FASTING_ALERT") return;
  const delayMs = Number(data.delayMs);
  if (!Number.isFinite(delayMs) || delayMs <= 0 || delayMs > 2 * 3600 * 1000) return;

  if (self.__vpFastTimer) {
    clearTimeout(self.__vpFastTimer);
  }
  self.__vpFastTimer = setTimeout(() => {
    self.registration.showNotification(
      data.title || "FolloWeight · Cycle Jeûne & Repas",
      {
        body: data.body || "Votre fenêtre alimentaire vient de changer.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.key || "followeight-fast-transition",
        data: { url: "/" },
      }
    );
  }, delayMs);
});
