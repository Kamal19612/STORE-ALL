import useCartStore from "../store/cartStore";
import usePdfFormModalStore from "../store/pdfFormModalStore";

export function needsPdfBeforeCart(product) {
  return Boolean(product?.requiresPdfForm && product?.hasPdfTemplate);
}

/**
 * Point d'entrée unique pour ajouter un produit au panier.
 * Ouvre la modale PDF si nécessaire.
 */
export function requestAddProductToCart(product) {
  if (needsPdfBeforeCart(product)) {
    usePdfFormModalStore.getState().openForProduct(product);
    return false;
  }
  useCartStore.getState().addItem(product);
  return true;
}

export function requestToggleProductInCart(product) {
  if (needsPdfBeforeCart(product)) {
    usePdfFormModalStore.getState().openForProduct(product);
    return "pdf";
  }

  const { isProductInCart, removeProductFromCart, addItem } = useCartStore.getState();
  if (isProductInCart(product.id)) {
    const line = useCartStore
      .getState()
      .items.find((item) => item.id === product.id && !item.hasPdfCustomization);
    if (line) {
      removeProductFromCart(product.id);
      return "removed";
    }
    usePdfFormModalStore.getState().openForProduct(product);
    return "pdf";
  }

  addItem(product);
  return "added";
}
