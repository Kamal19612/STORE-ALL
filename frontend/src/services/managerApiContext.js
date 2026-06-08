import useAuthStore from "../store/authStore";

/**
 * Préfixe API boutique pour les routes /api/manager/{storeId}/...
 * @param {number|string|undefined|null} storeIdOverride — ex. navigation depuis le dashboard super (state.route)
 */
export function getManagerApiPrefix(storeIdOverride) {
  const fromUser = useAuthStore.getState().user?.storeId;
  const raw = storeIdOverride ?? fromUser;
  if (raw == null || raw === "") {
    throw new Error("Identifiant boutique manquant pour l’API manager.");
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error("Identifiant boutique invalide.");
  }
  return `/manager/${n}`;
}
