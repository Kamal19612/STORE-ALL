const inputClass =
  "w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c191a] px-3 py-2 text-sm text-gray-900 dark:text-white";

/**
 * Champs optionnels pour {@code vitrine_config} du modèle Brandsama.
 */
export default function VitrineBrandsamaConfigFields({
  heroTitle,
  heroSubtitle,
  primaryColor,
  heroCyan,
  onHeroTitleChange,
  onHeroSubtitleChange,
  onPrimaryColorChange,
  onHeroCyanChange,
}) {
  return (
    <div className="sm:col-span-2 min-w-0 rounded-lg border border-[#5861F2]/30 bg-indigo-50/50 dark:bg-[#5861F2]/[0.06] p-3 sm:p-4 space-y-3">
      <p className="text-xs font-semibold text-[#5861F2] uppercase tracking-wide">
        Options vitrine Brandsama
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Titre hero <span className="text-gray-400 font-normal">(vide = nom boutique)</span>
        </label>
        <input
          value={heroTitle}
          onChange={(e) => onHeroTitleChange(e.target.value)}
          placeholder="Ex. Découvrez notre sélection"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sous-titre hero
        </label>
        <input
          value={heroSubtitle}
          onChange={(e) => onHeroSubtitleChange(e.target.value)}
          placeholder="Phrase d'accroche"
          className={inputClass}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bleu principal <span className="text-gray-400 font-normal">(#5861F2)</span>
          </label>
          <input
            value={primaryColor}
            onChange={(e) => onPrimaryColorChange(e.target.value)}
            placeholder="#5861F2"
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cyan hero <span className="text-gray-400 font-normal">(#1DD8D8)</span>
          </label>
          <input
            value={heroCyan}
            onChange={(e) => onHeroCyanChange(e.target.value)}
            placeholder="#1DD8D8"
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>
    </div>
  );
}
