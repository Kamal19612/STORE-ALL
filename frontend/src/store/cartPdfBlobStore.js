/**
 * Stockage en mémoire des PDF remplis (non persistés en localStorage).
 * Clé : cartLineId
 */
const blobs = new Map();

export function setCartPdfBlob(cartLineId, blob) {
  if (!cartLineId || !blob) return;
  blobs.set(cartLineId, blob);
}

export function getCartPdfBlob(cartLineId) {
  return blobs.get(cartLineId) ?? null;
}

export function removeCartPdfBlob(cartLineId) {
  blobs.delete(cartLineId);
}

export function clearCartPdfBlobs() {
  blobs.clear();
}
