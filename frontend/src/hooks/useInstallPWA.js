/**
 * Gestion de l'invite d'installation PWA (beforeinstallprompt).
 *
 * L'écouteur est enregistré immédiatement au chargement du module (top-level),
 * avant le montage de React, pour ne pas manquer l'événement.
 * Ce module est importé en eager dans App.jsx.
 */

let deferredPrompt = null;

// Enregistrement immédiat — s'exécute dès que le bundle est parsé
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Notifie les composants React déjà montés
    window.dispatchEvent(new CustomEvent("pwa:installable"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa:installed"));
  });
}

/** Déclenche la popup d'installation native du navigateur. */
export async function triggerInstallPrompt() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}

/** Retourne true si l'installation est disponible. */
export function isInstallAvailable() {
  return deferredPrompt !== null;
}
