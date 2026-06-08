/**
 * Variables CSS Alibaba dérivées de {@code vitrine_config.accentColor}.
 * @param {string | null | undefined} accentColor ex. "#2563eb"
 * @returns {Record<string, string> | undefined}
 */
export function buildAlibabaAccentCssVars(accentColor) {
  if (typeof accentColor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(accentColor.trim())) {
    return undefined;
  }
  const brand = accentColor.trim();
  const hover = darkenHex(brand, 10);
  const active = darkenHex(brand, 18);
  const rgb = hexToRgbTuple(brand);
  return {
    "--ali-brand": brand,
    "--ali-brand-hover": hover,
    "--ali-brand-active": active,
    "--ali-brand-bright": brand,
    "--primary": brand,
    "--primary-dark": hover,
    "--primary-rgb": rgb,
  };
}

/** @param {string} hex #RRGGBB @returns {string} "r, g, b" */
function hexToRgbTuple(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `${r}, ${g}, ${b}`;
}

/** @param {string} hex #RRGGBB */
function darkenHex(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - percent / 100;
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 0xff) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 0xff) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 0xff) * f)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
