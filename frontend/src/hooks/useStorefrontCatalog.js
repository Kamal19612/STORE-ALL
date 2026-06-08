import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import productService from "../services/productService";

/**
 * Catalogue public tenant (produits + top) pour les vitrines {@code /:storeCode}.
 */
export function useStorefrontCatalog() {
  const { storeCode } = useParams();
  const canonicalStore = storeCode ? String(storeCode).trim().toLowerCase() : "";

  const query = useQuery({
    queryKey: ["storefrontCatalog", canonicalStore],
    enabled: Boolean(canonicalStore),
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const [data, top] = await Promise.all([
        productService.getFullProductCatalog(),
        productService.getTopProducts(10),
      ]);
      const list = data.content || [];
      if (import.meta.env.DEV) {
        console.debug("[catalog public]", canonicalStore, "produits:", list.length);
      }
      return { products: list, topProducts: top || [] };
    },
  });

  const products = query.data?.products ?? [];
  const topProducts = query.data?.topProducts ?? [];

  const categories = useMemo(
    () => [...new Set(products.map((p) => (p.categoryName || "").trim()).filter(Boolean))],
    [products],
  );

  const error = query.isError
    ? "Impossible de charger les produits. Vérifiez que le backend est lancé."
    : null;

  return {
    storeCode: canonicalStore,
    products,
    topProducts,
    categories,
    loading: query.isLoading,
    error,
    refetch: query.refetch,
  };
}
