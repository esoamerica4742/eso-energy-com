/**
 * Multi-channel prepaid token delivery (push + SMS). Formatting in prepaidTokenDeliveryCore.ts.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendExpoPush, type ExpoPushMessage } from "./expoPush.ts";
import {
  buildPrepaidTokenDeliveryPayload,
  normalizePrepaidTokenDigits,
  type PrepaidTokenDeliveryInput,
  type PrepaidTokenDeliveryPayload,
} from "./prepaidTokenDeliveryCore.ts";
import { sendTermiiSms } from "./termiiSms.ts";

export type { PrepaidTokenDeliveryInput, PrepaidTokenDeliveryPayload } from "./prepaidTokenDeliveryCore.ts";
export {
  buildPrepaidTokenDeliveryPayload,
  buildPrepaidTokenPushBody,
  buildPrepaidTokenSmsBody,
  formatPrepaidTokenDisplay,
  formatNairaWhole,
  normalizePrepaidTokenDigits,
} from "./prepaidTokenDeliveryCore.ts";

export async function resolveMeterDisplayName(
  supabase: SupabaseClient,
  userId: string,
  providerId: string,
  accountNumber: string,
  fallbackProviderName?: string,
): Promise<string> {
  const { data } = await supabase
    .from("prepaid_electricity_meters")
    .select("label")
    .eq("user_id", userId)
    .eq("utility_provider_id", providerId)
    .eq("account_number", accountNumber)
    .maybeSingle();

  const label = data?.label?.trim();
  if (label) return label;
  if (fallbackProviderName) return `${fallbackProviderName} · ${accountNumber}`;
  return accountNumber;
}

export async function deliverPrepaidTokenMultiChannel(
  supabase: SupabaseClient,
  userId: string,
  input: PrepaidTokenDeliveryInput,
): Promise<PrepaidTokenDeliveryPayload | null> {
  const tokenDigits = normalizePrepaidTokenDigits(input.token);
  if (!tokenDigits) return null;

  const payload = buildPrepaidTokenDeliveryPayload(input);

  const { data: pushTokens } = await supabase
    .from("eso_pay_push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId)
    .eq("enabled", true);

  const pushMessages: ExpoPushMessage[] = (pushTokens ?? []).map((row) => ({
    to: row.expo_push_token,
    title: "Your power token",
    body: payload.push_body,
    sound: "default",
    channelId: "power-shield",
    data: {
      type: "prepaid_token_delivered",
      token: payload.token_raw,
      account_number: input.accountNumber ?? null,
      payment_reference: input.paymentReference ?? null,
    },
  }));

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();

  await Promise.all([
    pushMessages.length > 0 ? sendExpoPush(pushMessages) : Promise.resolve(),
    profile?.phone
      ? sendTermiiSms(profile.phone, payload.sms_body)
      : Promise.resolve(),
  ]);

  return payload;
}
