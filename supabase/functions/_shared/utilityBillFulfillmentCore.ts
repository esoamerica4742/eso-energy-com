export const PENDING_FULFILLMENT_USER_MESSAGE =
  "Payment Received! The DisCo network is currently undergoing brief maintenance. Your token is safely queued and our system will automatically deliver it via SMS and Push Notification the moment the grid pipes clear.";

export const PENDING_FULFILLMENT_STATUS = "pending_fulfillment" as const;

export const MAX_PAY_ATTEMPTS = 3;
export const RETRY_BASE_MS = 1_000;

export class UtilityBillPayError extends Error {
  httpStatus?: number;
  responseCode?: string;
  discoDowntime: boolean;
  retryable: boolean;

  constructor(
    message: string,
    opts?: {
      httpStatus?: number;
      responseCode?: string;
      discoDowntime?: boolean;
      retryable?: boolean;
    },
  ) {
    super(message);
    this.name = "UtilityBillPayError";
    this.httpStatus = opts?.httpStatus;
    this.responseCode = opts?.responseCode;
    this.discoDowntime = opts?.discoDowntime ?? false;
    this.retryable = opts?.retryable ?? false;
  }
}

export function isRetryableGatewayStatus(httpStatus?: number): boolean {
  return httpStatus === 504 || httpStatus === 502 || httpStatus === 503 || httpStatus === 408;
}

export function isDiscoDowntimeError(err: unknown): boolean {
  if (err instanceof UtilityBillPayError) {
    return err.discoDowntime;
  }

  const httpStatus = (err as { httpStatus?: number })?.httpStatus;
  if (isRetryableGatewayStatus(httpStatus)) return true;

  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("gateway") ||
    message.includes("unavailable") ||
    message.includes("maintenance") ||
    message.includes("504") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("disco") ||
    message.includes("network")
  );
}

export function normalizePayBillError(err: unknown): UtilityBillPayError {
  if (err instanceof UtilityBillPayError) return err;

  const httpStatus = (err as { httpStatus?: number })?.httpStatus;
  const responseCode = (err as { code?: string })?.code;
  const message = err instanceof Error ? err.message : "Payment failed";
  const discoDowntime = isDiscoDowntimeError(err);

  return new UtilityBillPayError(message, {
    httpStatus,
    responseCode,
    discoDowntime,
    retryable: isRetryableGatewayStatus(httpStatus) || discoDowntime,
  });
}

export function backoffMs(attemptIndex: number): number {
  return RETRY_BASE_MS * Math.pow(2, attemptIndex);
}
