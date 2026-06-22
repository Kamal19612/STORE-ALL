import { describe, expect, it } from "vitest";
import {
  isDisplayablePdfFieldValue,
  parsePdfFieldSummaryForDisplay,
} from "./pdfFieldDisplay";

describe("pdfFieldDisplay", () => {
  it("excludes empty and unchecked fields", () => {
    const fields = parsePdfFieldSummaryForDisplay({
      nom_client: "Kamal",
      message: "",
      accepte: false,
      note: "   ",
    });
    expect(fields).toHaveLength(1);
    expect(fields[0].value).toBe("Kamal");
  });

  it("isDisplayablePdfFieldValue", () => {
    expect(isDisplayablePdfFieldValue("")).toBe(false);
    expect(isDisplayablePdfFieldValue(false)).toBe(false);
    expect(isDisplayablePdfFieldValue(true)).toBe(true);
    expect(isDisplayablePdfFieldValue("  ok ")).toBe(true);
  });
});
