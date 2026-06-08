import { useState, useCallback, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { Menu, Bell, BellOff } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useNotifications } from "../hooks/useNotifications";
import { requestNotificationPermission } from "../hooks/useBrowserNotifications";
import { subscribeToPush } from "../hooks/usePushSubscription";

/**
 * Composant de layout pour les pages admin
 * Sidebar statique sur Desktop, Tiroir sur Mobile
 */
const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  // État de la permission notifications (default | granted | denied | unsupported)
  const [notifPermission, setNotifPermission] = useState(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") subscribeToPush(useAuthStore.getState().token);
  };

  // Auto-demande de permission au montage + souscription push
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

  // Notifications temps réel : toast + notif système à chaque nouvelle commande
  useNotifications("admin");

  if (user?.role === "SUPER_ADMIN") {
    const p = location.pathname;
    if (p === "/admin" || p === "/admin/dashboard") {
      return <Navigate to="/admin/super/orders" replace />;
    }
    const managerOnlyIndex = ["/admin/orders", "/admin/products", "/admin/slider", "/admin/settings"];
    if (managerOnlyIndex.includes(p)) {
      return <Navigate to="/admin/super/orders" replace />;
    }
  }

  return (
    <div className="h-dvh w-full flex bg-gray-50 dark:bg-[#1c191a] relative">
      {/* Background Pattern - Desktop only for performance */}
      <div className="hidden lg:block fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[80px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      <Sidebar
        user={user}
        logout={handleLogout}
        isMobileOpen={isSidebarOpen}
        onMobileClose={closeSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 overflow-hidden">
        {/* Header - Optimized for mobile (no backdrop-blur on small screens) */}
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
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block whitespace-nowrap">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>

              {/* Bouton activation notifications système */}
              {notifPermission === "default" && (
                <button
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
                <span title="Notifications bloquées — autorisez dans les réglages du navigateur" className="flex items-center gap-1 text-xs text-gray-400 cursor-help">
                  <BellOff className="h-3.5 w-3.5" />
                </span>
              )}
              {notifPermission === "unsupported" && (
                <span title="Sur iPhone : ajoutez l'app à l'écran d'accueil pour recevoir les alertes" className="flex items-center gap-1 text-xs text-gray-400 cursor-help">
                  <BellOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Alertes non dispo</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable Area */}
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
