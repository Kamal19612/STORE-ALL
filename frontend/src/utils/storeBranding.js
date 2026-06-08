import { BRAND_LOGO_SRC } from "../config/branding";

/**
 * URL affichable pour le logo boutique : chemins locaux {@code /uploads/…} ou URL absolue inchangée.
 * Ne modifie pas les URLs externes (produits Google Sheets, etc.).
 */
export function resolveManagerStoreLogoUrl(logoUrl) {
  if (logoUrl == null || String(logoUrl).trim() === "") {
    return BRAND_LOGO_SRC;
  }
  const u = String(logoUrl).trim();
  if (
    (u.startsWith("http://127.0.0.1") || u.startsWith("http://localhost")) &&
    u.includes("/uploads/")
  ) {
    const i = u.indexOf("/uploads/");
    return u.substring(i);
  }
  if (u.startsWith("http://") || u.startsWith("https://")) {
    return u;
  }
  if (u.startsWith("/")) {
    return u;
  }
  return `/${u}`;
}
