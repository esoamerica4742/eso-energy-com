/**
 * Startup validation for all security-sensitive environment variables.
 * WHY: Fail fast at boot — never run with missing crypto keys or auth secrets.
 * Cloudflare Workers Secrets inject the same names at runtime.
 */
import { z } from "zod";

/** 32-byte AES-256 key as 64-char hex (Cloudflare Workers Secret). */
const hexKey64 = z
  .string()
  .length(64, "ENCRYPTION_MASTER_KEY must be 64 hex chars (32 bytes)")
  .regex(/^[0-9a-fA-F]+$/, "ENCRYPTION_MASTER_KEY must be hexadecimal");

const serverEnvSchema = z.object({
  // Supabase — required for all server operations
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url().optional(),

  // Application crypto — TOTP secrets, API tokens at rest (never in DB/code)
  ENCRYPTION_MASTER_KEY: hexKey64,
  /** Optional during key rotation dual-read window */
  ENCRYPTION_MASTER_KEY_V2: hexKey64.optional(),

  // Auth / sessions
  AUTH_SECRET: z.string().min(64, "AUTH_SECRET must be at least 64 chars"),
  AUTH_URL: z.string().url(),
  TOTP_ISSUER: z.string().min(1).default("ESO Energy Command Deck"),

  // Email magic links
  RESEND_API_KEY: z.string().min(1).optional(),

  // Rate limiting (Upstash Redis)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // WebAuthn RP ID — must match deployed hostname
  WEBAUTHN_RP_ID: z.string().min(1).optional(),
  WEBAUTHN_ORIGIN: z.string().url().optional(),

  // Enode (server-only)
  ENODE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  ENODE_CLIENT_ID: z.string().min(1).optional(),
  ENODE_CLIENT_SECRET: z.string().min(1).optional(),
  ENODE_WEBHOOK_SECRET: z.string().min(16).optional(),
  ENODE_LINK_REDIRECT_URI: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let _cached: ServerEnv | undefined;

/**
 * Parse and validate server env. Call once at server cold start.
 * WHY: Prevents silent misconfiguration that would store secrets unencrypted.
 */
export function getServerEnv(): ServerEnv {
  if (_cached) return _cached;
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[Security] Invalid server environment:\n${issues}`);
  }
  _cached = result.data;
  return _cached;
}

/** Client-safe vars only (VITE_ prefix). Never include secrets here. */
const clientEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getClientEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse(import.meta.env);
  if (!result.success) {
    throw new Error("[Security] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  }
  return result.data;
}
