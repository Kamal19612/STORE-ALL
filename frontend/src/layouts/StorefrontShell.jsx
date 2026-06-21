import { useEffect, useLayoutEffect } from "react";
import { Outlet, useParams } from "react-router-dom";

import useCartStore from "../store/cartStore";
import usePdfFormModalStore from "../store/pdfFormModalStore";
import { setActiveStoreCode } from "../services/store/storeContext";
import ProductPdfFormModal from "../components/product/ProductPdfFormModal";
import ProductPdfFormErrorBoundary from "../components/product/ProductPdfFormErrorBoundary";

/**
 * Enveloppe des routes {@code /:storeCode/…} : tenant localStorage + panier alignés sur l’URL.
 */
export default function StorefrontShell() {
  const { storeCode } = useParams();

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
