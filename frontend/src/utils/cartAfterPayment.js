import useCartStore from "../store/cartStore";

/** Vide le panier après un paiement terminal (succès ou échec définitif). */
export function clearCartAfterPayment() {
  try {
    useCartStore.getState().clearCart();
  } catch {
    /* ignore */
  }
}
