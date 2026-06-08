/**
 * Options vitrine Brandsama ({@code stores.vitrine_config}).
 */
export function parseBrandsamaVitrineConfig(raw, branding = {}) {
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
        : "Découvrez nos produits — livraison simple et suivi de commande.",
    showSearch: cfg.showSearch !== false,
    showFeaturedStrip: false,
    primaryColor:
      typeof cfg.primaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(cfg.primaryColor.trim())
        ? cfg.primaryColor.trim()
        : typeof cfg.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(cfg.accentColor.trim())
          ? cfg.accentColor.trim()
          : null,
    heroCyan:
      typeof cfg.heroCyan === "string" && /^#[0-9A-Fa-f]{6}$/.test(cfg.heroCyan.trim())
        ? cfg.heroCyan.trim()
        : null,
  };
}
