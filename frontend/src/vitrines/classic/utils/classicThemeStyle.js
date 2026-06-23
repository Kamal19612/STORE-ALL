import { CLASSIC_THEME_DEFAULT, getClassicTheme } from "../../../config/classicThemes";

/** @param {string} hex #RRGGBB */
function darkenHex(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - percent / 100;
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 0xff) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 0xff) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 0xff) * f)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** @param {string} hex #RRGGBB */
function lightenHex(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const f = percent / 100;
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * f));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * f));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** @param {string} hex #RRGGBB @returns {string} "r, g, b" */
function hexToRgbTuple(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `${r}, ${g}, ${b}`;
}

function isValidHex(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

/**
 * @param {{ themeId?: string | null, primaryColor?: string | null, secondaryColor?: string | null }} config
 * @returns {Record<string, string>}
 */
export function buildClassicThemeStyle(config = {}) {
  const preset = getClassicTheme(config.themeId || CLASSIC_THEME_DEFAULT);
  const primary = isValidHex(config.primaryColor) ? config.primaryColor.trim() : preset.primaryColor;
  const secondary = isValidHex(config.secondaryColor) ? config.secondaryColor.trim() : preset.secondaryColor;
  const accentSoft =
    config.themeId && config.themeId !== "custom" && !config.primaryColor
      ? preset.accentSoft
      : lightenHex(primary, 88);

  return {
    "--primary": primary,
    "--primary-dark": darkenHex(primary, 10),
    "--secondary": secondary,
    "--secondary-light": lightenHex(secondary, 14),
    "--accent-soft": accentSoft,
    "--primary-rgb": hexToRgbTuple(primary),
  };
}
