/** @param {string} hex #RRGGBB */
function darkenHex(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - percent / 100;
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 0xff) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 0xff) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 0xff) * f)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * @param {{ primaryColor?: string | null, heroCyan?: string | null }} config
 */
export function buildBrandsamaThemeStyle(config = {}) {
  const primary = config.primaryColor || "#5861F2";
  const cyan = config.heroCyan || "#1DD8D8";
  return {
    "--bs-primary": primary,
    "--bs-primary-hover": darkenHex(primary, 8),
    "--bs-primary-active": darkenHex(primary, 16),
    "--bs-hero-cyan": cyan,
    "--primary": primary,
    "--primary-dark": darkenHex(primary, 8),
  };
}
