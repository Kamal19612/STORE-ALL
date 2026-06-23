import { useEffect, useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

import useCartStore from "../store/cartStore";
import usePdfFormModalStore from "../store/pdfFormModalStore";
import { setActiveStoreCode } from "../services/store/storeContext";
import {
  readYengapayCheckoutPending,
} from "../utils/pendingYengapayReturn";
import ProductPdfFormModal from "../components/product/ProductPdfFormModal";
import ProductPdfFormErrorBoundary from "../components/product/ProductPdfFormErrorBoundary";

/**
 * Enveloppe des routes {@code /:storeCode/…} : tenant localStorage + panier alignés sur l’URL.
 */
export default function StorefrontShell() {
  const { storeCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // YengaPay renvoie parfois vers l'accueil boutique au lieu de /paiement/whatsapp.
  useEffect(() => {
    if (!storeCode) return;
    const code = String(storeCode).trim().toLowerCase();
    const path = location.pathname.replace(/\/$/, "") || "/";
    if (path.includes("/paiement/")) return;

    const params = new URLSearchParams(location.search);
    const yengaId = params.get("yengapay_payment_id");
    const order = params.get("order");
    if (yengaId || order) {
      const qs = params.toString();
      navigate(`/${code}/paiement/whatsapp${qs ? `?${qs}` : ""}`, { replace: true });
      return;
    }

    const isStoreHome = path === `/${code}`;
    if (!isStoreHome) return;

    const pending = readYengapayCheckoutPending(code);
    if (!pending) return;

    navigate(
      `/${code}/paiement/whatsapp?order=${encodeURIComponent(pending.orderNumber)}`,
      { replace: true },
    );
  }, [location.pathname, location.search, storeCode, navigate]);

  // Avant les effets enfants (requêtes API) : même code que l’URL pour active_store_code / X-Store-Code.
  useLayoutEffect(() => {
    if (!storeCode) return;
    setActiveStoreCode(String(storeCode).trim().toLowerCase());
  }, [storeCode]);

  useEffect(() => {
    if (!storeCode) return;
    const canonical = String(storeCode).trim().toLowerCase();

    const key = `cart_${canonical}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const items = parsed?.state?.items ?? [];
        useCartStore.setState({ items, _hydrated: true });
      } else {
        useCartStore.setState({ items: [], _hydrated: true });
      }
    } catch {
      useCartStore.setState({ items: [], _hydrated: true });
    }
  }, [storeCode]);

  useEffect(() => {
    return () => {
      setActiveStoreCode(null);
    };
  }, []);

  return (
    <>
      <Outlet />
      <ProductPdfFormErrorBoundary
        fallback={(message) => {
          const close = usePdfFormModalStore.getState().close;
          return (
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md shadow-xl">
                <p className="text-red-700 text-sm mb-4">{message}</p>
                <button
                  type="button"
                  onClick={close}
                  className="w-full py-2 rounded-lg bg-gray-900 text-white font-bold text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          );
        }}
      >
        <ProductPdfFormModal />
      </ProductPdfFormErrorBoundary>
    </>
  );
}
