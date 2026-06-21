import { useState } from "react";
import useCartStore from "../../store/cartStore";
import { toast } from "react-toastify";
import { Check, ShoppingBag } from "lucide-react";
import ProductDetailModal from "./ProductDetailModal";
import { getProductGridText } from "../../utils/productCopy";
import { getProductMainImageSrc } from "../../utils/productMedia";
import {
  needsPdfBeforeCart,
  requestAddProductToCart,
  requestToggleProductInCart,
} from "../../utils/productCartFlow";

const ProductCard = ({ product }) => {
  const isProductInCart = useCartStore((state) => state.isProductInCart);
  const items = useCartStore((state) => state.items);
  const [showModal, setShowModal] = useState(false);

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

  // Helper to format price like PHP: 10 000 FCFA
  const formatPrice = (price) => {
    const n = price != null && price !== "" ? Number(price) : 0;
    const safe = Number.isFinite(n) ? n : 0;
    return String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  };

  const requiresPdf = needsPdfBeforeCart(product);
  const isInCart = !requiresPdf && isProductInCart(product.id);
  const pdfLinesInCart = requiresPdf
    ? items.filter((item) => item.id === product.id && item.hasPdfCustomization).length
    : 0;

  const handleToggleCart = (e) => {
    e.stopPropagation();
    if (!canPurchase) return;

    if (requiresPdf) {
      requestAddProductToCart(product);
      return;
    }

    const result = requestToggleProductInCart(product);
    if (result === "added") {
      const isFirstItem = items.length === 0;
      if (isFirstItem) {
        toast.success("Produit ajouté ! Vérifiez votre panier en haut ↗", {
          icon: "🛒",
          autoClose: 2000,
        });
      }
    }
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleImageClick = () => {
    setShowModal(true);
  };

  const listingText = getProductGridText(product);
  const imageSrc = getProductMainImageSrc(product);

  return (
    <>
      {/* 
        PHP STRUCTURE:
        <div class="product-card bg-white rounded-lg shadow-md overflow-hidden relative">
          <div class="relative h-48 bg-gray-200 cursor-pointer view-details-trigger">
            <img ... />
            <button class="detail-btn ..."><i class="fas fa-eye"></i></button>
            <div class="absolute top-2 right-2 ...">Non disponible</div>
          </div>
          <div class="p-4">
             ... info ...
          </div>
        </div>
      */}
      <div className="product-card w-full bg-white rounded-lg shadow-md overflow-hidden relative group hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
        {/* Product Image Zone */}
        <div
          className="product-card__media relative w-full aspect-square bg-transparent cursor-pointer rounded-lg overflow-hidden"
          onClick={handleImageClick}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.name}
              className="product-card__image w-full h-full object-cover object-center block"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fas fa-image text-4xl sm:text-6xl text-gray-400" aria-hidden />
            </div>
          )}

          {/* View Details Button - Matches PHP .detail-btn */}
          {/* 
            PHP CSS:
            .detail-btn { opacity: 1; transition: opacity 0.2s; }
            @media (min-width: 768px) { .detail-btn { opacity: 0; } .product-card:hover .detail-btn { opacity: 1; } }
            
            Tailwind equiv: opacity-100 md:opacity-0 md:group-hover:opacity-100
          */}
          <button
            onClick={handleViewDetails}
            className="absolute top-2 left-2 text-white p-2 rounded-full shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10 flex items-center justify-center w-8 h-8"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--secondary)",
            }}
            title="Voir les détails"
          >
            <i className="fas fa-eye text-sm"></i>
          </button>

          <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-[5]">
            {stockNum === 0 && (
              <div
                className="text-white text-xs px-2 py-1 rounded font-semibold"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                Indisponible
              </div>
            )}
            {!isArchived &&
              !isPurchasable &&
              stockNum !== 0 && (
                <div
                  className="text-white text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  Non disponible
                </div>
              )}
          </div>
        </div>

        {/* Product Info */}
        <div className="p-1.5 sm:p-2">
          <div className="mb-1">
            <span
              className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider py-0.5 inline-block bg-transparent"
              style={{ color: "var(--primary)" }}
            >
              {product.categoryName || "Catégorie"}
            </span>
          </div>

          <h3
            className="text-[11px] sm:text-sm font-bold mb-1 line-clamp-1 leading-tight first-letter:uppercase lowercase"
            style={{ color: "var(--secondary)" }}
          >
            {product.name}
          </h3>

          {listingText ? (
            <p className="text-[8px] sm:text-[10px] text-gray-600 mb-2 line-clamp-2 first-letter:uppercase lowercase leading-[1.1]">
              {listingText}
            </p>
          ) : null}

          <div className="flex items-center justify-between mt-2">
            <span
              className="text-[12px] sm:text-base font-bold"
              style={{ color: "var(--primary)" }}
            >
              {formatPrice(product.price)}
            </span>

            {canPurchase ? (
              <button
                onClick={handleToggleCart}
                className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg transition text-white flex items-center justify-center ${
                  isInCart ? "bg-green-500" : ""
                }`}
                style={
                  !isInCart
                    ? {
                        backgroundColor: "var(--primary)",
                        color: "var(--secondary)",
                      }
                    : { backgroundColor: "#10b981", color: "white" }
                }
              >
                {isInCart ? (
                  <i className="fas fa-check"></i>
                ) : (
                  <i className="fas fa-cart-plus"></i>
                )}
              </button>
            ) : (
              <button
                className="bg-gray-400 text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg cursor-not-allowed"
                disabled
                title={
                  isRuptureOnly
                      ? "Indisponible"
                      : "Non disponible à la vente"
                }
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal - Rendered outside if needed, or inline */}
      {showModal && (
        <ProductDetailModal
          product={product}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
