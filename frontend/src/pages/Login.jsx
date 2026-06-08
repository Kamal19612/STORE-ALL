import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import useAuthStore from "../store/authStore";
import { AUTH_PERSIST_LOCALSTORAGE_KEY } from "../store/authStorageKey";
import authService from "../services/authService";
import { triggerInstallPrompt, isInstallAvailable } from "../hooks/useInstallPWA";
import LoginBrandHeader from "../components/LoginBrandHeader";
import { managerDashboardPath } from "../utils/managerPaths";

/** Connexion staff (super admin / manager / livreur). */
const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [installable, setInstallable] = useState(isInstallAvailable);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => setInstallable(false);
    window.addEventListener("pwa:installable", onInstallable);
    window.addEventListener("pwa:installed", onInstalled);
    return () => {
      window.removeEventListener("pwa:installable", onInstallable);
      window.removeEventListener("pwa:installed", onInstalled);
    };
  }, []);

  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();

  useLayoutEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.role === "MANAGER" && (!user.storeCode || String(user.storeCode).trim() === "")) {
      try {
        localStorage.removeItem(AUTH_PERSIST_LOCALSTORAGE_KEY);
      } catch {
        /* ignore */
      }
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
      toast.info("Session manager obsolète : reconnectez-vous.");
    }
    if (user.role === "DELIVERY_AGENT" && (!user.storeCode || String(user.storeCode).trim() === "")) {
      try {
        localStorage.removeItem(AUTH_PERSIST_LOCALSTORAGE_KEY);
      } catch {
        /* ignore */
      }
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
      toast.info("Session livreur obsolète : reconnectez-vous.");
    }
  }, [isAuthenticated, user]);

  // Redirect synchronously if already logged in (no useEffect = no double-navigate)
  if (isAuthenticated && user) {
    if (user.role === "DELIVERY_AGENT") {
      return <Navigate to="/delivery/dashboard" replace />;
    }
    if (user.role === "SUPER_ADMIN") {
      return <Navigate to="/admin/super/orders" replace />;
    }
    if (user.role === "MANAGER") {
      const dest = managerDashboardPath(user);
      if (dest) return <Navigate to={dest} replace />;
      return null;
    }
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsSubmitting(true);

    try {
      const authData = await authService.login(
        formData.username,
        formData.password,
      );

      login(authData);
      toast.success(`Bienvenue ${authData.username} !`);

      const role = useAuthStore.getState().user?.role;
      if (role === "DELIVERY_AGENT") navigate("/delivery/dashboard", { replace: true });
      else if (role === "SUPER_ADMIN") navigate("/admin/super/orders", { replace: true });
      else if (role === "MANAGER") {
        const u = useAuthStore.getState().user;
        const d = managerDashboardPath(u);
        if (d) navigate(d, { replace: true });
        else navigate("/login", { replace: true });
      } else navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.message || "Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Rendu : Formulaire de Connexion ---
  return (
    <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-yellow-50 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100">
          <LoginBrandHeader subtitle="Espace connexion personnel" />

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nom d'utilisateur
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                placeholder="admin@example.com"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-lg font-semibold text-gray-900 bg-amber-400 bg-gradient-to-r from-yellow-400 to-amber-500 hover:bg-amber-500 active:bg-amber-600 active:opacity-90 transition-colors duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {/* Structure DOM stable : les deux éléments toujours présents,
                  visibilité gérée par CSS — évite le crash removeChild
                  causé par les extensions navigateur (gestionnaires de mots de passe) */}
              <svg
                className={`h-5 w-5 text-gray-900 shrink-0 ${isSubmitting ? "animate-spin" : "hidden"}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{isSubmitting ? "Connexion en cours..." : "Se connecter"}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">Accès réservé au personnel</p>
          </div>

          {!isStandalone && (
            <div className="mt-4">
              {installable ? (
                <button
                  type="button"
                  onClick={triggerInstallPrompt}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors text-sm font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Installer l'application
                </button>
              ) : isIOS ? (
                <p className="text-center text-xs text-gray-400">
                  Pour installer : touchez <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>
                </p>
              ) : (
                <p className="text-center text-xs text-gray-400">
                  Pour installer : menu du navigateur <strong>⋮</strong> → <strong>Ajouter à l'écran d'accueil</strong>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          Connexion sécurisée par JWT
        </div>
      </div>
    </div>
  );
};

export default Login;
