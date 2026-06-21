import { useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import useCartStore from "../../store/cartStore";
import ProductImageCarousel from "./ProductImageCarousel";
import { getProductCopySections } from "../../utils/productCopy";
import {
  needsPdfBeforeCart,
  requestAddProductToCart,
  requestToggleProductInCart,
} from "../../utils/productCartFlow";

const ProductDetailModal = ({ product, onClose }) => {
  const isProductInCart = useCartStore((state) => state.isProductInCart);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("product-detail-modal-open");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("product-detail-modal-open");
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

  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  };

  const requiresPdf = needsPdfBeforeCart(product);
  const isInCart = !requiresPdf && isProductInCart(product.id);
  const pdfLinesInCart = requiresPdf
    ? items.filter((item) => item.id === product.id && item.hasPdfCustomization).length
    : 0;

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!canPurchase) return;

    if (requiresPdf) {
      requestAddProductToCart(product);
      return;
    }

    const result = requestToggleProductInCart(product);
    if (result === "added") {
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

  return createPortal(
    <div
      id="details-modal"
      className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="product-detail-modal bg-white w-full max-w-2xl max-h-[90vh] rounded-lg flex flex-col shadow-xl">
        <div className="flex justify-between items-start px-6 pt-6 pb-3 shrink-0">
          <h2
            className="text-2xl font-bold pr-4 leading-tight"
            style={{ color: "var(--secondary)" }}
          >
            {product.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 shrink-0"
            aria-label="Fermer"
          >
            <i className="fas fa-times text-xl" aria-hidden />
          </button>
        </div>

        <div className="product-detail-modal__body overflow-y-auto px-6 pb-6 min-h-0">
          <div className="product-detail-modal__grid grid grid-cols-2 gap-6 min-w-0">
            <div className="min-w-0">
              <ProductImageCarousel
                key={product.id}
                mainImage={product.mainImage}
                secondaryImages={product.secondaryImages}
                alt={product.name}
              />
              <div className="mt-3">
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full inline-block bg-transparent"
                  style={{ color: "var(--primary)" }}
                >
                  {product.categoryName || "Catégorie"}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              {showCatalog ? (
                <div className="mb-3">
                  <h3
                    className="font-bold mb-1 text-base"
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
                    className="font-bold mb-1 text-base"
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
                  className="font-bold mb-1 text-base"
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
                  className="font-bold mb-1 text-base"
                  style={{ color: "var(--secondary)" }}
                >
                  Prix
                </h3>
                <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
                  {formatPrice(product.price)}
                </p>
              </div>

              {canPurchase ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`w-full py-3 rounded-lg font-bold transition flex items-center justify-center text-base ${isInCart ? "bg-green-500 text-white" : ""}`}
                  style={
                    !isInCart
                      ? { backgroundColor: "var(--primary)", color: "var(--secondary)" }
                      : {}
                  }
                >
                  {isInCart ? (
                    <>
                      <i className="fas fa-check mr-2" aria-hidden />
                      Produit au panier
                    </>
                  ) : requiresPdf ? (
                    <>
                      <i className="fas fa-file-alt mr-2" aria-hidden />
                      Remplir le formulaire
                      {pdfLinesInCart > 0 ? ` (${pdfLinesInCart} au panier)` : ""}
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
                  className="w-full bg-gray-400 text-white py-3 rounded-lg font-bold cursor-not-allowed text-base"
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
    </div>,
    document.body,
  );
};

export default ProductDetailModal;
