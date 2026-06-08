/**
 * Recherche texte catalogue vitrine (nom, catégorie, descriptions, slug…).
 * @param {object} product
 * @param {string} query
 */
export function matchesCatalogSearch(product, query) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!q) return true;

  const hay = [
    product?.name,
    product?.slug,
    product?.categoryName,
    product?.shortDescription,
    product?.description,
    product?.volumeWeight,
    product?.externalId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

/**
 * @param {object[]} products
 * @param {string} query
 */
export function filterProductsBySearch(products, query) {
  const q = String(query ?? "").trim();
  if (!q) return products.slice();
  return products.filter((p) => matchesCatalogSearch(p, q));
}
