/**
 * Monnify Bill Payment — strict 3-step pipeline for Eso Pay Bills.
 * 1. Discovery (categoryCode → biller → product)
 * 2. Validation (POST validate customer → validationReference)
 * 3. Vending (POST pay with validated payload)
 */

import {
  listBillerCategories,
  listBillers,
  listBillerProducts,
  payBill,
  utilityCategoryToMonnifyCategory,
  validateBillCustomer,
  type MonnifyPayBillBody,
} from "./monnify.ts";
import {
  MonnifyPipelineError,
  requireValidationReference,
  resolveDiscoveredProduct,
  type MonnifyBillDiscoveryInput,
  type MonnifyBillDiscoveryResult,
} from "./monnifyBillPipelineCore.ts";
import {
  backoffMs,
  isRetryableGatewayStatus,
  MAX_PAY_ATTEMPTS,
  normalizePayBillError,
} from "./utilityBillFulfillmentCore.ts";

async function payBillWithRetry(input: {
  billerCode: string;
  productCode: string;
  customerId: string;
  amountKobo: number;
  paymentReference: string;
  validationReference?: string;
}): Promise<MonnifyPayBillBody> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_PAY_ATTEMPTS; attempt++) {
    try {
      return await payBill({
        billerCode: input.billerCode,
        productCode: input.productCode,
        customerId: input.customerId,
        amountKobo: input.amountKobo,
        paymentReference: input.paymentReference,
        validationReference: input.validationReference,
      });
    } catch (err) {
      lastError = err;
      const normalized = normalizePayBillError(err);
      const shouldRetry =
        attempt < MAX_PAY_ATTEMPTS - 1 &&
        (normalized.httpStatus === 504 || isRetryableGatewayStatus(normalized.httpStatus));

      if (!shouldRetry) throw normalized;
      await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt)));
    }
  }

  throw normalizePayBillError(lastError);
}

export {
  MonnifyPipelineError,
  requireValidationReference,
  resolveDiscoveredProduct,
  utilityCategoryToMonnifyCategory,
};
export type { MonnifyBillDiscoveryInput, MonnifyBillDiscoveryResult };

export type MonnifyBillPipelineInput = MonnifyBillDiscoveryInput & {
  customerId: string;
  amountKobo: number;
  paymentReference: string;
};

export type MonnifyBillPipelineResult = {
  discovery: MonnifyBillDiscoveryResult;
  validationReference: string;
  customerName?: string;
  payResult: MonnifyPayBillBody;
};

export type UtilityProviderBillTarget = {
  category: string;
  monnify_biller_code: string;
  monnify_product_code: string;
};

export function providerToMonnifyDiscovery(
  provider: UtilityProviderBillTarget,
): MonnifyBillDiscoveryInput {
  return {
    categoryCode: utilityCategoryToMonnifyCategory(provider.category),
    billerCode: provider.monnify_biller_code,
    productCode: provider.monnify_product_code,
  };
}

/** Step 1 — Discovery via Monnify biller catalog APIs. */
export async function discoverMonnifyBillerProduct(
  input: MonnifyBillDiscoveryInput,
): Promise<MonnifyBillDiscoveryResult> {
  const categoryCode = input.categoryCode.trim().toUpperCase();

  const categories = await listBillerCategories();
  if (categories.length > 0 && !categories.some((c) => c.code === categoryCode)) {
    console.warn(
      `[monnify-pipeline] category ${categoryCode} not in Monnify category list; continuing`,
    );
  }

  const billers = await listBillers(categoryCode);
  const products = await listBillerProducts(input.billerCode);

  return resolveDiscoveredProduct(input, billers, products);
}

/** Steps 1–3 — full Monnify bill payment pipeline (auto re-vend safe). */
export async function executeMonnifyBillPipeline(
  input: MonnifyBillPipelineInput,
): Promise<MonnifyBillPipelineResult> {
  const customerId = input.customerId.trim();
  if (customerId.length < 6) {
    throw new MonnifyPipelineError(
      "CUSTOMER_ID_INVALID",
      "customerId must be at least 6 characters",
    );
  }

  if (!input.amountKobo || input.amountKobo <= 0) {
    throw new MonnifyPipelineError("AMOUNT_INVALID", "amountKobo must be positive");
  }

  const discovery = await discoverMonnifyBillerProduct(input);

  let validation;
  try {
    validation = await validateBillCustomer({
      billerCode: discovery.billerCode,
      productCode: discovery.productCode,
      customerId,
      amount: input.amountKobo,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Customer validation failed";
    throw new MonnifyPipelineError("VALIDATION_FAILED", message);
  }

  const validationReference = requireValidationReference(validation, discovery);

  const payResult = await payBillWithRetry({
    billerCode: discovery.billerCode,
    productCode: discovery.productCode,
    customerId,
    amountKobo: input.amountKobo,
    paymentReference: input.paymentReference,
    validationReference: validationReference || undefined,
  });

  return {
    discovery,
    validationReference,
    customerName: validation.customerName,
    payResult,
  };
}

/** Convenience wrapper for utility_providers rows. */
export async function executeMonnifyBillPipelineForProvider(
  provider: UtilityProviderBillTarget,
  input: Omit<MonnifyBillPipelineInput, keyof MonnifyBillDiscoveryInput>,
): Promise<MonnifyBillPipelineResult> {
  return executeMonnifyBillPipeline({
    ...providerToMonnifyDiscovery(provider),
    ...input,
  });
}
