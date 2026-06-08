/**
 * Construit le JSON {@code vitrine_config} envoyé à l’API selon le modèle choisi.
 */
export function buildVitrineConfigForApi(templateId, fields = {}) {
  const slug = (templateId && String(templateId).trim().toLowerCase()) || "default";
  if (slug !== "alibaba" && slug !== "brandsama") {
    return undefined;
  }

  const cfg = {};
  if (fields.heroTitle?.trim()) cfg.heroTitle = fields.heroTitle.trim();
  if (fields.heroSubtitle?.trim()) cfg.heroSubtitle = fields.heroSubtitle.trim();
  if (fields.showSearch === false) cfg.showSearch = false;
  if (fields.showFeaturedStrip === false) cfg.showFeaturedStrip = false;

  if (slug === "alibaba") {
    if (fields.accentColor?.trim() && /^#[0-9A-Fa-f]{6}$/.test(fields.accentColor.trim())) {
      cfg.accentColor = fields.accentColor.trim();
    }
  }

  if (slug === "brandsama") {
    const primary = fields.primaryColor?.trim() || fields.accentColor?.trim();
    if (primary && /^#[0-9A-Fa-f]{6}$/.test(primary)) {
      cfg.primaryColor = primary;
    }
    if (fields.heroCyan?.trim() && /^#[0-9A-Fa-f]{6}$/.test(fields.heroCyan.trim())) {
      cfg.heroCyan = fields.heroCyan.trim();
    }
  }

  return Object.keys(cfg).length > 0 ? cfg : undefined;
}

export function readAlibabaFieldsFromStore(store) {
  const cfg = store?.vitrineConfig && typeof store.vitrineConfig === "object" ? store.vitrineConfig : {};
  return {
    heroTitle: typeof cfg.heroTitle === "string" ? cfg.heroTitle : "",
    heroSubtitle: typeof cfg.heroSubtitle === "string" ? cfg.heroSubtitle : "",
    showSearch: cfg.showSearch !== false,
    showFeaturedStrip: cfg.showFeaturedStrip !== false,
    accentColor: typeof cfg.accentColor === "string" ? cfg.accentColor : "",
  };
}

export function readBrandsamaFieldsFromStore(store) {
  const cfg = store?.vitrineConfig && typeof store.vitrineConfig === "object" ? store.vitrineConfig : {};
  return {
    heroTitle: typeof cfg.heroTitle === "string" ? cfg.heroTitle : "",
    heroSubtitle: typeof cfg.heroSubtitle === "string" ? cfg.heroSubtitle : "",
    showSearch: cfg.showSearch !== false,
    showFeaturedStrip: cfg.showFeaturedStrip !== false,
    primaryColor:
      typeof cfg.primaryColor === "string"
        ? cfg.primaryColor
        : typeof cfg.accentColor === "string"
          ? cfg.accentColor
          : "",
    heroCyan: typeof cfg.heroCyan === "string" ? cfg.heroCyan : "",
  };
}
