/**
 * Catalogue des modèles de vitrine (slug = {@code stores.vitrine_template}).
 * Ajouter une entrée ici + un composant dans {@code ../vitrines/registry.js} pour activer un nouveau layout.
 */
export const VITRINE_TEMPLATE_DEFAULT = "default";

/** @typedef {{ id: string, label: string, description: string, available: boolean }} VitrineTemplateOption */

/** @type {VitrineTemplateOption[]} */
export const VITRINE_TEMPLATES = [
  {
    id: "default",
    label: "Classique",
    description: "Grille produits, carrousel et filtres (affichage actuel).",
    available: true,
  },
  {
    id: "alibaba",
    label: "Marketplace (Alibaba)",
    description: "Style B2B : orange #FF6600, cartes à angles droits, recherche et onglets catégories.",
    available: true,
  },
  {
    id: "brandsama",
    label: "Brandsama",
    description: "E-commerce moderne : bleu #5861F2, hero cyan, sidebar catégories et grille produits.",
    available: true,
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Liste épurée — à brancher dans vitrines/minimal.",
    available: false,
  },
  {
    id: "list",
    label: "Liste",
    description: "Catalogue en liste — à brancher dans vitrines/list.",
    available: false,
  },
];

export function getVitrineTemplateOption(id) {
  const slug = (id && String(id).trim().toLowerCase()) || VITRINE_TEMPLATE_DEFAULT;
  return VITRINE_TEMPLATES.find((t) => t.id === slug) ?? VITRINE_TEMPLATES[0];
}

export function getSelectableVitrineTemplates() {
  return VITRINE_TEMPLATES.filter((t) => t.available);
}
