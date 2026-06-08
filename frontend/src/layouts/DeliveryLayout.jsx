import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { LogOut, Package, Bell, BellOff } from "lucide-react";
import useAuthStore from "../store/authStore";
import { useNotifications } from "../hooks/useNotifications";
import { requestNotificationPermission } from "../hooks/useBrowserNotifications";
import { subscribeToPush } from "../hooks/usePushSubscription";
import { BRAND_NAME, BRAND_LOGO_SRC } from "../config/branding";

const DeliveryLayout = () => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  // État de la permission notifications
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

  // Notifications temps réel : alerte sonore + toast + notif système à chaque nouvelle livraison
  useNotifications("delivery");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      {/* Header Mobile */}
      <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img
              src={BRAND_LOGO_SRC}
              alt={BRAND_NAME}
              className="h-8 w-auto bg-white rounded-md p-0.5"
            />
            <span className="font-bold text-lg">Espace Livreur</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs opacity-90">Bonjour, {user?.username}</span>

            {/* Bouton activation notifications */}
            {notifPermission === "default" && (
              <button
                onClick={handleEnableNotifications}
                title="Activer les notifications"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-semibold"
              >
                <Bell className="h-4 w-4" />
                <span>Alertes</span>
              </button>
            )}
            {notifPermission === "granted" && (
              <Bell className="h-4 w-4 text-white/80" title="Notifications actives" />
            )}
            {notifPermission === "denied" && (
              <BellOff className="h-4 w-4 text-white/40" title="Notifications bloquées — autorisez dans les réglages du navigateur" />
            )}
            {notifPermission === "unsupported" && (
              <span title="Sur iPhone : ajoutez l'app à l'écran d'accueil pour recevoir les alertes" className="flex items-center gap-1 text-white/40 text-xs cursor-help">
                <BellOff className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenu Principal */}
      <main className="p-4 max-w-md mx-auto">
        <Outlet />
      </main>

      {/* Barre de Navigation Mobile (Bottom) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link
          to="/delivery/dashboard"
          className="flex flex-col items-center gap-1 text-primary"
        >
          <Package className="h-6 w-6" />
          <span className="text-xs font-medium">Commandes</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="h-6 w-6" />
          <span className="text-xs font-medium">Déconnexion</span>
        </button>
      </nav>
    </div>
  );
};

export default DeliveryLayout;
