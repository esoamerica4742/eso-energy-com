import { describe, expect, it } from "vitest";
import {
  MonnifyPipelineError,
  requireValidationReference,
  resolveDiscoveredProduct,
} from "../supabase/functions/_shared/monnifyBillPipelineCore.ts";

describe("monnify bill pipeline discovery", () => {
  it("resolves biller and product under category", () => {
    const result = resolveDiscoveredProduct(
      { categoryCode: "ELECTRICITY", billerCode: "IKEDC", productCode: "PREPAID" },
      [{ code: "IKEDC", name: "Ikeja Electric" }],
      [{ code: "PREPAID", name: "Prepaid Meter", requiresValidation: true }],
    );
    expect(result.billerName).toBe("Ikeja Electric");
    expect(result.productCode).toBe("PREPAID");
    expect(result.requiresValidation).toBe(true);
  });

  it("throws when biller missing from category", () => {
    expect(() =>
      resolveDiscoveredProduct(
        { categoryCode: "ELECTRICITY", billerCode: "MISSING", productCode: "PREPAID" },
        [{ code: "IKEDC", name: "Ikeja" }],
        [],
      ),
    ).toThrow(MonnifyPipelineError);
  });
});

describe("monnify bill pipeline validation", () => {
  it("requires validationReference when mandatory", () => {
    expect(() =>
      requireValidationReference(
        { requiresValidationRef: true },
        {
          categoryCode: "ELECTRICITY",
          billerCode: "IKEDC",
          billerName: "Ikeja",
          productCode: "PREPAID",
          productName: "Prepaid",
          requiresValidation: true,
        },
      ),
    ).toThrow(MonnifyPipelineError);
  });

  it("accepts validationReference for vending", () => {
    const ref = requireValidationReference(
      { validationReference: "VR-123", requiresValidationRef: true },
      {
        categoryCode: "ELECTRICITY",
        billerCode: "IKEDC",
        billerName: "Ikeja",
        productCode: "PREPAID",
        productName: "Prepaid",
        requiresValidation: true,
      },
    );
    expect(ref).toBe("VR-123");
  });
});
