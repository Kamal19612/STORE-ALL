import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Suspense, lazy, useEffect, useLayoutEffect } from "react";

// Désactiver le scroll restoration natif du navigateur une seule fois au démarrage.
// Sans ça, le navigateur mobile restaure la position scrollée de l'URL précédente.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function scrollAllToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.querySelectorAll("main").forEach((el) => {
    el.scrollTop = 0;
  });
}

// Remonte en haut à chaque changement de route.
// 3 couches : useLayoutEffect (avant paint) + double RAF (après lazy render) + setTimeout 50ms (filet final).
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    scrollAllToTop();
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(scrollAllToTop)
    );
    const timer = setTimeout(scrollAllToTop, 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [pathname]);
  return null;
}

// Relance automatique si un chunk JS (hash Vite) n'est plus disponible après un déploiement
const lazyWithRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      const isChunkError =
        err?.name === "TypeError" ||
        err?.message?.includes("Failed to fetch") ||
        err?.message?.includes("is not a valid JavaScript MIME type") ||
        err?.message?.includes("Importing a module script failed");
      if (isChunkError) {
        const lastReload = parseInt(localStorage.getItem("chunk_reload_at") || "0");
        if (Date.now() - lastReload > 15000) {
          localStorage.setItem("chunk_reload_at", String(Date.now()));
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw err;
    })
  );
import "./hooks/useInstallPWA"; // import eager pour enregistrer beforeinstallprompt tôt

// Layouts (Eager load critical layouts)
import MainLayout from "./layouts/MainLayout";
import StorefrontShell from "./layouts/StorefrontShell";
import AdminLayout from "./layouts/AdminLayout";
import ManagerLayout from "./layouts/ManagerLayout";
import DeliveryLayout from "./layouts/DeliveryLayout";
import PrivateRoute from "./components/PrivateRoute";
import ManifestSwitcher from "./components/ManifestSwitcher";

// Components
// Pages - Code Splitting (Lazy Load)
const StorefrontVitrinePage = lazyWithRetry(() => import("./components/storefront/StorefrontVitrinePage"));
const Checkout = lazyWithRetry(() => import("./pages/public/Checkout"));
const Login = lazyWithRetry(() => import("./pages/Login"));

// Admin Pages
const AdminLogin = lazyWithRetry(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminProductList = lazyWithRetry(
  () => import("./pages/admin/products/AdminProductList"),
);
const AdminProductForm = lazyWithRetry(
  () => import("./pages/admin/products/AdminProductForm"),
);
const AdminOrderList = lazyWithRetry(
  () => import("./pages/admin/orders/AdminOrderList"),
);
const AdminOrderDetail = lazyWithRetry(
  () => import("./pages/admin/orders/AdminOrderDetail"),
);
const AdminSlider = lazyWithRetry(() => import("./pages/admin/slider/AdminSlider"));
const AdminUserList = lazyWithRetry(() => import("./pages/admin/users/AdminUserList"));
const AdminUserForm = lazyWithRetry(() => import("./pages/admin/users/AdminUserForm"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const OrdersDiagnostic = lazyWithRetry(() => import("./pages/admin/OrdersDiagnostic"));
const SuperAdminOrders = lazyWithRetry(() => import("./pages/admin/super/SuperAdminOrders"));
const SuperAdminProducts = lazyWithRetry(() => import("./pages/admin/super/SuperAdminProducts"));
const SuperAdminManagers = lazyWithRetry(() => import("./pages/admin/super/SuperAdminManagers"));
const SuperAdminStoreForm = lazyWithRetry(() => import("./pages/admin/super/SuperAdminStoreForm"));
const SuperAdminSettings = lazyWithRetry(() => import("./pages/admin/super/SuperAdminSettings"));

// Delivery Pages
const DeliveryDashboard = lazyWithRetry(
  () => import("./pages/delivery/DeliveryDashboard"),
);

// Fallback Loading Component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#1c191a]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f5ad41]"></div>
  </div>
);

import { ThemeProvider } from "./context/ThemeContext";

const DEFAULT_SHOP_CODE = (import.meta.env.VITE_STORE_CODE || "spirit").trim().toLowerCase();

/** Redirection /checkout → /{code}/checkout (mémoire vitrine si dispo). */
function RedirectLegacyCheckout() {
  let code = DEFAULT_SHOP_CODE;
  try {
    const stored = localStorage.getItem("active_store_code");
    if (stored && /^[a-z0-9_-]+$/i.test(stored.trim())) {
      code = stored.trim().toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return <Navigate to={`/${code}/checkout`} replace />;
}

function App() {
  useEffect(() => {
    // Enregistrement du Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[SW] Échec enregistrement:", err);
      });
    }
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <ManifestSwitcher />
      <ThemeProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to={`/${DEFAULT_SHOP_CODE}`} replace />} />

            {/* Route de connexion principale */}
            <Route path="/login" element={<Login />} />

            {/* Route de connexion admin (NON protégée) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Espace manager : URL par code boutique */}
            <Route
              path="/manager/:storeCode"
              element={
                <PrivateRoute allowedRoles={["MANAGER"]}>
                  <ManagerLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrderList />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="products" element={<AdminProductList />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/edit/:id" element={<AdminProductForm />} />
              <Route path="slider" element={<AdminSlider />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Routes Admin super (PROTÉGÉES) */}
            <Route
              path="/admin"
              element={
                <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                  <AdminLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />

              {/* Placeholders pour les futures pages admin */}
              <Route path="diagnostic" element={<OrdersDiagnostic />} />
              <Route path="orders" element={<AdminOrderList />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="products" element={<AdminProductList />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/edit/:id" element={<AdminProductForm />} />
              <Route path="slider" element={<AdminSlider />} />
              <Route
                path="users"
                element={
                  <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                    <AdminUserList />
                  </PrivateRoute>
                }
              />
              <Route
                path="users/new"
                element={
                  <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                    <AdminUserForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="users/edit/:id"
                element={
                  <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                    <AdminUserForm />
                  </PrivateRoute>
                }
              />
              <Route path="settings" element={<AdminSettings />} />

              <Route
                path="super/orders"
                element={
                  <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                    <SuperAdminOrders />
                  </PrivateRoute>
                }
              />
              <Route
                path="super/products"
                element={
                  <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                    <SuperAdminProducts />
                  </PrivateRoute>
                }
              />
              <Route
                path="super/managers"
                element={
                  <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                    <SuperAdminManagers />
                  </PrivateRoute>
                }
              />
              <Route
                path="super/store-new"
                element={
                  <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                    <SuperAdminStoreForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="super/settings"
                element={
                  <PrivateRoute allowedRoles={["SUPER_ADMIN"]}>
                    <SuperAdminSettings />
                  </PrivateRoute>
                }
              />
            </Route>

            {/* Routes Livreur (PROTÉGÉES) */}
            <Route
              path="/delivery"
              element={
                <PrivateRoute allowedRoles={["SUPER_ADMIN", "MANAGER", "DELIVERY_AGENT"]}>
                  <DeliveryLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<DeliveryDashboard />} />
              <Route path="dashboard" element={<DeliveryDashboard />} />
            </Route>

            {/* Liens historiques sans préfixe boutique (évite une page vide) */}
            <Route path="/checkout" element={<RedirectLegacyCheckout />} />

            {/* Vitrine publique par code boutique : /{code} (ex. /sucre, /sucre/checkout) — en dernier pour ne pas masquer /login, /admin, … */}
            <Route path="/:storeCode" element={<StorefrontShell />}>
              <Route element={<MainLayout />}>
                <Route index element={<StorefrontVitrinePage />} />
                <Route path="products" element={<StorefrontVitrinePage />} />
                <Route
                  path="about"
                  element={
                    <div className="p-20 text-center dark:text-white">
                      Page À Propos en construction
                    </div>
                  }
                />
                <Route
                  path="cart"
                  element={
                    <div className="p-20 text-center dark:text-white">
                      Page Panier en construction
                    </div>
                  }
                />
                <Route path="checkout" element={<Checkout />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>

        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          style={{ top: "70px", minWidth: "300px", maxWidth: "420px" }}
        />
      </ThemeProvider>
    </Router>
  );
}

export default App;
