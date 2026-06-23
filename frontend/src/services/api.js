import axios from "axios";

import useAuthStore from "../store/authStore";
import { AUTH_PERSIST_LOCALSTORAGE_KEY } from "../store/authStorageKey";
import { getExplicitStoreCode } from "./store/storeContext";
import { getManagerApiPrefix } from "./managerApiContext";
import { withShopPrefix } from "./storefrontShopApiPrefix";

/**
 * Base des appels REST : préfixe `/api` côté Spring. Avec une URL absolue vers la racine du serveur
 * (ex. {@code http://127.0.0.1:8085}) sans segment {@code /api}, Axios concaténait {@code /super/...}
 * en {@code http://host:8085/super/...} → 404 « No static resource … ». On ajoute alors {@code /api}.
 */
function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || String(raw).trim() === "") {
    return "/api";
  }
  const t = String(raw).trim();
  if (t.startsWith("/")) {
    return t.replace(/\/$/, "") || "/api";
  }
  try {
    const u = new URL(t);
    const path = u.pathname.replace(/\/$/, "");
    if (path === "" || path === "/") {
      u.pathname = "/api";
      return u.toString().replace(/\/$/, "");
    }
    return t.replace(/\/$/, "");
  } catch {
    return t;
  }
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000, // 15s — évite les requêtes qui pendent indéfiniment sur réseau mobile
});

// Vitrine multi-boutiques : /api/shop/{code}/… (voir StorefrontShopPathRewriteFilter côté Spring)
api.interceptors.request.use((config) => {
  if (typeof config.url === "string" && config.url.startsWith("/")) {
    config.url = withShopPrefix(config.url);
  }
  return config;
});

// Intercepteur pour ajouter le token JWT si présent
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  const url = typeof config.url === "string" ? config.url : "";
  const isDeliveryUrl = url.includes("/delivery/");
  // Tenant manager/super : résolu par l’URL (/api/manager/{id}/…), pas par X-Store-Code
  const skipStoreHeader =
    url.includes("/manager/") ||
    url.includes("/super/") ||
    url.startsWith("/shop/");
  if (!skipStoreHeader && !isDeliveryUrl) {
    const storeCode = getExplicitStoreCode();
    if (storeCode) {
      config.headers["X-Store-Code"] = storeCode;
    } else {
      delete config.headers["X-Store-Code"];
    }
  } else if (isDeliveryUrl) {
    // Pool livraison global : ne pas filtrer par boutique (toutes les commandes).
    delete config.headers["X-Store-Code"];
  } else {
    delete config.headers["X-Store-Code"];
  }
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si le token est expiré ou invalide (401), déconnecter l'utilisateur
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      // Ne pas rediriger si déjà sur la page de login
      if (!currentPath.includes("/login")) {
        // Effacer le state directement sans rappeler l'API (évite la cascade 401)
        localStorage.removeItem(AUTH_PERSIST_LOCALSTORAGE_KEY);
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const getPublicSettings = () => api.get("/public/settings");
export const getPublicStoreInfo = () => api.get("/store/info");
export const getAdminSettings = (managerStoreId) =>
  api.get(`${getManagerApiPrefix(managerStoreId)}/settings`);
/** Fiche boutique (nom, logo, code) — table {@code stores}. */
export const getManagerStoreInfo = (managerStoreId) =>
  api.get(`${getManagerApiPrefix(managerStoreId)}/store`);
export const updateSettings = (settings, managerStoreId) =>
  api.put(`${getManagerApiPrefix(managerStoreId)}/settings`, settings);

export const resetStats = (managerStoreId) =>
  api.post(`${getManagerApiPrefix(managerStoreId)}/dashboard/reset-stats`);
export const syncProducts = (managerStoreId) =>
  api.post(`${getManagerApiPrefix(managerStoreId)}/products/google-sheets-sync`);
export const registerTelegramWebhook = (managerStoreId) =>
  api.post(`${getManagerApiPrefix(managerStoreId)}/telegram/webhook/register`);
export const getTelegramWebhookInfo = (managerStoreId) =>
  api.get(`${getManagerApiPrefix(managerStoreId)}/telegram/webhook/info`);
export const unregisterTelegramWebhook = (managerStoreId) =>
  api.post(`${getManagerApiPrefix(managerStoreId)}/telegram/webhook/unregister`);
export const sendTelegramTest = (text, managerStoreId) =>
  api.post(`${getManagerApiPrefix(managerStoreId)}/telegram/test`, { text });

export const getPaymentStatus = (orderNumber) =>
  api.get(`/public/payments/status/${encodeURIComponent(orderNumber)}`);

export const resolveYengapayReturn = (paymentId, status) =>
  api.get("/public/payments/yengapay/resolve", {
    params: {
      yengapay_payment_id: paymentId,
      ...(status ? { yengapay_status: status } : {}),
    },
  });

export default api;
