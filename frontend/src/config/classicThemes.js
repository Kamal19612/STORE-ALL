/** Thème par défaut du modèle vitrine classique (ambre / charbon). */
export const CLASSIC_THEME_DEFAULT = "amber";

/** @typedef {{ id: string, label: string, primaryColor: string, secondaryColor: string, accentSoft: string }} ClassicThemePreset */

/** @type {ClassicThemePreset[]} */
export const CLASSIC_THEMES = [
  {
    id: "amber",
    label: "Ambre (défaut)",
    primaryColor: "#f5ad41",
    secondaryColor: "#242021",
    accentSoft: "#fdf2e2",
  },
  {
    id: "ocean",
    label: "Océan",
    primaryColor: "#38bdf8",
    secondaryColor: "#0c4a6e",
    accentSoft: "#e0f2fe",
  },
  {
    id: "emerald",
    label: "Émeraude",
    primaryColor: "#34d399",
    secondaryColor: "#064e3b",
    accentSoft: "#d1fae5",
  },
  {
    id: "ruby",
    label: "Rubis",
    primaryColor: "#fb7185",
    secondaryColor: "#4c0519",
    accentSoft: "#ffe4e6",
  },
  {
    id: "violet",
    label: "Violet",
    primaryColor: "#a78bfa",
    secondaryColor: "#2e1065",
    accentSoft: "#ede9fe",
  },
  {
    id: "custom",
    label: "Personnalisé",
    primaryColor: "#f5ad41",
    secondaryColor: "#242021",
    accentSoft: "#fdf2e2",
  },
];

/**
 * @param {string | null | undefined} id
 * @returns {ClassicThemePreset}
 */
export function getClassicTheme(id) {
  const slug = (id && String(id).trim().toLowerCase()) || CLASSIC_THEME_DEFAULT;
  return CLASSIC_THEMES.find((t) => t.id === slug) ?? CLASSIC_THEMES[0];
}
