/**
 * Premier segment d'URL = code boutique sur la vitrine (/sucre, /sucre/checkout).
 * Segments reserves (login, admin, fichiers statiques…) -> pas de prefixe API /api/shop/…
 */
const RESERVED_STORE_ROOT = new Set([
  "login",
  "admin",
  "manager",
  "delivery",
  "assets",
  "src",
  "@vite",
  "node_modules",
]);

/**
 * Code boutique derive du pathname vitrine, ou null hors vitrine.
 */
export function getStorefrontCodeFromPath() {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/^\/([^/]+)(?:\/|$)/);
  if (!m) return null;
  const seg = m[1];
  if (seg.includes(".")) return null;
  const lower = seg.toLowerCase();
  if (RESERVED_STORE_ROOT.has(lower)) return null;
  return lower;
}

function shouldPrefixApiPath(pathOnly) {
  if (
    pathOnly.startsWith("/super/") ||
    pathOnly.startsWith("/manager/") ||
    pathOnly.startsWith("/delivery/") ||
    pathOnly.startsWith("/auth/") ||
    pathOnly.startsWith("/notifications/") ||
    pathOnly.startsWith("/webhooks/") ||
    pathOnly.startsWith("/telegram/")
  ) {
    return false;
  }
  if (pathOnly.startsWith("/shop/")) {
    return false;
  }
  return (
    pathOnly.startsWith("/products") ||
    pathOnly.startsWith("/categories") ||
    pathOnly.startsWith("/sliders") ||
    pathOnly.startsWith("/public/") ||
    pathOnly.startsWith("/store/") ||
    pathOnly === "/orders" ||
    pathOnly.startsWith("/orders/")
  );
}

/** Prefixe l'URL relative (ex. /products -> /shop/spirit/products). */
export function withShopPrefix(url) {
  if (!url || typeof url !== "string" || !url.startsWith("/")) return url;
  const code = getStorefrontCodeFromPath();
  if (!code) return url;
  const q = url.indexOf("?");
  const pathOnly = q >= 0 ? url.slice(0, q) : url;
  const qs = q >= 0 ? url.slice(q) : "";
  if (!shouldPrefixApiPath(pathOnly)) return url;
  return `/shop/${code}${pathOnly}${qs}`;
}
