import { useMemo } from "react";
import { useParams } from "react-router-dom";

const DEFAULT_CODE = (import.meta.env.VITE_STORE_CODE || "spirit").trim().toLowerCase();

/**
 * URLs vitrine préfixées par {@code /:storeCode} (catalogue, checkout, …).
 */
export function useStorefrontHref() {
  const { storeCode } = useParams();

  return useMemo(() => {
    const code =
      typeof storeCode === "string" && storeCode.trim()
        ? storeCode.trim().toLowerCase()
        : DEFAULT_CODE;
    const base = `/${code}`;
    return {
      storeCode: code,
      base,
      /** Accueil boutique */
      home: base,
      /** Choix livraison / retrait avant checkout */
      fulfillment: `${base}/commande`,
      /** Page checkout (livraison) */
      checkout: `${base}/checkout`,
      /** Retour après paiement YengaPay */
      paymentReturn: `${base}/paiement/retour`,
      cart: `${base}/cart`,
      products: `${base}/products`,
    };
  }, [storeCode]);
}
