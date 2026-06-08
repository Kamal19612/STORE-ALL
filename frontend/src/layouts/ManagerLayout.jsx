import { useState, useCallback, useEffect } from "react";
import { Outlet, useNavigate, useParams, Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { Menu, Bell, BellOff } from "lucide-react";
import ManagerSidebar from "../components/ManagerSidebar";
import { setActiveStoreCode } from "../services/store/storeContext";
import { useNotifications } from "../hooks/useNotifications";
import { requestNotificationPermission } from "../hooks/useBrowserNotifications";
import { subscribeToPush } from "../hooks/usePushSubscription";
import { getManagerStoreInfo } from "../services/api";
import { resolveManagerStoreLogoUrl } from "../utils/storeBranding";

/** Libellé si le nom boutique n’est pas encore résolu (on n’affiche jamais le code technique à la place du nom). */
const BOUTIQUE_NAME_PLACEHOLDER = "Boutique";

/**
 * Layout espace manager : même structure visuelle que l’admin, données filtrées par boutique (`/manager/:storeCode`).
 */
const ManagerLayout = () => {
  const navigate = useNavigate();
  const { storeCode: storeCodeParam } = useParams();
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const [notifPermission, setNotifPermission] = useState(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") subscribeToPush(useAuthStore.getState().token);
  };

  useEffect(() => {
    const init = async () => {
      let perm = notifPermission;
      if (perm === "default") {
        perm = await requestNotificationPermission();
        setNotifPermission(perm);
      }
      if (perm === "granted") {
        subscribeToPush(useAuthStore.getState().token);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useNotifications("admin");

  const paramDecoded =
    storeCodeParam != null ? decodeURIComponent(storeCodeParam).trim() : "";
  const canonical = (user?.storeCode ?? "").trim();
  const jwtStoreName = (user?.storeName && String(user.storeName).trim()) || "";

  /** Nom / logo depuis la table {@code stores} (GET /api/manager/{id}/store) — plus fiable que app_settings.store_name. */
  const [storeProfile, setStoreProfile] = useState(null);

  useEffect(() => {
    if (user?.role !== "MANAGER" || user.storeId == null) {
      setStoreProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getManagerStoreInfo(user.storeId);
        if (cancelled || !data) return;
        setStoreProfile({
          name: data.name != null ? String(data.name).trim() : "",
          logoUrl: data.logoUrl != null ? String(data.logoUrl).trim() : "",
        });
        const apiStoreId = data.id != null ? Number(data.id) : null;
        if (
          apiStoreId != null &&
          user.storeId != null &&
          Number(user.storeId) !== apiStoreId
        ) {
          useAuthStore.setState((state) => ({
            user: state.user
              ? { ...state.user, storeId: apiStoreId }
              : state.user,
          }));
        }
      } catch {
        if (!cancelled) setStoreProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.storeId]);

  useEffect(() => {
    if (user?.role === "MANAGER" && canonical) {
      setActiveStoreCode(canonical);
    }
  }, [user?.role, canonical]);

  if (!user) {
    return null;
  }

  if (user.role !== "MANAGER") {
    return <Navigate to="/admin/super/orders" replace />;
  }

  if (!canonical || user.storeId == null) {
    return <Navigate to="/login" replace />;
  }

  if (canonical.toLowerCase() !== paramDecoded.toLowerCase()) {
    return (
      <Navigate to={`/manager/${encodeURIComponent(canonical)}/dashboard`} replace />
    );
  }

  const staffBase = `/manager/${encodeURIComponent(canonical)}`;

  const profileName = storeProfile?.name?.trim() || "";
  const boutiqueDisplayName =
    profileName || jwtStoreName || BOUTIQUE_NAME_PLACEHOLDER;
  const boutiqueLogoSrc = resolveManagerStoreLogoUrl(
    storeProfile?.logoUrl || user?.storeLogoUrl,
  );

  return (
    <div className="h-dvh w-full flex bg-gray-50 dark:bg-[#1c191a] relative">
      <div className="hidden lg:block fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[80px]" />
      </div>

      <ManagerSidebar
        user={user}
        staffBase={staffBase}
        boutiqueName={boutiqueDisplayName}
        boutiqueLogoSrc={boutiqueLogoSrc}
        logout={handleLogout}
        isMobileOpen={isSidebarOpen}
        onMobileClose={closeSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 overflow-hidden">
        <header className="bg-white dark:bg-[#242021] lg:bg-white/80 lg:dark:bg-[#242021]/80 lg:backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-white/5 px-2 sm:px-4 lg:px-8 py-2 sm:py-3 lg:py-4 shrink-0 relative z-50">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 dark:text-white shrink-0 flex items-center justify-center"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
              </button>
              <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white truncate">
                Tableau de bord
              </h2>
              <span className="hidden sm:inline text-xs font-medium text-amber-700 dark:text-amber-400/90 truncate max-w-[140px] lg:max-w-[280px]">
                · {boutiqueDisplayName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block whitespace-nowrap">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>

              {notifPermission === "default" && (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  title="Activer les notifications"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-xs font-semibold"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Activer les alertes</span>
                </button>
              )}
              {notifPermission === "granted" && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <Bell className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Alertes actives</span>
                </span>
              )}
              {notifPermission === "denied" && (
                <span
                  title="Notifications bloquées — autorisez dans les réglages du navigateur"
                  className="flex items-center gap-1 text-xs text-gray-400 cursor-help"
                >
                  <BellOff className="h-3.5 w-3.5" />
                </span>
              )}
              {notifPermission === "unsupported" && (
                <span
                  title="Sur iPhone : ajoutez l'app à l'écran d'accueil pour recevoir les alertes"
                  className="flex items-center gap-1 text-xs text-gray-400 cursor-help"
                >
                  <BellOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Alertes non dispo</span>
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden scroll-smooth">
          <Outlet context={{ staffBase, managerStoreId: user.storeId }} />
        </main>
      </div>
    </div>
  );
};

export default ManagerLayout;
