import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import useCartStore from "../../store/cartStore";
import { useNavigate } from "react-router-dom";
import { useStorefrontHref } from "../../hooks/useStorefrontHref";
import ProductImage from "../product/ProductImage";

const CartDrawer = ({ isOpen, onClose }) => {
  const { fulfillment: fulfillmentHref } = useStorefrontHref();
  const { items, removeItem, updateQuantity } = useCartStore();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="cart-drawer-root fixed inset-0 z-100 overflow-hidden">
      <div
        className="cart-drawer-overlay absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="cart-drawer w-screen max-w-md bg-white shadow-2xl flex flex-col animate-slide-in">
          <div className="cart-drawer-header px-4 py-6 bg-secondary text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="cart-drawer-header-icon h-6 w-6 text-primary" />
              <h2 className="cart-drawer-title text-xl font-bold tracking-tight">
                Mon panier ({itemCount})
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cart-drawer-close p-2 rounded-full hover:bg-secondary-light transition-colors"
              aria-label="Fermer le panier"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="cart-drawer-body flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="cart-drawer-empty h-full flex flex-col items-center justify-center text-center p-8">
                <div className="cart-drawer-empty-icon bg-gray-100 p-6 rounded-full mb-4">
                  <ShoppingBag className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-secondary">
                  Votre panier est vide
                </h3>
                <p className="text-gray-500 mt-2">
                  Découvrez nos délices et ajoutez vos préférés ici !
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="cart-drawer-cta mt-6 btn-primary w-full"
                >
                  Continuer mes achats
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.cartLineId}
                  className="cart-drawer-item flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 group"
                >
                  <div className="cart-drawer-item-image h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white border border-gray-100">
                    <ProductImage
                      product={item}
                      alt={item.name}
                      className="h-full w-full object-contain object-center"
                      wrapperClassName="h-full w-full"
                    />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                      <h4 className="cart-drawer-item-name font-bold text-secondary text-sm line-clamp-2">
                        {item.name}
                        {item.hasPdfCustomization ? (
                          <span className="block text-[10px] font-semibold text-primary mt-0.5">
                            Personnalisé (PDF)
                          </span>
                        ) : null}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeItem(item.cartLineId)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        aria-label="Retirer du panier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex justify-between items-center">
                      <div className="cart-drawer-qty flex items-center gap-3 bg-white rounded-full border border-gray-200 px-2 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.cartLineId, item.quantity - 1)
                          }
                          className="p-1 rounded-full hover:bg-gray-100 text-secondary"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-bold text-sm min-w-[24px] text-center text-secondary">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.cartLineId, item.quantity + 1)
                          }
                          className="p-1 rounded-full hover:bg-gray-100 text-secondary"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="cart-drawer-item-price font-bold text-primary">
                        {(item.price * item.quantity).toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="cart-drawer-footer border-t border-gray-100 p-6 space-y-4 bg-gray-50">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium text-gray-500 uppercase tracking-wider text-sm">
                  Sous-total
                </span>
                <span className="cart-drawer-total font-black text-2xl text-secondary">
                  {total.toLocaleString()} FCFA
                </span>
              </div>
              <p className="text-xs text-gray-400 italic">
                Livraison ou retrait en boutique — choix à l&apos;étape suivante.
              </p>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                  document.body.scrollTop = 0;
                  document.documentElement.scrollTop = 0;
                  navigate(fulfillmentHref);
                }}
                className="cart-drawer-cta btn-primary w-full py-3 text-lg font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 tracking-wide"
              >
                Passer la commande
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
