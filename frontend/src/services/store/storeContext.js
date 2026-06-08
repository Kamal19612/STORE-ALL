import { getStorefrontCodeFromPath } from "../storefrontShopApiPrefix";

function deriveStoreFromHostname() {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const first = host.split(".")[0];
  if (first && first.length >= 2 && first !== "www" && first !== "localhost") {
    return first.toLowerCase();
  }
  return null;
}

/**
 * Code boutique pour en-têtes API (`X-Store-Code`), aligné sur la vitrine {@code /:code/…}.
 *
 * Ordre : 1) premier segment d’URL (hors routes réservées) — même règle que {@code withShopPrefix} ;
 * 2) {@code active_store_code} (manager / super-admin / shell) ; 3) {@code VITE_STORE_CODE}.
 *
 * Ne pas mettre l’env avant l’URL : sinon une visite sur {@code /autre-boutique} gardait le défaut .env
 * pour tout appel non préfixé {@code /api/shop/…}.
 */
export function getExplicitStoreCode() {
  const fromPath = getStorefrontCodeFromPath();
  if (fromPath) return fromPath;

  try {
    const v = localStorage.getItem("active_store_code");
    if (v && v.trim()) return v.trim().toLowerCase();
  } catch {
    // ignore
  }

  const env = import.meta.env.VITE_STORE_CODE;
  if (typeof env === "string" && env.trim()) return env.trim().toLowerCase();

  return null;
}

/** Aligne le tenant `X-Store-Code` (ex. espace manager ou super admin). */
export function setActiveStoreCode(code) {
  try {
    if (code && String(code).trim()) {
      localStorage.setItem("active_store_code", String(code).trim().toLowerCase());
    } else {
      localStorage.removeItem("active_store_code");
    }
  } catch {
    // ignore
  }
}

/**
 * Returns the effective store code for UI purposes (can derive from hostname).
 * Backend should primarily resolve tenant from Host; `X-Store-Code` is optional.
 */
export function getStoreCode() {
  return getExplicitStoreCode() ?? deriveStoreFromHostname() ?? "spirit";
}

