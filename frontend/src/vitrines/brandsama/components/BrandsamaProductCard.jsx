import { useState } from "react";
import { toast } from "react-toastify";
import useCartStore from "../../../store/cartStore";
import ProductImage from "../../../components/product/ProductImage";
import { getProductGridText } from "../../../utils/productCopy";
import BrandsamaProductDetailModal from "./BrandsamaProductDetailModal";
import {
  needsPdfBeforeCart,
  requestAddProductToCart,
  requestToggleProductInCart,
} from "../../../utils/productCartFlow";

function formatPrice(price) {
  const n = price != null && price !== "" ? Number(price) : 0;
  const safe = Number.isFinite(n) ? n : 0;
  return `${String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

/**
 * Carte produit alignée sur {@link ProductCard} (thème classique), version compacte Brandsama.
 */
export default function BrandsamaProductCard({ product }) {
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
  const requiresPdf = needsPdfBeforeCart(product);
  const isInCart = !requiresPdf && isProductInCart(product.id);
  const listingText = getProductGridText(product);

  const handleToggleCart = (e) => {
    e.stopPropagation();
    if (!canPurchase) return;
    if (requiresPdf) {
      requestAddProductToCart(product);
      return;
    }
    const result = requestToggleProductInCart(product);
    if (result === "added" && items.length === 0) {
      toast.success("Produit ajouté ! Vérifiez votre panier en haut ↗", {
        icon: "🛒",
        autoClose: 2000,
      });
    }
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    setShowModal(true);
  };

  return (
    <>
      <div className="bs-card product-card w-full group">
        <div
          className="bs-card-image relative cursor-pointer rounded-lg overflow-hidden"
          onClick={() => setShowModal(true)}
          onKeyDown={(e) => e.key === "Enter" && setShowModal(true)}
          role="button"
          tabIndex={0}
        >
          <ProductImage
            product={product}
            alt={product.name}
            className="bs-card-image-img w-full h-full object-cover object-center block"
            wrapperClassName="bs-card-image-wrap w-full h-full"
          />

          <button
            type="button"
            onClick={handleViewDetails}
            className="bs-card-detail-btn absolute top-1.5 left-1.5 p-1.5 rounded-full shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10 flex items-center justify-center w-7 h-7"
            title="Voir les détails"
          >
            <i className="fas fa-eye text-xs" aria-hidden />
          </button>

          <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1 z-[5]">
            {stockNum === 0 && (
              <span className="bs-card-status-badge">Indisponible</span>
            )}
            {!isArchived && !isPurchasable && stockNum !== 0 && (
              <span className="bs-card-status-badge">Non disponible</span>
            )}
          </div>
        </div>

        <div className="bs-card-body">
          <div className="mb-0.5">
            <span className="bs-card-category">
              {product.categoryName || "Catégorie"}
            </span>
          </div>

          <h3 className="bs-card-title">{product.name}</h3>

          {listingText ? (
            <p className="bs-card-excerpt">{listingText}</p>
          ) : null}

          <div className="bs-card-footer">
            <span className="bs-card-price">{formatPrice(product.price)}</span>

            {canPurchase ? (
              <button
                type="button"
                onClick={handleToggleCart}
                className={`bs-card-cart-btn ${isInCart ? "is-in-cart" : ""}`}
                aria-label={isInCart ? "Retirer du panier" : "Ajouter au panier"}
              >
                {isInCart ? (
                  <i className="fas fa-check" aria-hidden />
                ) : (
                  <i className="fas fa-cart-plus" aria-hidden />
                )}
              </button>
            ) : (
              <button
                type="button"
                className="bs-card-cart-btn is-disabled"
                disabled
                title={
                  isRuptureOnly ? "Indisponible" : "Non disponible à la vente"
                }
              >
                <i className="fas fa-times" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <BrandsamaProductDetailModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
