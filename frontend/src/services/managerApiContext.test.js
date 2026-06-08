import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetState = vi.fn();

vi.mock("../store/authStore", () => ({
  default: { getState: () => mockGetState() },
}));

import { getManagerApiPrefix } from "./managerApiContext";

describe("getManagerApiPrefix", () => {
  beforeEach(() => {
    mockGetState.mockReturnValue({ user: { storeId: 7 } });
  });

  it("utilise le storeId du compte connecté par défaut", () => {
    expect(getManagerApiPrefix()).toBe("/manager/7");
  });

  it("priorise le storeId passé en argument (navigation super → boutique)", () => {
    expect(getManagerApiPrefix(12)).toBe("/manager/12");
    expect(getManagerApiPrefix("15")).toBe("/manager/15");
  });

  it("rejette l’absence d’identifiant boutique", () => {
    mockGetState.mockReturnValue({ user: {} });
    expect(() => getManagerApiPrefix()).toThrow(/manquant/);
  });

  it("rejette un identifiant non numérique", () => {
    expect(() => getManagerApiPrefix("abc")).toThrow(/invalide/);
  });
});

describe("Conventions chemins API (base axios /api)", () => {
  it("préfixe supervision super admin", () => {
    expect("/super/stores").toMatch(/^\/super\//);
    expect("/super/products/export-csv").toMatch(/^\/super\//);
  });

  it("préfixe espace manager par boutique", () => {
    expect("/manager/42/orders").toMatch(/^\/manager\/\d+\//);
    expect("/manager/1/settings").toMatch(/^\/manager\/\d+\/settings$/);
  });

  it("login JSON sous la base /api", () => {
    expect("/login").toBe("/login");
  });
});
