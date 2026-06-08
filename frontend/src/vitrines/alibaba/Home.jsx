import { useMemo, useRef, useState } from "react";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import { useStorefrontCatalog } from "../../hooks/useStorefrontCatalog";
import { buildCatalogGridProducts } from "../../utils/catalogFilters";
import { filterProductsBySearch } from "../../utils/catalogSearch";
import CatalogProductGrid from "../../components/storefront/CatalogProductGrid";
import AlibabaSlider from "./components/AlibabaSlider";
import AlibabaFeaturedSlider from "./components/AlibabaFeaturedSlider";
import AlibabaSearchBar from "./components/AlibabaSearchBar";
import AlibabaCategoryTabs from "./components/AlibabaCategoryTabs";
import { parseAlibabaVitrineConfig } from "./utils/parseVitrineConfig";

export default function AlibabaHome() {
  const { displayName, storeInfo } = useStorefrontBranding();
  const config = useMemo(
    () => parseAlibabaVitrineConfig(storeInfo?.vitrineConfig, { displayName }),
    [storeInfo?.vitrineConfig, displayName],
  );

  const { storeCode, products, topProducts, categories, loading, error } = useStorefrontCatalog();
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  const filteredByCatalog = useMemo(
    () => buildCatalogGridProducts(products, selectedCategory, showAvailableOnly),
    [products, selectedCategory, showAvailableOnly],
  );

  const gridProducts = useMemo(
    () => filterProductsBySearch(filteredByCatalog, searchQuery),
    [filteredByCatalog, searchQuery],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div
          className="h-10 w-10 rounded-full border-2 border-[var(--ali-brand)] border-t-transparent animate-spin"
          aria-hidden
        />
        <p className="mt-4 text-sm text-[var(--ali-text-muted)]">Chargement du catalogue…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 px-4 max-w-lg mx-auto">
        <p className="text-[var(--ali-error)] font-semibold text-lg">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="ali-btn-primary mt-6">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="ali-storefront-page max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16">
      {(config.heroTitle || config.showSearch) && (
        <section className="ali-hero ali-section">
          {config.heroTitle ? (
            <h1 className="ali-hero__title">{config.heroTitle}</h1>
          ) : null}
          {config.heroSubtitle ? (
            <p className="ali-hero__subtitle">{config.heroSubtitle}</p>
          ) : null}
          {config.showSearch && (
            <AlibabaSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              inputRef={searchRef}
              className="max-w-2xl"
            />
          )}
        </section>
      )}

      <AlibabaSlider key={storeCode} className="ali-section" />

      <div className="ali-catalog-panel ali-section-stack">
        <div className="ali-section">
          <AlibabaCategoryTabs
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        {config.showFeaturedStrip && (
          <AlibabaFeaturedSlider
            className="ali-section"
            products={topProducts.length > 0 ? topProducts : products}
          />
        )}

        <div className="ali-catalog-head ali-section flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h1 className="ali-catalog-head__title text-3xl font-extrabold tracking-tight first-letter:uppercase lowercase">
              {selectedCategory === "Tous" || !selectedCategory
                ? "Nos Produits"
                : String(selectedCategory).toLowerCase()}
            </h1>
            <p className="mt-0.5 sm:mt-1 text-sm sm:text-base">
              {selectedCategory === "Tous" || !selectedCategory
                ? "Découvrez notre sélection sucrée"
                : `Découvrez nos produits ${selectedCategory}`}
              {searchQuery.trim() ? ` — « ${searchQuery.trim()} »` : ""}
              {gridProducts.length > 0 ? ` (${gridProducts.length})` : ""}
            </p>
          </div>
          <label className="ali-catalog-head__filter flex items-center gap-2 shrink-0 cursor-pointer group self-start sm:self-auto">
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-xs transition-colors whitespace-nowrap">
              Disponibles uniquement
            </span>
          </label>
        </div>

        <div className="ali-section">
          <CatalogProductGrid
            gridClassName="ali-catalog-product-grid catalog-product-grid grid grid-cols-2 lg:grid-cols-5 gap-4 w-full items-start"
            products={gridProducts}
            emptyMessage="Essayez de modifier vos filtres ou votre recherche"
            onResetFilters={() => {
              setSelectedCategory("Tous");
              setShowAvailableOnly(false);
              setSearchQuery("");
            }}
          />
        </div>
      </div>
    </div>
  );
}
