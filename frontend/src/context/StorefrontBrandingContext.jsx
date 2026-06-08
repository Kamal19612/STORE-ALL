import { createContext, useContext, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getPublicStoreInfo } from "../services/api";
import { BRAND_NAME } from "../config/branding";
import { VITRINE_TEMPLATE_DEFAULT } from "../config/vitrineTemplates";
import { resolveManagerStoreLogoUrl } from "../utils/storeBranding";

const StorefrontBrandingContext = createContext(null);

/** Clé React Query pour invalider après mise à jour admin (même onglet vitrine). */
export const STOREFRONT_INFO_QUERY_KEY = "storefrontInfo";

/**
 * Config vitrine {@code /:storeCode} : branding + modèle d’affichage ({@code GET /api/store/info}).
 * Recharge à chaque navigation vitrine (pas de cache stale sur le modèle).
 */
export function StorefrontBrandingProvider({ children }) {
  const { storeCode } = useParams();
  const { pathname } = useLocation();
  const canonicalStore = storeCode ? String(storeCode).trim().toLowerCase() : "";

  const { data: info, isLoading, isFetching } = useQuery({
    queryKey: [STOREFRONT_INFO_QUERY_KEY, canonicalStore, pathname],
    enabled: Boolean(canonicalStore),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await getPublicStoreInfo();
      return data ?? null;
    },
  });

  const loading = !canonicalStore ? false : isLoading || (isFetching && !info);

  const value = useMemo(() => {
    const displayName = (info?.name && String(info.name).trim()) || BRAND_NAME;
    const logoSrc = resolveManagerStoreLogoUrl(info?.logoUrl);
    const rawTemplate = info?.vitrineTemplate;
    const vitrineTemplate =
      rawTemplate && String(rawTemplate).trim()
        ? String(rawTemplate).trim().toLowerCase()
        : VITRINE_TEMPLATE_DEFAULT;
    return {
      displayName,
      logoSrc,
      vitrineTemplate,
      vitrineConfig: info?.vitrineConfig ?? null,
      storeInfo: info,
      loading,
    };
  }, [info, loading]);

  return <StorefrontBrandingContext.Provider value={value}>{children}</StorefrontBrandingContext.Provider>;
}

export function useStorefrontBranding() {
  const ctx = useContext(StorefrontBrandingContext);
  if (!ctx) {
    return {
      displayName: BRAND_NAME,
      logoSrc: resolveManagerStoreLogoUrl(null),
      vitrineTemplate: VITRINE_TEMPLATE_DEFAULT,
      vitrineConfig: null,
      storeInfo: null,
      loading: false,
    };
  }
  return ctx;
}
