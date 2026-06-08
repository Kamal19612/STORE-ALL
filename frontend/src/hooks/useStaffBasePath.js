import { useOutletContext } from "react-router-dom";

/**
 * Préfixe des routes staff : `/admin` (layout admin) ou `/manager/{code}` (layout manager).
 * Fourni par {@link ManagerLayout} via `<Outlet context={{ staffBase }} />`.
 */
export function useStaffBasePath() {
  const ctx = useOutletContext();
  const base = ctx?.staffBase;
  if (typeof base === "string" && base.length > 0) {
    return base.replace(/\/$/, "");
  }
  return "/admin";
}
