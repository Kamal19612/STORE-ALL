import { useMemo, useState } from "react";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import { useStorefrontCatalog } from "../../hooks/useStorefrontCatalog";
import { buildCatalogGridProducts } from "../../utils/catalogFilters";
import { filterProductsBySearch } from "../../utils/catalogSearch";
import CatalogProductGrid from "../../components/storefront/CatalogProductGrid";
import Slider from "../../components/public/Slider";
import { useBrandsamaCatalog } from "./BrandsamaCatalogContext";
import BrandsamaSearchBar from "./components/BrandsamaSearchBar";
import BrandsamaSidebar from "./components/BrandsamaSidebar";
import BrandsamaCategoryBar from "./components/BrandsamaCategoryBar";
import { parseBrandsamaVitrineConfig } from "./utils/parseVitrineConfig";

export default function BrandsamaHome() {
  const { displayName, storeInfo } = useStorefrontBranding();
  const config = useMemo(
    () => parseBrandsamaVitrineConfig(storeInfo?.vitrineConfig, { displayName }),
    [storeInfo?.vitrineConfig, displayName],
  );

  const { searchQuery, setSearchQuery } = useBrandsamaCatalog();
  const { storeCode, products, categories, loading, error } = useStorefrontCatalog();
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

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
          className="h-10 w-10 rounded-full border-2 border-[var(--bs-primary)] border-t-transparent animate-spin"
          aria-hidden
        />
        <p className="mt-4 text-sm text-[var(--bs-text-muted)]">Chargement du catalogue…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 px-4 max-w-lg mx-auto">
        <p className="text-[var(--bs-coral)] font-semibold text-lg">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="bs-btn-primary mt-6">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="bs-hero">
        <div className="bs-hero-slider">
          <Slider key={storeCode} className="bs-hero-carousel mb-0" />
        </div>
        <div className="bs-hero-overlay" aria-hidden />
        <div className="bs-hero-content">
          <h1 className="bs-hero-title">{config.heroTitle}</h1>
          <p className="bs-hero-subtitle">{config.heroSubtitle}</p>
        </div>
      </section>

      <div className="bs-layout">
        <BrandsamaSidebar
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <div className="bs-main bs-catalog-panel">
          {config.showSearch && (
            <div className="md:hidden mb-4">
              <BrandsamaSearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
          )}

          <BrandsamaCategoryBar
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <div className="bs-catalog-head flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3 mb-6">
            <div className="min-w-0">
              <h2 className="bs-catalog-head__title text-3xl font-extrabold tracking-tight first-letter:uppercase lowercase">
                {selectedCategory === "Tous" || !selectedCategory
                  ? "Nos Produits"
                  : String(selectedCategory).toLowerCase()}
              </h2>
              <p className="mt-0.5 sm:mt-1 text-sm sm:text-base">
                {selectedCategory === "Tous" || !selectedCategory
                  ? "Découvrez notre sélection"
                  : `Découvrez nos produits ${selectedCategory}`}
                {searchQuery.trim() ? ` — « ${searchQuery.trim()} »` : ""}
                {gridProducts.length > 0 ? ` (${gridProducts.length})` : ""}
              </p>
            </div>
            <label className="bs-catalog-head__filter flex items-center gap-2 shrink-0 cursor-pointer group self-start sm:self-auto">
              <input
                type="checkbox"
                checked={showAvailableOnly}
                onChange={(e) => setShowAvailableOnly(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--bs-border)] text-[var(--bs-primary)]"
              />
              <span className="text-xs transition-colors whitespace-nowrap">
                Disponibles uniquement
              </span>
            </label>
          </div>

          <CatalogProductGrid
            gridClassName="bs-catalog-product-grid catalog-product-grid grid grid-cols-2 lg:grid-cols-5 gap-4 w-full items-start"
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
    </>
  );
}
