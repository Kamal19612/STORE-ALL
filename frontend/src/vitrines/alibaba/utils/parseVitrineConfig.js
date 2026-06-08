/**
 * Options affichage spécifiques au modèle vitrine (JSON {@code stores.vitrine_config}).
 * @param {Record<string, unknown> | null | undefined} raw
 * @param {{ displayName?: string }} branding
 */
export function parseAlibabaVitrineConfig(raw, branding = {}) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const displayName = branding.displayName || "Boutique";
  return {
    heroTitle:
      typeof cfg.heroTitle === "string" && cfg.heroTitle.trim()
        ? cfg.heroTitle.trim()
        : displayName,
    heroSubtitle:
      typeof cfg.heroSubtitle === "string" && cfg.heroSubtitle.trim()
        ? cfg.heroSubtitle.trim()
        : "Découvrez notre catalogue — commande simple et livraison suivie.",
    showSearch: cfg.showSearch !== false,
    showFeaturedStrip: cfg.showFeaturedStrip !== false,
    showCategorySidebar: cfg.showCategorySidebar === true,
    accentColor:
      typeof cfg.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(cfg.accentColor.trim())
        ? cfg.accentColor.trim()
        : null,
  };
}
