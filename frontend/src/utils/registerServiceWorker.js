/** Évite les doubles enregistrements (React StrictMode en dev). */
let registerPromise = null;

/**
 * Enregistre le service worker push/PWA en production uniquement.
 * En dev Vite (ex. store.socialracine.com → :5176), l'enregistrement est ignoré :
 * HMR + double mount provoquent souvent un AbortError sans bénéfice réel.
 */
export function registerAppServiceWorker() {
  if (import.meta.env.DEV) return null;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (registerPromise) return registerPromise;

  registerPromise = navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .catch((err) => {
      registerPromise = null;
      if (err?.name === "AbortError") return null;
      console.warn("[SW] Échec enregistrement:", err);
      return null;
    });

  return registerPromise;
}
