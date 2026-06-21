import api from "./api";
import { getCartPdfBlob } from "../store/cartPdfBlobStore";

function buildOrderItemsPayload(cartItems) {
  return cartItems.map((item) => ({
    productId: item.id,
    quantity: item.quantity,
    ...(item.hasPdfCustomization && item.pdfFieldValues
      ? { pdfFieldValues: JSON.stringify(item.pdfFieldValues) }
      : {}),
  }));
}

/**
 * Soumet une commande. Utilise multipart si des PDF personnalisés sont présents.
 */
export async function submitOrder(orderPayload, cartItems) {
  const items = buildOrderItemsPayload(cartItems);
  const { paymentMethod, ...rest } = orderPayload;
  const payload = {
    ...rest,
    items,
    ...(paymentMethod && paymentMethod !== "COD" ? { paymentMethod } : {}),
  };
  const needsMultipart = cartItems.some((item) => item.hasPdfCustomization);

  if (!needsMultipart) {
    return api.post("/orders", payload);
  }

  for (const item of cartItems) {
    if (item.hasPdfCustomization && !getCartPdfBlob(item.cartLineId)) {
      throw new Error(
        "Un formulaire PDF a expiré (rafraîchissement de page). Veuillez retirer l'article et le rajouter au panier.",
      );
    }
  }

  const formData = new FormData();
  formData.append("order", JSON.stringify(payload));

  cartItems.forEach((item, index) => {
    if (!item.hasPdfCustomization) return;
    const blob = getCartPdfBlob(item.cartLineId);
    if (blob) {
      formData.append(`filledPdf_${index}`, blob, `item-${item.cartLineId}.pdf`);
    }
  });

  return api.post("/orders", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export default { submitOrder };
