import { CLASSIC_THEME_DEFAULT, getClassicTheme } from "../config/classicThemes";

/**
 * Construit le JSON {@code vitrine_config} envoyé à l’API selon le modèle choisi.
 */
export function buildVitrineConfigForApi(templateId, fields = {}) {
  const slug = (templateId && String(templateId).trim().toLowerCase()) || "default";

  if (slug === "default") {
    const themeId = (fields.themeId && String(fields.themeId).trim().toLowerCase()) || CLASSIC_THEME_DEFAULT;
    const preset = getClassicTheme(themeId);
    const primaryRaw = fields.primaryColor?.trim();
    const secondaryRaw = fields.secondaryColor?.trim();
    const primary =
      primaryRaw && /^#[0-9A-Fa-f]{6}$/.test(primaryRaw) ? primaryRaw : preset.primaryColor;
    const secondary =
      secondaryRaw && /^#[0-9A-Fa-f]{6}$/.test(secondaryRaw) ? secondaryRaw : preset.secondaryColor;

    return {
      themeId,
      primaryColor: primary,
      secondaryColor: secondary,
    };
  }

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

export function readClassicFieldsFromStore(store) {
  const cfg = store?.vitrineConfig && typeof store.vitrineConfig === "object" ? store.vitrineConfig : {};
  const themeId =
    typeof cfg.themeId === "string" && cfg.themeId.trim()
      ? cfg.themeId.trim().toLowerCase()
      : CLASSIC_THEME_DEFAULT;
  const preset = getClassicTheme(themeId);
  return {
    themeId,
    primaryColor:
      typeof cfg.primaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(cfg.primaryColor.trim())
        ? cfg.primaryColor.trim()
        : preset.primaryColor,
    secondaryColor:
      typeof cfg.secondaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(cfg.secondaryColor.trim())
        ? cfg.secondaryColor.trim()
        : preset.secondaryColor,
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
