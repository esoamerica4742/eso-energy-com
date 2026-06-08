/**
 * Eso Pay BFF — Monnify wallet, funding, bills, utility payments.
 * Mobile never calls Monnify directly.
 */
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import {
  assertCanPay,
  billPaymentToApi,
  billRowToApi,
  createServiceClient,
  ensureReservedAccountOnWallet,
  ensureUserWallet,
  getUtilityProvider,
  providersToApi,
  reservedAccountToApi,
  resolveEsoPayAuth,
  resolveWalletUserId,
  syncUtilityProviders,
  ensureUtilityProvidersCatalog,
  walletToApi,
  walletTransactionToApi,
} from "../_shared/esopay.ts";
import { getMonnifyAccessToken, isMonnifyConfigured, validateBillCustomer } from "../_shared/monnify.ts";
import { executeMonnifyBillPipelineForProvider } from "../_shared/monnifyBillPipeline.ts";
import {
  deliverPrepaidTokenMultiChannel,
  formatPrepaidTokenDisplay,
  resolveMeterDisplayName,
} from "../_shared/prepaidTokenDelivery.ts";
import {
  isDiscoDowntimeError,
  PENDING_FULFILLMENT_STATUS,
  PENDING_FULFILLMENT_USER_MESSAGE,
  processPendingUtilityFulfillment,
} from "../_shared/utilityBillFulfillment.ts";
import {
  evaluatePowerShieldAlerts,
  listPowerShieldMeters,
  refreshMeterAfterPurchase,
  registerEsoPayPushToken,
  syncPowerShieldMeters,
  submitPowerShieldFeedback,
  updatePowerShieldMeter,
} from "../_shared/powerShield.ts";
import { evaluateEsoPayWalletThresholdMonitor } from "../_shared/walletThresholdMonitor.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  if (req.method === "POST" && path === "/power-shield/cron") {
    const secret = req.headers.get("X-Cron-Secret") ?? "";
    const expected = Deno.env.get("ESO_PAY_CRON_SECRET") ?? "";
    if (!expected || secret !== expected) {
      return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }
    const supabase = createServiceClient();
    const result = await evaluateEsoPayWalletThresholdMonitor(supabase, {
      sendPush: true,
    });
    return jsonResponse({ ok: true, ...result });
  }

  if (req.method === "POST" && path === "/utilities/fulfillment/cron") {
    const secret = req.headers.get("X-Cron-Secret") ?? "";
    const expected = Deno.env.get("ESO_PAY_CRON_SECRET") ?? "";
    if (!expected || secret !== expected) {
      return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }
    const supabase = createServiceClient();
    const result = await processPendingUtilityFulfillment(supabase);
    return jsonResponse({ ok: true, ...result });
  }

  const auth = await resolveEsoPayAuth(req);
  if (!auth) return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);

  const supabase = createServiceClient();

  try {
    const walletUserId = await resolveWalletUserId(req, auth);

    if (req.method === "GET" && path === "/health/monnify") {
      if (!isMonnifyConfigured()) {
        return jsonResponse({
          ok: false,
          code: "MONNIFY_NOT_CONFIGURED",
          message:
            "Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE, and MONNIFY_ENV on Supabase edge secrets.",
        }, 503);
      }
      try {
        await getMonnifyAccessToken();
        return jsonResponse({ ok: true, code: "MONNIFY_OK", env: Deno.env.get("MONNIFY_ENV") ?? "sandbox" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Monnify auth failed";
        return jsonResponse({ ok: false, code: "MONNIFY_AUTH_FAILED", message }, 503);
      }
    }

    if (req.method === "GET" && path === "/wallet") {
      const wallet = await ensureUserWallet(supabase, walletUserId);
      return jsonResponse(walletToApi(wallet));
    }

    if (req.method === "GET" && path === "/wallet/transactions") {
      const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));
      const category = (url.searchParams.get("category") ?? "all").toLowerCase();
      const from = (page - 1) * limit;

      let query = supabase
        .from("wallet_transactions")
        .select("*", { count: "exact" })
        .eq("user_id", walletUserId);

      if (category === "wallet") {
        query = query.in("type", ["credit", "refund", "reversal"]);
      } else if (category === "bills") {
        query = query.in("type", ["bill_payment", "debit"]);
      } else if (category === "airtime") {
        query = query.or(
          "narration.ilike.%MTN%,narration.ilike.%Airtel%,narration.ilike.%Glo%,narration.ilike.%9mobile%,narration.ilike.%airtime%,narration.ilike.%data%",
        );
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, from + limit - 1);

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({
        data: (data ?? []).map((row) => walletTransactionToApi(row)),
        page,
        limit,
        total: count ?? 0,
      });
    }

    if (path === "/wallet/reserved-account") {
      let wallet = await ensureUserWallet(supabase, walletUserId);
      const shouldProvision =
        req.method === "POST" || !wallet.reserved_account_number;
      if (shouldProvision) {
        try {
          wallet = await ensureReservedAccountOnWallet(
            supabase,
            wallet,
            walletUserId,
          );
        } catch (provisionErr) {
          if (req.method === "GET") {
            const message = provisionErr instanceof Error
              ? provisionErr.message
              : "Reserved account not provisioned";
            const code = (provisionErr as { code?: string }).code ??
              (message.includes("Monnify is not configured")
                ? "MONNIFY_NOT_CONFIGURED"
                : "RESERVED_ACCOUNT_UNAVAILABLE");
            return jsonResponse({ error: message, code }, 503);
          }
          throw provisionErr;
        }
      }
      if (!wallet.reserved_account_number) {
        return jsonResponse({
          error: "Reserved account not provisioned",
          code: "NOT_FOUND",
        }, 404);
      }
      if (req.method === "GET" || req.method === "POST") {
        return jsonResponse(reservedAccountToApi(wallet));
      }
    }

    if (req.method === "POST" && path === "/wallet/funding-intents") {
      const body = (await req.json()) as {
        amount_kobo?: number;
        idempotency_key?: string;
      };
      const amountKobo = Number(body.amount_kobo ?? 0);
      if (!amountKobo || amountKobo <= 0) {
        return jsonResponse({ error: "amount_kobo is required" }, 400);
      }
      const idempotencyKey = body.idempotency_key ??
        req.headers.get("Idempotency-Key") ??
        `fund-${walletUserId}-${Date.now()}`;

      let wallet = await ensureUserWallet(supabase, walletUserId);
      wallet = await ensureReservedAccountOnWallet(supabase, wallet, walletUserId);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data: intent, error } = await supabase
        .from("eso_pay_funding_intents")
        .upsert(
          {
            user_id: walletUserId,
            amount_kobo: amountKobo,
            reserved_account_reference: wallet.monnify_account_reference,
            idempotency_key: idempotencyKey,
            status: "pending",
            expires_at: expiresAt,
          },
          { onConflict: "idempotency_key" },
        )
        .select("id")
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({
        funding_intent_id: intent.id,
        reserved_account: reservedAccountToApi(wallet),
        amount_kobo: amountKobo,
        expires_at: expiresAt,
      });
    }

    if (req.method === "GET" && path === "/bills") {
      const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));

      return jsonResponse({
        data: [],
        page,
        limit,
        total: 0,
      });
    }

    if (req.method === "GET" && path === "/bills/summary") {
      const wallet = await ensureUserWallet(supabase, walletUserId);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: purchases, error } = await supabase
        .from("utility_purchases")
        .select("amount_kobo, status, created_at")
        .eq("user_id", walletUserId)
        .gte("created_at", monthStart);

      if (error) return jsonResponse({ error: error.message }, 500);

      let currentMonthBillCount = 0;
      for (const purchase of purchases ?? []) {
        if (purchase.status === "success") currentMonthBillCount += 1;
      }

      return jsonResponse({
        totalOutstandingKobo: 0,
        totalOffsetKobo: 0,
        overdueCount: 0,
        currentMonthBillCount,
        walletBalanceKobo: wallet.balance_kobo,
      });
    }

    const billDetailMatch = path.match(/^\/bills\/([^/]+)$/);
    if (req.method === "GET" && billDetailMatch) {
      const billId = billDetailMatch[1];
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("id", billId)
        .eq("user_id", walletUserId)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      if (!data) return jsonResponse({ error: "Bill not found" }, 404);
      return jsonResponse(billRowToApi(data));
    }

    const offsetsMatch = path.match(/^\/bills\/([^/]+)\/offsets$/);
    if (req.method === "GET" && offsetsMatch) {
      const billId = offsetsMatch[1];
      const { data, error } = await supabase
        .from("inverter_offsets")
        .select("*")
        .eq("bill_id", billId)
        .eq("user_id", walletUserId);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({
        offsets: (data ?? []).map((row) => ({
          id: row.id,
          bill_id: row.bill_id,
          company_id: row.company_id,
          inverter_id: row.inverter_id,
          inverter_serial: row.inverter_serial,
          generation_kwh: Number(row.generation_kwh),
          offset_kwh: Number(row.offset_kwh),
          tariff_rate_per_kwh: Number(row.tariff_rate_per_kwh),
          offset_value_kobo: row.offset_value_kobo,
          offset_percentage: Number(row.offset_percentage),
          calculation_method: row.calculation_method,
          data_source: row.data_source,
        })),
      });
    }

    const paymentsMatch = path.match(/^\/bills\/([^/]+)\/payments$/);
    if (req.method === "GET" && paymentsMatch) {
      const billId = paymentsMatch[1];
      const { data, error } = await supabase
        .from("monnify_bill_payments")
        .select("*")
        .eq("bill_id", billId)
        .eq("user_id", walletUserId)
        .order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse((data ?? []).map((row) => billPaymentToApi(row)));
    }

    const payMatch = path.match(/^\/bills\/([^/]+)\/pay$/);
    if (req.method === "POST" && payMatch) {
      await assertCanPay(supabase, auth.userId);
      const billId = payMatch[1];
      const body = (await req.json().catch(() => ({}))) as { idempotency_key?: string };
      const idempotencyKey = body.idempotency_key ??
        req.headers.get("Idempotency-Key") ??
        `${billId}-${auth.userId}-${Date.now()}`;

      const { data: bill, error: billError } = await supabase
        .from("bills")
        .select("*")
        .eq("id", billId)
        .eq("user_id", walletUserId)
        .maybeSingle();

      if (billError) return jsonResponse({ error: billError.message }, 500);
      if (!bill) return jsonResponse({ error: "Bill not found" }, 404);
      if (bill.status === "paid") {
        return jsonResponse({ error: "Bill already paid", code: "BILL_ALREADY_PAID" }, 409);
      }

      const wallet = await ensureUserWallet(supabase, walletUserId);
      const amountKobo = Number(bill.net_amount_kobo);
      if (wallet.balance_kobo < amountKobo) {
        return jsonResponse(
          {
            error: "Wallet balance is too low. Fund your wallet and try again.",
            code: "INSUFFICIENT_WALLET_BALANCE",
          },
          402,
        );
      }

      const { data: existingPayment } = await supabase
        .from("monnify_bill_payments")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingPayment?.status === "success") {
        return jsonResponse({
          bill_payment: billPaymentToApi(existingPayment),
          wallet: walletToApi(wallet),
        });
      }

      const paymentReference = `eso-bill-${billId.slice(0, 8)}-${Date.now()}`;

      const { data: provider } = await supabase
        .from("utility_providers")
        .select("*")
        .ilike("name", `%${bill.utility_provider}%`)
        .limit(1)
        .maybeSingle();

      const billerCode = provider?.monnify_biller_code ?? Deno.env.get("MONNIFY_DEFAULT_BILLER_CODE") ?? "";
      const productCode = provider?.monnify_product_code ?? Deno.env.get("MONNIFY_DEFAULT_PRODUCT_CODE") ?? "";

      if (!billerCode || !productCode) {
        return jsonResponse(
          { error: "No Monnify biller mapped for this utility. Sync providers first." },
          422,
        );
      }

      const { data: pendingPayment, error: pendingError } = await supabase
        .from("monnify_bill_payments")
        .insert({
          bill_id: billId,
          user_id: walletUserId,
          monnify_payment_reference: paymentReference,
          monnify_biller_code: billerCode,
          customer_account_number: bill.account_number,
          amount_kobo: amountKobo,
          status: "processing",
          idempotency_key: idempotencyKey,
          initiated_by: auth.userId,
        })
        .select("*")
        .single();

      if (pendingError && !pendingError.message.includes("duplicate")) {
        return jsonResponse({ error: pendingError.message }, 500);
      }

      await supabase
        .from("bills")
        .update({ status: "payment_initiated" })
        .eq("id", billId);

      const { data: walletTx, error: debitError } = await supabase.rpc("esopay_debit_wallet", {
        p_company_id: walletUserId,
        p_amount_kobo: amountKobo,
        p_type: "bill_payment",
        p_monnify_payment_ref: paymentReference,
        p_narration: `Bill payment ${bill.utility_provider}`,
        p_metadata: { bill_id: billId },
        p_idempotency_key: idempotencyKey,
      });

      if (debitError) {
        const isInsufficient = debitError.message.includes("insufficient");
        return jsonResponse(
          {
            error: debitError.message,
            code: isInsufficient ? "INSUFFICIENT_WALLET_BALANCE" : "WALLET_DEBIT_FAILED",
          },
          isInsufficient ? 402 : 500,
        );
      }

      let monnifyResult;
      try {
        const pipeline = await executeMonnifyBillPipelineForProvider(
          {
            category: provider?.category ?? "electricity",
            monnify_biller_code: billerCode,
            monnify_product_code: productCode,
          },
          {
            customerId: bill.account_number,
            amountKobo,
            paymentReference,
          },
        );
        monnifyResult = pipeline.payResult;
      } catch (payErr) {
        const message = payErr instanceof Error ? payErr.message : "Monnify payment failed";
        await supabase.rpc("esopay_credit_wallet", {
          p_company_id: walletUserId,
          p_amount_kobo: amountKobo,
          p_monnify_tx_ref: `refund-${paymentReference}`,
          p_monnify_payment_ref: paymentReference,
          p_narration: `Refund — bill payment failed`,
          p_metadata: { bill_id: billId, refund: true },
        });
        await supabase
          .from("monnify_bill_payments")
          .update({
            status: "failed",
            failure_message: message,
            completed_at: new Date().toISOString(),
          })
          .eq("monnify_payment_reference", paymentReference);

        return jsonResponse({ error: message, code: "MONNIFY_PAY_FAILED" }, 502);
      }

      const txRef = monnifyResult.transactionReference ?? paymentReference;
      const terminalStatus = monnifyResult.status === "FAILED" ? "failed" : "success";

      const { data: billPayment, error: updatePayError } = await supabase
        .from("monnify_bill_payments")
        .update({
          status: terminalStatus,
          monnify_transaction_reference: txRef,
          wallet_transaction_id: walletTx?.id ?? null,
          token_or_receipt: monnifyResult.rechargeToken ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("monnify_payment_reference", paymentReference)
        .select("*")
        .single();

      if (updatePayError) return jsonResponse({ error: updatePayError.message }, 500);

      if (terminalStatus === "success") {
        await supabase.from("bills").update({ status: "paid" }).eq("id", billId);
      }

      const { data: refreshedWallet } = await supabase
        .from("company_wallets")
        .select("*")
        .eq("user_id", walletUserId)
        .single();

      return jsonResponse({
        bill_payment: billPaymentToApi(billPayment ?? pendingPayment),
        wallet: walletToApi((refreshedWallet ?? wallet) as Parameters<typeof walletToApi>[0]),
      });
    }

    if (req.method === "GET" && path === "/utilities/providers") {
      try {
        const rows = await ensureUtilityProvidersCatalog(supabase);
        return jsonResponse(providersToApi(rows));
      } catch (err) {
        console.error("[eso-pay-api] utilities/providers", err);
        const message = err instanceof Error ? err.message : "Could not load billers";
        return jsonResponse({ error: message, code: "BILLERS_UNAVAILABLE" }, 503);
      }
    }

    if (req.method === "GET" && path === "/utilities/recent") {
      const limit = Math.min(12, Math.max(1, Number(url.searchParams.get("limit") ?? "8")));
      const { data: purchases, error: purchaseError } = await supabase
        .from("utility_purchases")
        .select(
          "id, utility_provider_id, account_number, amount_kobo, status, completed_at, created_at",
        )
        .eq("user_id", walletUserId)
        .eq("status", "success")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (purchaseError) {
        return jsonResponse({ error: purchaseError.message }, 500);
      }

      const rows = purchases ?? [];
      const providerIds = [...new Set(rows.map((row) => row.utility_provider_id).filter(Boolean))];
      let providerRows: Awaited<ReturnType<typeof getUtilityProvider>>[] = [];

      if (providerIds.length > 0) {
        const { data: providers, error: providerError } = await supabase
          .from("utility_providers")
          .select("*")
          .in("id", providerIds);
        if (providerError) {
          return jsonResponse({ error: providerError.message }, 500);
        }
        providerRows = providers ?? [];
      }

      const providerById = new Map(providerRows.map((row) => [row.id, row]));

      return jsonResponse({
        data: rows
          .map((row) => {
            const provider = providerById.get(row.utility_provider_id);
            if (!provider) return null;
            const apiProviders = providersToApi([provider]);
            return {
              id: row.id,
              provider: apiProviders[0],
              account_number: row.account_number,
              amount_kobo: row.amount_kobo,
              paid_at: row.completed_at ?? row.created_at,
            };
          })
          .filter(Boolean),
      });
    }

    if (req.method === "GET" && path === "/power-shield") {
      const dashboard = await listPowerShieldMeters(supabase, walletUserId);
      await evaluatePowerShieldAlerts(supabase, { userId: walletUserId, sendPush: true });
      return jsonResponse(dashboard);
    }

    if (req.method === "POST" && path === "/power-shield/sync") {
      await syncPowerShieldMeters(supabase, walletUserId);
      await evaluatePowerShieldAlerts(supabase, { userId: walletUserId, sendPush: true });
      const dashboard = await listPowerShieldMeters(supabase, walletUserId);
      return jsonResponse({ synced: dashboard.meters.length, ...dashboard });
    }

    const powerShieldMeterMatch = path.match(/^\/power-shield\/meters\/([^/]+)$/);
    if (req.method === "PATCH" && powerShieldMeterMatch) {
      const body = (await req.json()) as {
        label?: string;
        daily_spend_kobo?: number | null;
        auto_top_up_enabled?: boolean;
        notify_warn_10?: boolean;
        notify_critical_5?: boolean;
      };
      const meter = await updatePowerShieldMeter(
        supabase,
        walletUserId,
        powerShieldMeterMatch[1],
        body,
      );
      return jsonResponse(meter);
    }

    if (req.method === "POST" && path === "/power-shield/push-token") {
      const body = (await req.json()) as {
        expo_push_token?: string;
        platform?: string;
        app_version?: string;
        power_shield_enabled?: boolean;
      };
      if (!body.expo_push_token?.trim()) {
        return jsonResponse({ error: "expo_push_token required" }, 400);
      }
      const row = await registerEsoPayPushToken(supabase, walletUserId, {
        expo_push_token: body.expo_push_token.trim(),
        platform: body.platform ?? "android",
        app_version: body.app_version,
        power_shield_enabled: body.power_shield_enabled,
      });
      if (body.power_shield_enabled !== false) {
        await evaluatePowerShieldAlerts(supabase, { userId: walletUserId, sendPush: true });
      }
      return jsonResponse({ ok: true, id: row.id });
    }

    if (req.method === "POST" && path === "/power-shield/feedback") {
      const body = (await req.json()) as {
        meter_id?: string;
        context?: "post_payment" | "alert_check";
        outcome?: "accurate" | "too_early" | "too_late" | "no_blackout" | "had_blackout";
        predicted_depletion_at?: string | null;
        alert_level?: string | null;
        hours_remaining_at_feedback?: number | null;
      };

      const context = body.context;
      const outcome = body.outcome;
      if (
        !context ||
        !outcome ||
        !["post_payment", "alert_check"].includes(context) ||
        !["accurate", "too_early", "too_late", "no_blackout", "had_blackout"].includes(outcome)
      ) {
        return jsonResponse({ error: "Invalid feedback payload" }, 400);
      }

      const result = await submitPowerShieldFeedback(supabase, walletUserId, {
        meter_id: body.meter_id,
        context,
        outcome,
        predicted_depletion_at: body.predicted_depletion_at,
        alert_level: body.alert_level,
        hours_remaining_at_feedback: body.hours_remaining_at_feedback,
      });
      return jsonResponse(result);
    }

    if (req.method === "POST" && path === "/utilities/validate") {
      const body = (await req.json()) as {
        provider_id?: string;
        account_number?: string;
        amount_kobo?: number;
      };

      const provider = body.provider_id
        ? await getUtilityProvider(supabase, body.provider_id)
        : null;
      if (!provider) {
        return jsonResponse({ error: "Unknown provider" }, 404);
      }

      const accountNumber = (body.account_number ?? "").trim();
      if (accountNumber.length < 6) {
        return jsonResponse({
          valid: false,
          customer_name: null,
          minimum_amount_kobo: null,
          maximum_amount_kobo: null,
        });
      }

      try {
        const result = await validateBillCustomer({
          billerCode: provider.monnify_biller_code,
          productCode: provider.monnify_product_code,
          customerId: accountNumber,
          amount: body.amount_kobo,
        });

        return jsonResponse({
          valid: true,
          customer_name: result.customerName ?? null,
          minimum_amount_kobo: result.minimumAmount != null
            ? Math.round(result.minimumAmount * 100)
            : provider.minimum_amount_kobo,
          maximum_amount_kobo: result.maximumAmount != null
            ? Math.round(result.maximumAmount * 100)
            : provider.maximum_amount_kobo,
        });
      } catch {
        return jsonResponse({
          valid: false,
          customer_name: null,
          minimum_amount_kobo: provider.minimum_amount_kobo,
          maximum_amount_kobo: provider.maximum_amount_kobo,
        });
      }
    }

    if (req.method === "POST" && path === "/utilities/purchase") {
      await assertCanPay(supabase, auth.userId);
      const body = (await req.json()) as {
        provider_id?: string;
        account_number?: string;
        amount_kobo?: number;
        idempotency_key?: string;
        bill_id?: string;
      };

      const provider = body.provider_id
        ? await getUtilityProvider(supabase, body.provider_id)
        : null;
      if (!provider) return jsonResponse({ error: "Unknown provider" }, 404);

      const amountKobo = Number(body.amount_kobo ?? 0);
      if (!amountKobo || amountKobo <= 0) {
        return jsonResponse({ error: "amount_kobo is required" }, 400);
      }

      const accountNumber = (body.account_number ?? "").trim();
      const idempotencyKey = body.idempotency_key ??
        req.headers.get("Idempotency-Key") ??
        `util-${auth.userId}-${Date.now()}`;

      const wallet = await ensureUserWallet(supabase, walletUserId);
      if (wallet.balance_kobo < amountKobo) {
        return jsonResponse(
          {
            error: "Wallet balance is too low. Fund your wallet and try again.",
            code: "INSUFFICIENT_WALLET_BALANCE",
          },
          402,
        );
      }

      const { data: existing } = await supabase
        .from("utility_purchases")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing?.status === "success" || existing?.status === PENDING_FULFILLMENT_STATUS) {
        return jsonResponse({
          payment_reference: existing.monnify_payment_reference,
          transaction_reference: existing.monnify_transaction_reference ?? "",
          status: existing.status,
          wallet_transaction_id: existing.wallet_transaction_id,
          token_or_receipt: existing.token_or_receipt,
          user_message: existing.status === PENDING_FULFILLMENT_STATUS
            ? PENDING_FULFILLMENT_USER_MESSAGE
            : undefined,
          code: existing.status === PENDING_FULFILLMENT_STATUS
            ? "PENDING_FULFILLMENT"
            : undefined,
        });
      }

      const paymentReference = `eso-util-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

      const { data: walletTx, error: debitError } = await supabase.rpc("esopay_debit_wallet", {
        p_company_id: walletUserId,
        p_amount_kobo: amountKobo,
        p_type: "bill_payment",
        p_monnify_payment_ref: paymentReference,
        p_narration: `${provider.name} — ${accountNumber}`,
        p_metadata: { provider_id: provider.id, account_number: accountNumber },
        p_idempotency_key: idempotencyKey,
      });

      if (debitError) {
        const isInsufficient = debitError.message.includes("insufficient");
        return jsonResponse(
          {
            error: debitError.message,
            code: isInsufficient ? "INSUFFICIENT_WALLET_BALANCE" : "WALLET_DEBIT_FAILED",
          },
          isInsufficient ? 402 : 500,
        );
      }

      const isElectricity = provider.category === "electricity";
      const queuedAt = new Date().toISOString();

      await supabase.from("utility_purchases").upsert({
        user_id: walletUserId,
        utility_provider_id: provider.id,
        account_number: accountNumber,
        amount_kobo: amountKobo,
        status: "processing",
        monnify_payment_reference: paymentReference,
        wallet_transaction_id: walletTx?.id ?? null,
        idempotency_key: idempotencyKey,
        initiated_by: auth.userId,
      }, { onConflict: "idempotency_key" });

      let monnifyResult;
      try {
        const pipeline = await executeMonnifyBillPipelineForProvider(provider, {
          customerId: accountNumber,
          amountKobo,
          paymentReference,
        });
        monnifyResult = pipeline.payResult;
      } catch (payErr) {
        if (isElectricity && isDiscoDowntimeError(payErr)) {
          const message = payErr instanceof Error ? payErr.message : "DisCo network unavailable";
          await supabase
            .from("utility_purchases")
            .update({
              status: PENDING_FULFILLMENT_STATUS,
              failure_code: "DISCO_DOWNTIME",
              failure_message: message,
              fulfillment_queued_at: queuedAt,
              fulfillment_next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
              completed_at: null,
            })
            .eq("monnify_payment_reference", paymentReference);

          return jsonResponse({
            payment_reference: paymentReference,
            transaction_reference: paymentReference,
            status: PENDING_FULFILLMENT_STATUS,
            wallet_transaction_id: walletTx?.id ?? null,
            token_or_receipt: null,
            user_message: PENDING_FULFILLMENT_USER_MESSAGE,
            code: "PENDING_FULFILLMENT",
          });
        }

        const message = payErr instanceof Error ? payErr.message : "Payment failed";
        await supabase.rpc("esopay_credit_wallet", {
          p_company_id: walletUserId,
          p_amount_kobo: amountKobo,
          p_monnify_tx_ref: `refund-${paymentReference}`,
          p_monnify_payment_ref: paymentReference,
          p_narration: `Refund — ${provider.name}`,
          p_metadata: { provider_id: provider.id, refund: true },
        });
        await supabase
          .from("utility_purchases")
          .update({
            status: "failed",
            failure_code: "MONNIFY_PAY_FAILED",
            failure_message: message,
            completed_at: new Date().toISOString(),
          })
          .eq("monnify_payment_reference", paymentReference);

        return jsonResponse({ error: message, code: "MONNIFY_PAY_FAILED" }, 502);
      }

      const txRef = monnifyResult.transactionReference ?? paymentReference;
      const status = monnifyResult.status === "FAILED" ? "failed" : "success";

      await supabase.from("utility_purchases").upsert({
        user_id: walletUserId,
        utility_provider_id: provider.id,
        account_number: accountNumber,
        amount_kobo: amountKobo,
        status,
        monnify_payment_reference: paymentReference,
        monnify_transaction_reference: txRef,
        wallet_transaction_id: walletTx?.id ?? null,
        token_or_receipt: monnifyResult.rechargeToken ?? null,
        idempotency_key: idempotencyKey,
        initiated_by: auth.userId,
        completed_at: new Date().toISOString(),
      }, { onConflict: "idempotency_key" });

      if (body.bill_id && status === "success") {
        await supabase.from("bills").update({ status: "paid" }).eq("id", body.bill_id);
      }

      if (status === "success") {
        await refreshMeterAfterPurchase(
          supabase,
          walletUserId,
          provider.id,
          accountNumber,
        ).catch((err) => console.warn("[eso-pay-api] power-shield refresh", err));
      }

      const rawToken = monnifyResult.rechargeToken ?? null;
      let tokenFormatted: string | null = null;
      let meterName: string | null = null;

      if (
        status === "success" &&
        provider.category === "electricity" &&
        rawToken?.trim()
      ) {
        meterName = await resolveMeterDisplayName(
          supabase,
          walletUserId,
          provider.id,
          accountNumber,
          provider.name,
        );
        const delivered = await deliverPrepaidTokenMultiChannel(supabase, walletUserId, {
          meterName,
          token: rawToken,
          amountKobo,
          accountNumber,
          paymentReference,
        });
        tokenFormatted = delivered?.token_formatted ??
          formatPrepaidTokenDisplay(rawToken);
      }

      return jsonResponse({
        payment_reference: paymentReference,
        transaction_reference: txRef,
        status,
        wallet_transaction_id: walletTx?.id ?? null,
        token_or_receipt: rawToken,
        token_formatted: tokenFormatted,
        meter_name: meterName,
      });
    }

    if (req.method === "GET" && path === "/utilities/purchase/status") {
      const paymentReference = url.searchParams.get("payment_reference")?.trim() ?? "";
      if (!paymentReference) {
        return jsonResponse({ error: "payment_reference is required" }, 400);
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from("utility_purchases")
        .select(
          "status, token_or_receipt, monnify_transaction_reference, failure_message, utility_provider_id, account_number, amount_kobo",
        )
        .eq("user_id", walletUserId)
        .eq("monnify_payment_reference", paymentReference)
        .maybeSingle();

      if (purchaseError) return jsonResponse({ error: purchaseError.message }, 500);
      if (!purchase) return jsonResponse({ error: "Purchase not found" }, 404);

      const rawToken = purchase.token_or_receipt;
      let meterName: string | null = null;
      if (rawToken && purchase.utility_provider_id && purchase.account_number) {
        meterName = await resolveMeterDisplayName(
          supabase,
          walletUserId,
          purchase.utility_provider_id,
          purchase.account_number,
        );
      }

      return jsonResponse({
        payment_reference: paymentReference,
        transaction_reference: purchase.monnify_transaction_reference ?? paymentReference,
        status: purchase.status,
        token_or_receipt: rawToken,
        token_formatted: rawToken ? formatPrepaidTokenDisplay(rawToken) : null,
        meter_name: meterName,
        user_message: purchase.status === PENDING_FULFILLMENT_STATUS
          ? PENDING_FULFILLMENT_USER_MESSAGE
          : undefined,
        code: purchase.status === PENDING_FULFILLMENT_STATUS
          ? "PENDING_FULFILLMENT"
          : undefined,
      });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    console.error("[eso-pay-api]", err);
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Internal error";
    const code = (err as { code?: string }).code ??
      (message.includes("Monnify is not configured")
        ? "MONNIFY_NOT_CONFIGURED"
        : message.includes("Reserved account not provisioned")
        ? "RESERVED_ACCOUNT_UNAVAILABLE"
        : undefined);
    return jsonResponse({ error: message, code }, status);
  }
});

function normalizePath(pathname: string): string {
  const stripped = pathname
    .replace(/^\/functions\/v1\/eso-pay-api/, "")
    .replace(/^\/eso-pay-api/, "");
  return stripped || "/";
}
