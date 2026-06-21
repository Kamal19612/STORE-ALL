import { useState } from "react";
import { Eye, ShoppingCart, Check } from "lucide-react";
import { toast } from "react-toastify";
import useCartStore from "../../../store/cartStore";
import ProductImage from "../../../components/product/ProductImage";
import { getProductGridText } from "../../../utils/productCopy";
import AlibabaProductDetailModal from "./AlibabaProductDetailModal";
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

export default function AlibabaProductCard({ product }) {
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
      toast.success("Produit ajouté — consultez votre panier", { autoClose: 2000 });
    }
  };

  return (
    <>
      <article className="ali-card-product flex flex-col h-full group">
        <div
          className="relative aspect-[4/3] bg-[var(--ali-surface)] cursor-pointer overflow-hidden"
          onClick={() => setShowModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setShowModal(true)}
        >
          <ProductImage
            product={product}
            alt={product.name}
            className="w-full h-full object-cover object-center block"
            wrapperClassName="w-full h-full"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
            className="absolute top-2 left-2 ali-btn-ghost !min-h-9 !min-w-9 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </button>
          {stockNum === 0 && (
            <span className="absolute top-2 right-2 bg-[var(--ali-text-heading)] text-white text-xs px-2 py-1 font-medium">
              Indisponible
            </span>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1 gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--ali-brand)]">
            {product.categoryName || "Catégorie"}
          </span>
          <h3 className="text-sm font-semibold text-[var(--ali-text-heading)] line-clamp-2 leading-[18px]">
            {product.name}
          </h3>
          {listingText ? (
            <p className="text-xs text-[var(--ali-text-muted)] line-clamp-2 leading-[18px]">{listingText}</p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="text-base font-semibold text-[var(--ali-brand)]">{formatPrice(product.price)}</span>
            {canPurchase ? (
              <button
                type="button"
                onClick={handleToggleCart}
                className={`ali-btn-primary !min-h-9 !h-9 !px-3 !text-sm !rounded-full shrink-0 ${
                  isInCart ? "!bg-[#10b981] hover:!bg-[#059669]" : ""
                }`}
                aria-label={isInCart ? "Retirer du panier" : "Ajouter au panier"}
              >
                {isInCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="ali-btn-primary !min-h-9 !h-9 !px-3 !text-sm !rounded-full shrink-0 opacity-60"
                style={{ background: "#cccccc", color: "#666" }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </article>

      {showModal && (
        <AlibabaProductDetailModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
