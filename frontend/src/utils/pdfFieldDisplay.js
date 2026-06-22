/**
 * Champs formulaire PDF : affichage commande / notifications (valeurs vides exclues).
 */

export function humanizePdfFieldName(name) {
  return String(name || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function formatPdfFieldValue(value) {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value).trim();
}

/** Texte vide ou case non cochée → masqué à l'affichage. */
export function isDisplayablePdfFieldValue(value) {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  return String(value).trim().length > 0;
}

export function parsePdfFieldSummaryForDisplay(pdfFieldValues) {
  if (!pdfFieldValues) return [];
  try {
    const parsed =
      typeof pdfFieldValues === "string" ? JSON.parse(pdfFieldValues) : pdfFieldValues;
    if (!parsed || typeof parsed !== "object") return [];
    return Object.entries(parsed)
      .filter(([key, value]) => key && isDisplayablePdfFieldValue(value))
      .map(([key, value]) => ({
        key,
        label: humanizePdfFieldName(key),
        value: formatPdfFieldValue(value),
      }));
  } catch {
    return [];
  }
}
