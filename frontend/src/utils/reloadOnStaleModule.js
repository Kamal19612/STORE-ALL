const RELOAD_KEY = "chunk_reload_at";
const RELOAD_COOLDOWN_MS = 15000;

/** Erreurs Vite : chunk obsolète, dep pré-bundlée invalidée (504 Outdated Optimize Dep), etc. */
export function isStaleModuleError(err) {
  const msg = String(err?.message || err || "");
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("Failed to load module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("is not a valid JavaScript MIME type") ||
    msg.includes("dynamically imported module") ||
    msg.includes("Outdated Optimize Dep")
  );
}

/**
 * Recharge la page une fois si un module JS est obsolète (ex. après redémarrage Vite).
 * @returns {boolean} true si un reload a été déclenché
 */
export function reloadIfStaleModuleError(err) {
  if (typeof window === "undefined" || !isStaleModuleError(err)) {
    return false;
  }
  const lastReload = parseInt(localStorage.getItem(RELOAD_KEY) || "0", 10);
  if (Date.now() - lastReload <= RELOAD_COOLDOWN_MS) {
    return false;
  }
  localStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
  return true;
}
