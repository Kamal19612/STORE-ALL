import { describe, expect, it } from "vitest";
import {
  getProductMainImageSrc,
  resolveProductImageUrl,
  unwrapImageProxyUrl,
} from "./productMedia";

describe("resolveProductImageUrl", () => {
  it("normalise uploads locaux absolus localhost", () => {
    expect(
      resolveProductImageUrl("http://127.0.0.1:8085/uploads/photo.jpg"),
    ).toBe("/uploads/photo.jpg");
  });

  it("ajoute le slash pour chemins relatifs uploads", () => {
    expect(resolveProductImageUrl("uploads/photo.jpg")).toBe("/uploads/photo.jpg");
  });

  it("conserve les URLs https externes", () => {
    expect(resolveProductImageUrl("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
  });

  it("ajoute https si domaine sans protocole", () => {
    expect(resolveProductImageUrl("cdn.example.com/img.png")).toBe(
      "https://cdn.example.com/img.png",
    );
  });
});

describe("unwrapImageProxyUrl", () => {
  it("extrait l'URL directe depuis Startpage", () => {
    const proxy =
      "https://www.startpage.com/av/proxy-image?piurl=https%3A%2F%2Fcdn.example.com%2Fa.jpg";
    expect(unwrapImageProxyUrl(proxy)).toBe("https://cdn.example.com/a.jpg");
  });
});

describe("getProductMainImageSrc", () => {
  it("lit mainImage ou imageUrl", () => {
    expect(getProductMainImageSrc({ mainImage: "/uploads/x.jpg" })).toBe("/uploads/x.jpg");
    expect(getProductMainImageSrc({ imageUrl: "https://a.b/c.png" })).toBe("https://a.b/c.png");
  });

  it("déplie un proxy Startpage dans mainImage", () => {
    const product = {
      mainImage:
        "https://www.startpage.com/av/proxy-image?piurl=https%3A%2F%2Fcdn.example.com%2Fa.jpg",
    };
    expect(getProductMainImageSrc(product)).toBe("https://cdn.example.com/a.jpg");
  });
});
