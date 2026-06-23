import { CLASSIC_THEMES } from "../../config/classicThemes";

const inputClass =
  "w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c191a] px-3 py-2 text-sm text-gray-900 dark:text-white";

/**
 * Champs optionnels pour {@code vitrine_config} du modèle Classique.
 */
export default function VitrineClassicConfigFields({
  themeId,
  primaryColor,
  secondaryColor,
  onThemeIdChange,
  onPrimaryColorChange,
  onSecondaryColorChange,
}) {
  const showCustomColors = themeId === "custom";

  return (
    <div className="sm:col-span-2 min-w-0 rounded-lg border border-[#f5ad41]/30 bg-amber-50/50 dark:bg-[#f5ad41]/[0.06] p-3 sm:p-4 space-y-3">
      <p className="text-xs font-semibold text-[#d89a35] uppercase tracking-wide">Options vitrine Classique</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thème couleur</label>
        <select
          value={themeId}
          onChange={(e) => onThemeIdChange(e.target.value)}
          className={inputClass}
        >
          {CLASSIC_THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
          Aperçu :{" "}
          <span
            className="inline-block w-3 h-3 rounded-full align-middle border border-black/10"
            style={{ backgroundColor: primaryColor }}
            title="Couleur principale"
          />{" "}
          <span
            className="inline-block w-3 h-3 rounded-full align-middle border border-black/10"
            style={{ backgroundColor: secondaryColor }}
            title="Couleur secondaire"
          />
        </p>
      </div>

      {showCustomColors && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Couleur principale <span className="text-gray-400 font-normal">(#f5ad41)</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : "#f5ad41"}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded border border-gray-200 dark:border-white/10 bg-white p-0.5"
                title="Choisir la couleur"
              />
              <input
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                placeholder="#f5ad41"
                className={`${inputClass} font-mono flex-1`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Couleur secondaire <span className="text-gray-400 font-normal">(#242021)</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : "#242021"}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded border border-gray-200 dark:border-white/10 bg-white p-0.5"
                title="Choisir la couleur"
              />
              <input
                value={secondaryColor}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                placeholder="#242021"
                className={`${inputClass} font-mono flex-1`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
