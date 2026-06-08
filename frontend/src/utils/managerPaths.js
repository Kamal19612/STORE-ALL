/**
 * Préfixe URL `/manager/{code}` pour un compte manager (code boutique serveur).
 * @returns {string | null}
 */
export function managerPathPrefix(user) {
  if (!user?.storeCode || String(user.storeCode).trim() === "") return null;
  return `/manager/${encodeURIComponent(String(user.storeCode).trim())}`;
}

/** Page d’accueil après login manager. */
export function managerDashboardPath(user) {
  const p = managerPathPrefix(user);
  return p ? `${p}/dashboard` : null;
}
