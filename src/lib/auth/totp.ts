/**
 * TOTP (2FA) setup and verification — server-side only.
 *
 * WHY: TOTP secret must never touch the client DB or logs.
 * Flow: generate → encrypt with Web Crypto → store blob → verify decrypts in-memory only.
 */
import { generateSecret, generateURI, generate, verify } from "otplib";
import bcrypt from "bcryptjs";
import { encryptTotpSecret, decryptTotpSecret } from "@/lib/encryption";
import { getServerEnv } from "@/lib/env";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BACKUP_CODE_COUNT = 10;
const BCRYPT_ROUNDS = 12;
// NOTE: Supabase generated types are currently incomplete for security tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export type TotpSetupResult = {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
};

/**
 * Begin 2FA setup: generate secret, encrypt, persist blob (not yet enabled).
 * WHY: User must verify a code before totp_enabled=true — prevents orphan secrets.
 */
export async function beginTotpSetup(userId: string): Promise<TotpSetupResult> {
  const env = getServerEnv();
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: env.TOTP_ISSUER,
    label: userId,
    secret,
  });

  const { totp_secret_encrypted, totp_key_version } = await encryptTotpSecret(secret);

  const backupCodes = generateBackupCodes();
  const backupHashes = await Promise.all(
    backupCodes.map((code) => bcrypt.hash(code, BCRYPT_ROUNDS)),
  );

  const { error } = await db.from("user_security_settings").upsert(
    {
      user_id: userId,
      totp_secret_encrypted,
      totp_key_version,
      totp_enabled: false,
      backup_code_hashes: backupHashes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(`Failed to persist TOTP setup: ${error.message}`);

  return { secret, otpauthUrl, backupCodes };
}

/**
 * Confirm first TOTP code — enables 2FA gate for dashboard access.
 */
export async function confirmTotpSetup(userId: string, token: string): Promise<boolean> {
  const valid = await verifyTotpCode(userId, token);
  if (!valid) return false;

  const { error } = await db
    .from("user_security_settings")
    .update({
      totp_enabled: true,
      totp_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to enable TOTP: ${error.message}`);
  return true;
}

/**
 * Verify a 6-digit TOTP code against encrypted secret.
 * WHY: Decrypt happens in-process only; plaintext never persisted or logged.
 */
export async function verifyTotpCode(userId: string, token: string): Promise<boolean> {
  const { data, error } = await db
    .from("user_security_settings")
    .select("totp_secret_encrypted, totp_key_version")
    .eq("user_id", userId)
    .single();

  if (error || !data?.totp_secret_encrypted) return false;

  let secret: string;
  try {
    secret = await decryptTotpSecret(
      data.totp_secret_encrypted,
      data.totp_key_version ?? 1,
    );
  } catch {
    return false;
  }

  const result = await verify({ secret, token });
  return result.valid;
}

/**
 * Verify and consume a single backup code (bcrypt one-way compare).
 */
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const normalized = code.replace(/\s/g, "").toUpperCase();
  const { data, error } = await db
    .from("user_security_settings")
    .select("backup_code_hashes")
    .eq("user_id", userId)
    .single();

  if (error || !data?.backup_code_hashes?.length) return false;

  const hashes = data.backup_code_hashes as string[];
  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i];
    if (!hash) continue;
    const match = await bcrypt.compare(normalized, hash);
    if (match) {
      const remaining = [...hashes];
      remaining.splice(i, 1);
      await db
        .from("user_security_settings")
        .update({ backup_code_hashes: remaining, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return true;
    }
  }
  return false;
}

/** Enforce 2FA gate — no dashboard without totp_enabled. */
export async function isTotpEnforced(userId: string): Promise<boolean> {
  const { data } = await db
    .from("user_security_settings")
    .select("totp_enabled")
    .eq("user_id", userId)
    .single();
  return data?.totp_enabled === true;
}

export async function requiresTotpSetup(userId: string): Promise<boolean> {
  const { data } = await db
    .from("user_security_settings")
    .select("totp_enabled")
    .eq("user_id", userId)
    .single();
  return data?.totp_enabled !== true;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    codes.push(`${hex.slice(0, 5)}-${hex.slice(5, 10)}`);
  }
  return codes;
}
