import { Check } from "lucide-react";
import {
  getSelectableVitrineTemplates,
  VITRINE_TEMPLATES,
  VITRINE_TEMPLATE_DEFAULT,
} from "../../config/vitrineTemplates";
import VitrineTemplatePreviewPanel from "./VitrineTemplatePreviewPanel";

/**
 * Choix du modèle vitrine + aperçu latéral (page super-admin boutiques).
 */
export default function VitrineTemplatePicker({
  value,
  onChange,
  storeName = "",
  storeCode = "",
  logoUrl = null,
  heroTitle = "",
  heroSubtitle = "",
  accentColor = "",
  primaryColor = "",
  heroCyan = "",
  showComingSoon = false,
  /** @type {'side' | 'stacked'} */
  layout = "side",
  /** Si true : uniquement la liste des modèles (aperçu dans un panneau externe). */
  hidePreview = false,
}) {
  const current = value || VITRINE_TEMPLATE_DEFAULT;
  const templatesToList = showComingSoon ? VITRINE_TEMPLATES : getSelectableVitrineTemplates();

  const previewProps = {
    templateId: current,
    storeName,
    storeCode,
    logoUrl,
    heroTitle,
    heroSubtitle,
    accentColor,
    primaryColor,
    heroCyan,
  };

  const selectorBlock = (
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modèle de vitrine</p>
      <div className="flex flex-col gap-2">
        {templatesToList.map((t) => {
          const isSelected = current === t.id;
          const disabled = !t.available;
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(t.id)}
              className={`relative text-left rounded-xl border-2 px-4 py-3 transition-all w-full ${
                disabled
                  ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-white/10"
                  : isSelected
                    ? "border-[#f5ad41] ring-2 ring-[#f5ad41]/30 bg-[#f5ad41]/5 dark:bg-[#f5ad41]/10"
                    : "border-gray-200 dark:border-white/15 hover:border-[#f5ad41]/50 bg-white dark:bg-[#1c191a]"
              }`}
            >
              {isSelected && t.available && (
                <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#f5ad41] text-[#242021]">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              )}
              <p className="text-sm font-semibold text-gray-900 dark:text-white pr-8">{t.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.description}</p>
              {!t.available && (
                <span className="inline-block mt-2 text-[10px] font-medium uppercase text-gray-400">Bientôt</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (hidePreview) {
    return selectorBlock;
  }

  if (layout === "stacked") {
    return (
      <div className="space-y-4">
        {selectorBlock}
        <VitrineTemplatePreviewPanel {...previewProps} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] gap-4 lg:gap-6 items-start">
      {selectorBlock}
      <VitrineTemplatePreviewPanel
        {...previewProps}
        className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
      />
    </div>
  );
}

export { VitrineTemplatePreviewPanel };
