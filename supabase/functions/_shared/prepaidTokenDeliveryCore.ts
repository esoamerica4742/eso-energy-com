export type PrepaidTokenDeliveryInput = {
  meterName: string;
  token: string;
  amountKobo: number;
  accountNumber?: string;
  paymentReference?: string;
};

export type PrepaidTokenDeliveryPayload = {
  token_raw: string;
  token_formatted: string;
  sms_body: string;
  push_body: string;
};

export function normalizePrepaidTokenDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 20) return digits.slice(0, 20);
  return digits;
}

export function formatPrepaidTokenDisplay(raw: string): string {
  const digits = normalizePrepaidTokenDigits(raw);
  if (!digits) return raw.trim();

  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join("-");
}

export function formatNairaWhole(amountKobo: number): string {
  const naira = Math.round(amountKobo / 100);
  return naira.toLocaleString("en-NG");
}

export function buildPrepaidTokenSmsBody(input: PrepaidTokenDeliveryInput): string {
  const formatted = formatPrepaidTokenDisplay(input.token);
  const amount = formatNairaWhole(input.amountKobo);
  const meterName = input.meterName.trim() || input.accountNumber || "your meter";
  return (
    `Eso Pay: Your prepaid power token for ${meterName} is: ${formatted}. Amount: ₦${amount}. Thank you for using Power Shield!`
  );
}

export function buildPrepaidTokenPushBody(token: string): string {
  return normalizePrepaidTokenDigits(token) || token.trim();
}

export function buildPrepaidTokenDeliveryPayload(
  input: PrepaidTokenDeliveryInput,
): PrepaidTokenDeliveryPayload {
  const token_raw = buildPrepaidTokenPushBody(input.token);
  const token_formatted = formatPrepaidTokenDisplay(input.token);
  return {
    token_raw,
    token_formatted,
    sms_body: buildPrepaidTokenSmsBody(input),
    push_body: token_raw,
  };
}
