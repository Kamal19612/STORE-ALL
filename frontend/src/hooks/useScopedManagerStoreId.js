import { useOutletContext } from "react-router-dom";
import useAuthStore from "../store/authStore";

/**
 * Identifiant boutique pour les appels /api/manager/{storeId}/…
 * Priorité : contexte ManagerLayout, puis session (JWT persisté).
 */
export function useScopedManagerStoreId() {
  const ctx = useOutletContext();
  const userStoreId = useAuthStore((s) => s.user?.storeId);
  const raw = ctx?.managerStoreId ?? userStoreId;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
