import { CLASSIC_THEME_DEFAULT, getClassicTheme } from "../../../config/classicThemes";

/**
 * Options vitrine classique ({@code stores.vitrine_config}).
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function parseClassicVitrineConfig(raw) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const themeId =
    typeof cfg.themeId === "string" && cfg.themeId.trim() ? cfg.themeId.trim().toLowerCase() : CLASSIC_THEME_DEFAULT;
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
