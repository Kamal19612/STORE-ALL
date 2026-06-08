import { describe, expect, it } from "vitest";
import { filterProductsBySearch, matchesCatalogSearch } from "./catalogSearch";

describe("catalogSearch", () => {
  const sample = {
    name: "Chocolat Noir",
    slug: "chocolat-noir",
    categoryName: "Confiserie",
    shortDescription: "70% cacao",
    description: "Mode emploi stockage frais",
  };

  it("matche nom et description courte", () => {
    expect(matchesCatalogSearch(sample, "cacao")).toBe(true);
    expect(matchesCatalogSearch(sample, "chocolat")).toBe(true);
  });

  it("requiert tous les mots", () => {
    expect(matchesCatalogSearch(sample, "chocolat confiserie")).toBe(true);
    expect(matchesCatalogSearch(sample, "chocolat vanille")).toBe(false);
  });

  it("filtre une liste", () => {
    const list = [sample, { name: "Thé vert", categoryName: "Boissons" }];
    expect(filterProductsBySearch(list, "thé")).toHaveLength(1);
    expect(filterProductsBySearch(list, "")).toHaveLength(2);
  });
});
