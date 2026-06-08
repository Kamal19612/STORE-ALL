import { Monitor, Smartphone } from "lucide-react";
import { getVitrineTemplateOption, VITRINE_TEMPLATE_DEFAULT } from "../../config/vitrineTemplates";
import {
  AlibabaVitrineMockup,
  BrandsamaVitrineMockup,
  DefaultVitrineMockup,
  UnavailableVitrineMockup,
} from "./VitrineTemplatePreviewMockup";

/**
 * Aperçu visuel du modèle vitrine (panneau latéral admin).
 */
export default function VitrineTemplatePreviewPanel({
  templateId = VITRINE_TEMPLATE_DEFAULT,
  storeName = "",
  storeCode = "",
  logoUrl = null,
  heroTitle = "",
  heroSubtitle = "",
  accentColor = "",
  primaryColor = "",
  heroCyan = "",
  className = "",
}) {
  const current = templateId || VITRINE_TEMPLATE_DEFAULT;
  const option = getVitrineTemplateOption(current);
  const displayName = (storeName && String(storeName).trim()) || "Ma boutique";
  const previewHero = (heroTitle && String(heroTitle).trim()) || displayName;

  const renderMockup = (id, viewport) => {
    const isMobile = viewport === "mobile";
    const frameClass = isMobile ? "w-[130px] h-[232px]" : "w-full h-[200px] min-h-[200px]";
    const inner = (() => {
      if (id === "alibaba") {
        return (
          <AlibabaVitrineMockup
            storeName={displayName}
            logoUrl={logoUrl}
            heroTitle={previewHero}
            heroSubtitle={heroSubtitle}
            accentColor={accentColor}
          />
        );
      }
      if (id === "brandsama") {
        return (
          <BrandsamaVitrineMockup
            storeName={displayName}
            logoUrl={logoUrl}
            heroTitle={previewHero}
            heroSubtitle={heroSubtitle}
            primaryColor={primaryColor || accentColor}
            heroCyan={heroCyan}
          />
        );
      }
      if (id === "default") {
        return <DefaultVitrineMockup storeName={displayName} logoUrl={logoUrl} />;
      }
      return <UnavailableVitrineMockup label={getVitrineTemplateOption(id).label} />;
    })();

    return (
      <div
        className={`mx-auto overflow-hidden rounded-md border-2 border-gray-300 dark:border-white/20 bg-white shadow-inner ${frameClass}`}
      >
        {inner}
      </div>
    );
  };

  return (
    <aside
      className={`rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-black/25 overflow-hidden flex flex-col ${className}`}
      aria-label="Aperçu du modèle de vitrine"
    >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 shrink-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Aperçu du rendu</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
          {option.label} — {option.description}
        </p>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-3 min-h-0">
        <div className="rounded-lg border border-gray-300 dark:border-white/20 overflow-hidden bg-white shadow-md shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border-b border-gray-200 text-[9px] text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <Monitor className="h-3 w-3 ml-1 shrink-0" />
            <span className="font-mono truncate text-[9px]">
              /{(storeCode && String(storeCode).trim()) || "code"}
            </span>
          </div>
          {current === "default" || current === "alibaba" || current === "brandsama" ? (
            renderMockup(current, "desktop")
          ) : (
            <div className="h-[200px]">
              <UnavailableVitrineMockup label={option.label} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center shrink-0">
          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <Smartphone className="h-3 w-3" />
            Mobile
          </p>
          <div className="rounded-[1.1rem] border-[3px] border-gray-800 dark:border-gray-500 p-0.5 bg-gray-800 dark:bg-gray-600 shadow-lg">
            {renderMockup(current, "mobile")}
          </div>
        </div>

        <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 mt-auto pt-1">
          Aperçu indicatif — produits et logo réels après enregistrement.
        </p>
      </div>
    </aside>
  );
}
