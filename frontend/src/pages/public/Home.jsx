import { useState, useEffect, useMemo } from "react";
import Slider from "../../components/public/Slider";
import ProductCarouselStrip from "../../components/public/ProductCarouselStrip";
import CategoryBar from "../../components/product/CategoryBar";
import CatalogFilterSidebar from "../../components/storefront/CatalogFilterSidebar";
import CatalogProductGrid from "../../components/storefront/CatalogProductGrid";
import { buildCatalogGridProducts } from "../../utils/catalogFilters";
import { BRAND_NAME } from "../../config/branding";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import { useStorefrontCatalog } from "../../hooks/useStorefrontCatalog";

const Home = () => {
  const { displayName } = useStorefrontBranding();
  const { storeCode, products, topProducts, categories, loading, error } = useStorefrontCatalog();
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const gridProducts = useMemo(
    () => buildCatalogGridProducts(products, selectedCategory, showAvailableOnly),
    [products, selectedCategory, showAvailableOnly],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500 font-medium">
          {displayName || BRAND_NAME} charge votre catalogue...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-red-500 font-bold text-xl">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-4 pb-10">
      <Slider key={storeCode} className="mb-4" />

      <div className="mb-2 lg:hidden">
        <CategoryBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categories={categories}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {!isMobile && (
          <CatalogFilterSidebar
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            categories={categories}
            showAvailableOnly={showAvailableOnly}
            onShowAvailableOnlyChange={setShowAvailableOnly}
            productCount={gridProducts.length}
          />
        )}

        <div className="lg:col-span-3">
          <ProductCarouselStrip products={topProducts.length > 0 ? topProducts : products} />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-secondary tracking-tight first-letter:uppercase lowercase">
                {selectedCategory === "Tous" || !selectedCategory
                  ? "Nos Produits"
                  : String(selectedCategory).toLowerCase()}
              </h1>
              <p className="text-gray-500 mt-1">
                {selectedCategory === "Tous" || !selectedCategory
                  ? "Découvrez notre sélection sucrée"
                  : `Découvrez nos produits ${selectedCategory}`}
              </p>
            </div>
          </div>

          <CatalogProductGrid
            products={gridProducts}
            onResetFilters={() => {
              setSelectedCategory("Tous");
              setShowAvailableOnly(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
