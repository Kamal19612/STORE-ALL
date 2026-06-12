/**
 * Formate un numéro pour wa.me (chiffres uniquement, indicatif international).
 */
export function formatPhoneForWhatsApp(phone) {
  return String(phone || "").replace(/\D/g, "");
}

/**
 * Résout l’URL Google Maps de la boutique (lien direct, coordonnées ou adresse texte).
 */
export function resolveStoreMapsUrl(storeInfo, appSettings) {
  const raw = (storeInfo?.mapsUrl || appSettings?.store_location || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(raw)) {
    const [lat, lng] = raw.split(",").map((s) => s.trim());
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
}

/**
 * Construit le lien WhatsApp pour une demande de retrait en boutique.
 */
export function buildPickupWhatsAppLink({
  storeName,
  customerName,
  customerPhone,
  customerNotes,
  items,
  total,
  mapsUrl,
  whatsappNumber,
}) {
  const dest = formatPhoneForWhatsApp(whatsappNumber);
  if (!dest) return null;

  const currency = "FCFA";
  const now = new Date();
  const dateStr = now.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines = [
    `*RETRAIT EN BOUTIQUE — ${storeName}*`,
    "",
    `Date: ${dateStr}`,
    "",
    "*CLIENT*",
    `Nom: ${customerName}`,
    `Tel: ${customerPhone}`,
    "",
    "*ARTICLES*",
    ...items.map(
      (item) =>
        `- ${item.quantity}x ${item.name} (${(item.price * item.quantity).toLocaleString("fr-FR")} ${currency})`,
    ),
    "",
    `*TOTAL: ${total.toLocaleString("fr-FR")} ${currency}*`,
    "",
    "Mode: *Retrait sur place* (je passerai chercher ma commande)",
  ];

  if (mapsUrl) {
    lines.push("", `📍 Lieu de retrait: ${mapsUrl}`);
  }

  if (customerNotes?.trim()) {
    lines.push("", `Notes: ${customerNotes.trim()}`);
  }

  const text = lines.join("\n");
  return `https://wa.me/${dest}?text=${encodeURIComponent(text)}`;
}
