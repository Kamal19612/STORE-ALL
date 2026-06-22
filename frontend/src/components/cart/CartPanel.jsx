import { Plus, Minus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useCartStore from "../../store/cartStore";
import { useStorefrontHref } from "../../hooks/useStorefrontHref";
import ProductImage from "../product/ProductImage";

/**
 * Contenu du panier réutilisable (page plein écran et drawer).
 */
export function CartPanel({ onContinueShopping }) {
  const { fulfillment: fulfillmentHref } = useStorefrontHref();
  const { items, removeItem, updateQuantity } = useCartStore();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const navigate = useNavigate();

  const goToFulfillment = () => {
    if (onContinueShopping) onContinueShopping();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    navigate(fulfillmentHref);
  };

  if (items.length === 0) {
    return (
      <div className="cart-page-empty flex flex-col items-center justify-center text-center p-8 min-h-[50vh]">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
          <ShoppingBag className="h-12 w-12 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-secondary">Votre panier est vide</h1>
        <p className="text-gray-500 mt-2 max-w-sm">
          Découvrez nos produits et ajoutez vos articles favoris.
        </p>
        <Link
          to=".."
          className="mt-6 btn-primary px-8 py-3 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Continuer mes achats
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page max-w-3xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-black text-secondary mb-6">
        Mon panier ({itemCount})
      </h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.cartLineId}
            className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
          >
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-50 border border-gray-100">
              <ProductImage
                product={item}
                alt={item.name}
                className="h-full w-full object-contain object-center"
                wrapperClassName="h-full w-full"
              />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex justify-between items-start gap-2">
                <h2 className="font-bold text-secondary text-sm md:text-base line-clamp-2">
                  {item.name}
                  {item.hasPdfCustomization ? (
                    <span className="block text-xs font-semibold text-primary mt-0.5">
                      Personnalisé (PDF)
                    </span>
                  ) : null}
                </h2>
                <button
                  type="button"
                  onClick={() => removeItem(item.cartLineId)}
                  className="text-gray-400 hover:text-red-500 p-1 shrink-0"
                  aria-label="Retirer du panier"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-auto flex justify-between items-center pt-3">
                <div className="flex items-center gap-3 bg-gray-50 rounded-full border border-gray-200 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.cartLineId, item.quantity - 1)}
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
                    onClick={() => updateQuantity(item.cartLineId, item.quantity + 1)}
                    className="p-1 rounded-full hover:bg-gray-100 text-secondary"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="font-bold text-primary">
                  {(item.price * item.quantity).toLocaleString()} FCFA
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-500 uppercase tracking-wider text-sm">
            Sous-total
          </span>
          <span className="font-black text-2xl text-secondary">
            {total.toLocaleString()} FCFA
          </span>
        </div>
        <p className="text-xs text-gray-400 italic">
          Livraison ou retrait en boutique — choix à l&apos;étape suivante.
        </p>
        <button
          type="button"
          onClick={goToFulfillment}
          className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-primary/20"
        >
          Passer la commande
        </button>
      </div>
    </div>
  );
}

export default CartPanel;
