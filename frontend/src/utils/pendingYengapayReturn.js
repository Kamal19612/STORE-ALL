const EXPECT_KEY = "yengapay_expect_return";
const MAX_AGE_MS = 45 * 60 * 1000;

/** Mémorise le retour attendu avant redirection vers YengaPay checkout. */
export function markYengapayCheckoutPending(orderNumber, storeCode) {
  if (!orderNumber || !storeCode) return;
  try {
    sessionStorage.setItem(
      EXPECT_KEY,
      JSON.stringify({
        orderNumber: String(orderNumber).trim(),
        storeCode: String(storeCode).trim().toLowerCase(),
        at: Date.now(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function readYengapayCheckoutPending(storeCode) {
  try {
    const raw = sessionStorage.getItem(EXPECT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.orderNumber || !data?.storeCode) return null;
    if (Date.now() - (data.at || 0) > MAX_AGE_MS) return null;
    if (storeCode && data.storeCode !== String(storeCode).trim().toLowerCase()) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearYengapayCheckoutPending() {
  try {
    sessionStorage.removeItem(EXPECT_KEY);
  } catch {
    /* ignore */
  }
}
