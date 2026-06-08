import { useEffect, useLayoutEffect } from "react";
import { Outlet, useParams } from "react-router-dom";

import useCartStore from "../store/cartStore";
import { setActiveStoreCode } from "../services/store/storeContext";

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

  return <Outlet />;
}
