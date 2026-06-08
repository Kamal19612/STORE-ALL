import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import { resolveVitrinePage } from "../../vitrines/registry";

/**
 * Page catalogue publique : layout choisi via {@code store.vitrineTemplate} (GET /api/store/info).
 */
export default function StorefrontVitrinePage() {
  const { vitrineTemplate, loading } = useStorefrontBranding();

  if (loading) {
    return null;
  }

  const VitrinePage = resolveVitrinePage(vitrineTemplate);
  return <VitrinePage />;
}
