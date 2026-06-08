export type AuthProduct = "monitoring" | "esopay";

export function resolveAuthProduct(raw: unknown): AuthProduct {
  return raw === "esopay" ? "esopay" : "monitoring";
}

export function productDestination(product: AuthProduct): "/dashboard" | "/esopay/open" {
  return product === "esopay" ? "/esopay/open" : "/dashboard";
}

/** Supabase email-confirm redirect — must be allowlisted in Supabase Auth URL config. */
export function buildAuthCallbackUrl(product: AuthProduct, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "https://app.eso-energy.com");
  return `${base}/auth/callback?product=${product}`;
}

export function productFromUserMetadata(
  metadata: Record<string, unknown> | undefined,
): AuthProduct | null {
  const raw = metadata?.preferred_product;
  return raw === "monitoring" || raw === "esopay" ? raw : null;
}

const MIN_PASSWORD_LENGTH = 8;

export function validateSignupPassword(password: string, confirmPassword: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}
