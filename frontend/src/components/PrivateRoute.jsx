import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { managerDashboardPath } from "../utils/managerPaths";

/**
 * Composant de protection des routes admin
 * Redirige vers /login si l'utilisateur n'est pas authentifié
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Composants enfants à protéger
 * @param {string[]} props.allowedRoles - Rôles autorisés (optionnel)
 */
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [hydrated, setHydrated] = useState(
    () => useAuthStore.persist?.hasHydrated?.() ?? true
  );

  useEffect(() => {
    if (!hydrated) {
      const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
      return unsub;
    }
  }, [hydrated]);

  // Attendre que Zustand ait lu le localStorage avant de décider
  if (!hydrated) {
    return null;
  }

  if (!isAuthenticated) {
    // Rediriger vers login en conservant la destination souhaitée
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Vérifier les rôles si spécifiés
  if (allowedRoles.length > 0) {
    // Si le rôle n'est pas chargé, on refuse l'accès (évite un bypass silencieux).
    if (!user?.role) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
      if (user.role === "MANAGER") {
        const dest = managerDashboardPath(user);
        if (dest) return <Navigate to={dest} replace />;
        return <Navigate to="/login" replace />;
      }
      if (user.role === "SUPER_ADMIN") {
        return <Navigate to="/admin/super/orders" replace />;
      }
      if (user.role === "DELIVERY_AGENT") {
        return <Navigate to="/delivery/dashboard" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
