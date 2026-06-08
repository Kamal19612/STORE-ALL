/**
 * Détecte si la description courte et le mode d'emploi reprennent le même contenu
 * (ex. import Google Sheets : shortDescription tronquée depuis description).
 */
export function isDuplicateProductCopy(shortDescription, description) {
  const short = (shortDescription || "").trim();
  const usage = (description || "").trim();
  if (!short || !usage) return false;
  if (short === usage) return true;
  const shortBase = short.replace(/\.{3}$/, "").trim();
  return usage.startsWith(shortBase) || shortBase.startsWith(usage);
}

/** Texte affiché sur la grille (description courte uniquement, pas le mode d'emploi). */
export function getProductGridText(product) {
  return (product?.shortDescription || "").trim();
}

/** Blocs Description / Mode d'emploi pour fiche produit et modal. */
export function getProductCopySections(product) {
  const short = (product?.shortDescription || "").trim();
  const usage = (product?.description || "").trim();
  const duplicate = isDuplicateProductCopy(short, usage);

  return {
    catalogDescription: duplicate ? "" : short,
    usageInstructions: usage || (duplicate ? short : ""),
    showCatalog: !duplicate && Boolean(short),
    showUsage: Boolean(usage) || (duplicate && Boolean(short)),
  };
}
