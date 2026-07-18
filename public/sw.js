/* Personal Development Hub — service worker (PWA + Web Push for iOS home screen). */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let title = "PD Hub";
  let body = "You have a new reminder.";
  let url = "/";
  let tag = "pd-hub";

  try {
    if (event.data) {
      const payload = event.data.json();
      if (typeof payload.title === "string" && payload.title.trim()) title = payload.title.trim();
      if (typeof payload.body === "string" && payload.body.trim()) body = payload.body.trim();
      if (typeof payload.url === "string" && payload.url.trim()) url = payload.url.trim();
      if (typeof payload.tag === "string" && payload.tag.trim()) tag = payload.tag.trim();
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) body = text;
    } catch {
      // keep defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
