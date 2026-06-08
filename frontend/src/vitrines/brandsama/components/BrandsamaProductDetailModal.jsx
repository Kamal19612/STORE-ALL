import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import useCartStore from "../../../store/cartStore";
import { useStorefrontBranding } from "../../../context/StorefrontBrandingContext";
import ProductImageCarousel from "../../../components/product/ProductImageCarousel";
import { getProductCopySections } from "../../../utils/productCopy";
import { buildBrandsamaThemeStyle } from "../utils/brandsamaThemeStyle";
import { parseBrandsamaVitrineConfig } from "../utils/parseVitrineConfig";

export default function BrandsamaProductDetailModal({ product, onClose }) {
  const { displayName, vitrineConfig } = useStorefrontBranding();
  const themeStyle = useMemo(
    () =>
      buildBrandsamaThemeStyle(
        parseBrandsamaVitrineConfig(vitrineConfig, { displayName }),
      ),
    [vitrineConfig, displayName],
  );
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("bs-modal-open");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("bs-modal-open");
    };
  }, []);

  if (!product) return null;

  const isArchived = product.active === false;
  const stockNum = Number(product.stock) || 0;
  const purchaseAllowed = product.purchaseAllowed !== false;
  const isPurchasable =
    typeof product.available === "boolean"
      ? product.available
      : !isArchived && purchaseAllowed && stockNum > 0;
  const canPurchase = isPurchasable;
  const isRuptureOnly =
    !isArchived && purchaseAllowed && stockNum === 0 && !isPurchasable;
  const isInCart = items.some((item) => item.id === product.id);

  const formatPrice = (price) => {
    const n = price != null && price !== "" ? Number(price) : 0;
    const safe = Number.isFinite(n) ? n : 0;
    return `${String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!canPurchase) return;
    if (isInCart) {
      useCartStore.getState().removeItem(product.id);
    } else {
      addItem(product);
      toast.success("✓ Produit ajouté ! Vérifiez votre panier");
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const { catalogDescription, usageInstructions, showCatalog, showUsage } =
    getProductCopySections(product);

  const modal = (
    <div
      id="bs-details-modal"
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bs-product-detail-title"
    >
      <div
        className="vitrine-brandsama bs-details-panel bg-white w-full rounded-t-2xl sm:rounded-lg sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-xl"
        style={themeStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" aria-hidden />
        </div>

        <div className="flex justify-between items-start px-4 sm:px-6 pt-2 sm:pt-6 pb-3 shrink-0">
          <h2
            id="bs-product-detail-title"
            className="text-lg sm:text-2xl font-bold pr-4 leading-tight"
            style={{ color: "var(--secondary)" }}
          >
            {product.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 shrink-0 p-1"
            aria-label="Fermer"
          >
            <i className="fas fa-times text-xl" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-4 sm:px-6 pb-6">
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <ProductImageCarousel
                key={product.id}
                mainImage={product.mainImage}
                secondaryImages={product.secondaryImages}
                alt={product.name}
              />
              <div className="mt-3">
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: "rgba(88, 97, 242, 0.15)",
                    color: "var(--primary)",
                  }}
                >
                  {product.categoryName || "Catégorie"}
                </span>
              </div>
            </div>

            <div>
              {showCatalog ? (
                <div className="mb-3">
                  <h3
                    className="font-bold mb-1 text-sm sm:text-base"
                    style={{ color: "var(--secondary)" }}
                  >
                    Description
                  </h3>
                  <p className="text-gray-700 text-sm first-letter:uppercase lowercase leading-snug">
                    {catalogDescription}
                  </p>
                </div>
              ) : null}

              {showUsage ? (
                <div className="mb-3">
                  <h3
                    className="font-bold mb-1 text-sm sm:text-base"
                    style={{ color: "var(--secondary)" }}
                  >
                    Mode d&apos;emploi
                  </h3>
                  <p className="text-gray-700 text-sm first-letter:uppercase lowercase leading-snug">
                    {usageInstructions}
                  </p>
                </div>
              ) : null}

              <div className="mb-3">
                <h3
                  className="font-bold mb-1 text-sm sm:text-base"
                  style={{ color: "var(--secondary)" }}
                >
                  Volume / Poids
                </h3>
                <p className="text-gray-700 text-sm first-letter:uppercase lowercase">
                  {product.volumeWeight || product.stock || "Non spécifié"}
                </p>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {stockNum === 0 && (
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded text-white"
                    style={{ backgroundColor: "var(--secondary)" }}
                  >
                    Rupture de stock
                  </span>
                )}
                {isArchived && (
                  <span className="text-xs font-semibold px-2 py-1 rounded text-white bg-gray-700">
                    Produit archivé
                  </span>
                )}
              </div>

              <div className="mb-4">
                <h3
                  className="font-bold mb-1 text-sm sm:text-base"
                  style={{ color: "var(--secondary)" }}
                >
                  Prix
                </h3>
                <p
                  className="text-2xl sm:text-3xl font-bold"
                  style={{ color: "var(--primary)" }}
                >
                  {formatPrice(product.price)}
                </p>
              </div>

              {canPurchase ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`w-full py-3 rounded-lg font-bold transition flex items-center justify-center text-sm sm:text-base ${
                    isInCart ? "bg-green-500 text-white" : ""
                  }`}
                  style={
                    !isInCart
                      ? {
                          backgroundColor: "var(--primary)",
                          color: "var(--secondary)",
                        }
                      : {}
                  }
                >
                  {isInCart ? (
                    <>
                      <i className="fas fa-check mr-2" aria-hidden />
                      Produit au panier
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cart-plus mr-2" aria-hidden />
                      Ajouter au panier
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full bg-gray-400 text-white py-3 rounded-lg font-bold cursor-not-allowed text-sm sm:text-base"
                  disabled
                >
                  <i className="fas fa-times mr-2" aria-hidden />
                  {isArchived
                    ? "Produit archivé"
                    : isRuptureOnly
                      ? "Rupture de stock"
                      : "Non disponible"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
