import Home from "../pages/public/Home";
import AlibabaHome from "./alibaba/Home";
import BrandsamaHome from "./brandsama/Home";
import { VITRINE_TEMPLATE_DEFAULT } from "../config/vitrineTemplates";

/**
 * Registre des pages catalogue par slug vitrine.
 * Pour un nouveau modèle : créer vitrines/{slug}/Home.jsx puis l’enregistrer ici.
 */
export const VITRINE_REGISTRY = {
  default: Home,
  alibaba: AlibabaHome,
  brandsama: BrandsamaHome,
};

/**
 * @param {string | null | undefined} templateId
 * @returns {import('react').ComponentType}
 */
export function resolveVitrinePage(templateId) {
  const slug = (templateId && String(templateId).trim().toLowerCase()) || VITRINE_TEMPLATE_DEFAULT;
  return VITRINE_REGISTRY[slug] ?? VITRINE_REGISTRY[VITRINE_TEMPLATE_DEFAULT];
}
