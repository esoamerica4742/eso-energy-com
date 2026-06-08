/**
 * Pure Monnify bill-pay pipeline rules (testable without Deno fetch).
 */

import type { MonnifyBillerProduct, MonnifyValidateCustomerBody } from "./monnify.ts";

export class MonnifyPipelineError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MonnifyPipelineError";
    this.code = code;
  }
}

export type MonnifyBillDiscoveryInput = {
  categoryCode: string;
  billerCode: string;
  productCode: string;
};

export type MonnifyBillDiscoveryResult = {
  categoryCode: string;
  billerCode: string;
  billerName: string;
  productCode: string;
  productName: string;
  requiresValidation: boolean;
};

/**
 * Step 1 — Discovery: confirm biller exists under category and product under biller.
 */
export function resolveDiscoveredProduct(
  input: MonnifyBillDiscoveryInput,
  billers: Array<{ code: string; name: string }>,
  products: MonnifyBillerProduct[],
): MonnifyBillDiscoveryResult {
  const categoryCode = input.categoryCode.trim().toUpperCase();
  const billerCode = input.billerCode.trim();
  const productCode = input.productCode.trim();

  if (!categoryCode || !billerCode || !productCode) {
    throw new MonnifyPipelineError(
      "DISCOVERY_INPUT_INVALID",
      "categoryCode, billerCode, and productCode are required",
    );
  }

  const biller = billers.find((b) => b.code === billerCode);
  if (!biller) {
    throw new MonnifyPipelineError(
      "BILLER_NOT_FOUND",
      `Biller ${billerCode} not found for category ${categoryCode}`,
    );
  }

  const product = products.find((p) => p.code === productCode);
  if (!product) {
    throw new MonnifyPipelineError(
      "PRODUCT_NOT_FOUND",
      `Product ${productCode} not found for biller ${billerCode}`,
    );
  }

  return {
    categoryCode,
    billerCode,
    billerName: biller.name,
    productCode,
    productName: product.name,
    requiresValidation: product.requiresValidation ?? true,
  };
}

/**
 * Step 2 — Validation: require a validationReference when Monnify marks validation mandatory.
 */
export function requireValidationReference(
  validation: MonnifyValidateCustomerBody,
  discovery: MonnifyBillDiscoveryResult,
): string {
  const ref = validation.validationReference?.trim();
  const requires = validation.requiresValidationRef ?? discovery.requiresValidation;

  if (requires && !ref) {
    throw new MonnifyPipelineError(
      "VALIDATION_REFERENCE_REQUIRED",
      "Monnify customer validation did not return validationReference",
    );
  }

  return ref ?? "";
}
