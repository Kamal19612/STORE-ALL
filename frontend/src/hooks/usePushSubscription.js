/**
 * Gestion de la souscription Web Push (VAPID).
 * Après permission accordée, subscribe le navigateur aux push notifications
 * et envoie la subscription au backend pour stockage.
 */

import { getExplicitStoreCode } from "../services/store/storeContext";

const VAPID_PUBLIC_KEY = "BFgwMeEPKmjceqgeKQqezk_yyf_FLa7LTW7eul_0HnSMfPfPFnKwH-fSGjxCUU5cmiCAdIvqlTJkSGUBkhPgFCw";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Souscrit aux push notifications et envoie la subscription au backend.
 * À appeler après que Notification.permission === "granted".
 */
export async function subscribeToPush(token) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Vérifie si déjà souscrit
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Envoie la subscription au backend
    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    const storeCode = getExplicitStoreCode();
    await fetch(`${baseUrl}/notifications/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(storeCode ? { "X-Store-Code": storeCode } : {}),
      },
      body: JSON.stringify(subscription),
    });
  } catch (err) {
    console.warn("[Push] Échec souscription:", err);
  }
}