import { BRAND_LOGO_SRC } from "../config/branding";

/**
 * Gestion des notifications système (Web Notification API).
 * Utilise le Service Worker sur mobile (Android Chrome) et new Notification() sur desktop.
 * Le Service Worker est enregistré dans App.jsx.
 */

/** Demande la permission une seule fois et la retourne. */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

/**
 * Envoie une notification système si la permission est accordée.
 * Sur mobile, passe par le Service Worker (seul moyen supporté sur Android/Chrome).
 *
 * @param {string} title
 * @param {object} options  - body, icon, badge, tag, data, requireInteraction
 */
export async function sendBrowserNotification(title, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const defaults = {
    icon: BRAND_LOGO_SRC,
    badge: BRAND_LOGO_SRC,
    requireInteraction: false,
  };

  const notifOptions = { ...defaults, ...options };

  // Sur mobile, new Notification() n'est pas supporté — il faut le Service Worker
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, notifOptions);
      return;
    } catch (_) {
      // fallback vers new Notification() si le SW échoue
    }
  }

  // Desktop fallback
  const notif = new Notification(title, notifOptions);
  notif.onclick = () => {
    window.focus();
    notif.close();
  };
  return notif;
}
