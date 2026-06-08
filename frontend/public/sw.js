// Service Worker — STORE (STORE-ALL)
// Gère les notifications push (background) et les clics sur notifications

self.addEventListener("install", (event) => {
  // Prend le contrôle immédiatement sans attendre le prochain rechargement
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Prend le contrôle de toutes les pages ouvertes immédiatement
  event.waitUntil(clients.claim());
});

// Réception d'une notification Web Push (arrière-plan)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "STORE", body: event.data.text() };
  }

  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "store-notif",
    requireInteraction: true,
    data: payload.data || {},
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "STORE", options)
  );
});

// Clic sur une notification → focus sur l'onglet ou ouvre l'app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});