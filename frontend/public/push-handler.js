// push-handler.js — imported into Workbox SW via importScripts
// Handles Web Push when site not open + badge + click
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "Trend Tribe", body: data.body || "" };
  }
  const title = data.title || "Trend Tribe";
  const options = {
    body: data.body || data.message || "You have a new update",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    image: data.image,
    data: { url: data.url || data.link || "/", ...data.data },
    tag: data.tag || "trendtribe",
    renotify: !!data.renotify,
    requireInteraction: !!data.requireInteraction,
    actions: data.actions || [],
    vibrate: [100, 50, 100],
  };
  // App badge where supported
  if (data.badgeCount != null && "setAppBadge" in navigator) {
    // cannot call setAppBadge in SW directly on some browsers; use experimental API via navigator
    // Workaround: use self.registration; actual badge set via client message; simple fallback below
  }
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      if (data.badgeCount != null && self.navigator && "setAppBadge" in self.navigator) {
        return self.navigator.setAppBadge(data.badgeCount).catch(() => {});
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const action = event.action;
  let target = url;
  if (action && event.notification.data?.actionsTarget?.[action]) target = event.notification.data.actionsTarget[action];
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // focus existing client if open
      for (const client of allClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          await client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })()
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      // try to resubscribe with same VAPID key if subscription expired
      try {
        const reg = await self.registration.pushManager.getSubscription();
        if (!reg) return;
        // Notify server via fetch (client will also handle via periodic sync)
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reg),
        }).catch(() => {});
      } catch {}
    })()
  );
});
