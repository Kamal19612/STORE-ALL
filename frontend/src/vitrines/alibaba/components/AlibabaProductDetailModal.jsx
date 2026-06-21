import { X } from "lucide-react";
import { toast } from "react-toastify";
import useCartStore from "../../../store/cartStore";
import ProductImageCarousel from "../../../components/product/ProductImageCarousel";
import { getProductCopySections } from "../../../utils/productCopy";
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

export default function AlibabaProductDetailModal({ product, onClose }) {
  const isProductInCart = useCartStore((state) => state.isProductInCart);
  const items = useCartStore((state) => state.items);

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
  const requiresPdf = needsPdfBeforeCart(product);
  const isInCart = !requiresPdf && isProductInCart(product.id);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!canPurchase) return;
    if (requiresPdf) {
      requestAddProductToCart(product);
      return;
    }
    const result = requestToggleProductInCart(product);
    if (result === "added") toast.success("Produit ajouté au panier");
  };

  const { catalogDescription, usageInstructions, showCatalog, showUsage } =
    getProductCopySections(product);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="ali-modal-panel w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-start px-6 pt-6 pb-3 shrink-0 border-b border-[var(--ali-border)]">
          <h2 className="text-xl font-semibold text-[var(--ali-text-heading)] pr-4 leading-7">
            {product.name}
          </h2>
          <button type="button" onClick={onClose} className="ali-btn-ghost shrink-0" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 pt-4">
          <div className="grid grid-cols-2 gap-6 min-w-0">
            <div>
              <ProductImageCarousel
                key={product.id}
                mainImage={product.mainImage}
                secondaryImages={product.secondaryImages}
                alt={product.name}
              />
              <span className="inline-block mt-3 text-xs font-medium text-[var(--ali-brand)] uppercase tracking-wide">
                {product.categoryName || "Catégorie"}
              </span>
            </div>

            <div className="space-y-4">
              {showCatalog && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ali-text-heading)] mb-1">Description</h3>
                  <p className="text-sm text-[var(--ali-text)] leading-[22px]">{catalogDescription}</p>
                </div>
              )}
              {showUsage && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ali-text-heading)] mb-1">Mode d&apos;emploi</h3>
                  <p className="text-sm text-[var(--ali-text)] leading-[22px]">{usageInstructions}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-[var(--ali-text-heading)] mb-1">Volume / Poids</h3>
                <p className="text-sm text-[var(--ali-text-muted)]">
                  {product.volumeWeight || product.stock || "Non spécifié"}
                </p>
              </div>
              <p className="text-2xl font-semibold text-[var(--ali-brand)]">{formatPrice(product.price)}</p>
              {canPurchase ? (
                <button type="button" onClick={handleAddToCart} className="ali-btn-primary w-full !rounded-full">
                  {isInCart ? "Retirer du panier" : "Ajouter au panier"}
                </button>
              ) : (
                <button type="button" disabled className="ali-btn-primary w-full !rounded-full">
                  {isArchived ? "Produit archivé" : isRuptureOnly ? "Rupture de stock" : "Non disponible"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
