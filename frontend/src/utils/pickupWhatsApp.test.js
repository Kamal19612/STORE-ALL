import { describe, it, expect } from "vitest";
import {
  formatPhoneForWhatsApp,
  resolveStoreMapsUrl,
  buildPickupWhatsAppLink,
} from "./pickupWhatsApp";

describe("pickupWhatsApp", () => {
  it("formate le numéro wa.me", () => {
    expect(formatPhoneForWhatsApp("+226 70 12 34 56")).toBe("22670123456");
  });

  it("résout une URL maps directe", () => {
    expect(
      resolveStoreMapsUrl({ mapsUrl: "https://maps.app.goo.gl/abc" }, {}),
    ).toBe("https://maps.app.goo.gl/abc");
  });

  it("résout des coordonnées lat,lng", () => {
    expect(resolveStoreMapsUrl(null, { store_location: "12.37, -1.52" })).toBe(
      "https://www.google.com/maps?q=12.37,-1.52",
    );
  });

  it("construit un lien WhatsApp retrait", () => {
    const link = buildPickupWhatsAppLink({
      storeName: "Spirit",
      customerName: "Kamal",
      customerPhone: "+22670123456",
      customerNotes: "",
      items: [{ name: "Gâteau", quantity: 2, price: 5000 }],
      total: 10000,
      mapsUrl: "https://maps.example.com",
      whatsappNumber: "22670111111",
    });
    expect(link).toMatch(/^https:\/\/wa\.me\/22670111111\?text=/);
    expect(decodeURIComponent(link.split("?text=")[1])).toContain("RETRAIT EN BOUTIQUE");
    expect(decodeURIComponent(link.split("?text=")[1])).toContain("Kamal");
  });
});
