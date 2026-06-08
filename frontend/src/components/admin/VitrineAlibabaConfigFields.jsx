const inputClass =
  "w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c191a] px-3 py-2 text-sm text-gray-900 dark:text-white";

/**
 * Champs optionnels pour {@code vitrine_config} du modèle Alibaba.
 */
export default function VitrineAlibabaConfigFields({
  heroTitle,
  heroSubtitle,
  accentColor,
  onHeroTitleChange,
  onHeroSubtitleChange,
  onAccentColorChange,
}) {
  return (
    <div className="sm:col-span-2 min-w-0 rounded-lg border border-[#FF6600]/30 bg-orange-50/50 dark:bg-[#FF6600]/[0.06] p-3 sm:p-4 space-y-3">
      <p className="text-xs font-semibold text-[#FF6600] uppercase tracking-wide">
        Options vitrine Marketplace (Alibaba)
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Titre hero <span className="text-gray-400 font-normal">(vide = nom boutique)</span>
        </label>
        <input
          value={heroTitle}
          onChange={(e) => onHeroTitleChange(e.target.value)}
          placeholder="Ex. Notre catalogue B2B"
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
          placeholder="Phrase d'accroche sous le titre"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Couleur accent <span className="text-gray-400 font-normal">(#FF6600 par défaut)</span>
        </label>
        <input
          value={accentColor}
          onChange={(e) => onAccentColorChange(e.target.value)}
          placeholder="#FF6600"
          className={`${inputClass} font-mono max-w-[140px]`}
        />
      </div>
    </div>
  );
}
