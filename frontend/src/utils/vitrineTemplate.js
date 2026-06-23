import { VITRINE_TEMPLATE_DEFAULT } from "../config/vitrineTemplates";

/** Modèle vitrine classique (slug {@code default}). */
export function isClassicVitrineTemplate(template) {
  const slug = String(template || VITRINE_TEMPLATE_DEFAULT).trim().toLowerCase();
  return slug === "default" || slug === "classic";
}

/** Pages panier / commande / paiement avec styles vitrine dédiés. */
export function isCheckoutThemedVitrine(template) {
  const slug = String(template || VITRINE_TEMPLATE_DEFAULT).trim().toLowerCase();
  return isClassicVitrineTemplate(slug) || slug === "alibaba" || slug === "brandsama";
}
