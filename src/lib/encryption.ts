/**
 * Application-layer field encryption for secrets at rest (TOTP, tokens, PII).
 *
 * THREAT MODEL:
 * - DB breach → attacker gets ciphertext only; needs ENCRYPTION_MASTER_KEY from CF Secrets.
 * - Tampered rows → GCM auth tag verification fails on decrypt.
 * - Key rotation → totp_key_version column selects which env key to use (dual-read supported).
 *
 * ALGORITHM: AES-256-GCM via Web Crypto (edge-safe on Cloudflare Workers).
 * FORMAT: base64url( [version:1][iv:12][ciphertext+tag] )
 */
import { getServerEnv } from "./env";

/** Blob format version — bump if packing algorithm changes. */
const BLOB_VERSION = 1;
const IV_LENGTH = 12;
const GCM_TAG_BITS = 128;

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim();
  if (normalized.length % 2 !== 0) throw new Error("Invalid hex key length");
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const padded =
    encoded.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * Resolve AES key material by version for dual-read rotation.
 * WHY: During rotation both v1 and v2 keys may be valid in env simultaneously.
 */
function resolveKeyHex(keyVersion: number): string {
  const env = getServerEnv();
  if (keyVersion === 2) {
    if (!env.ENCRYPTION_MASTER_KEY_V2) {
      throw new Error("ENCRYPTION_MASTER_KEY_V2 required for key version 2");
    }
    return env.ENCRYPTION_MASTER_KEY_V2;
  }
  if (keyVersion === 1) return env.ENCRYPTION_MASTER_KEY;
  throw new Error(`Unsupported encryption key version: ${keyVersion}`);
}

async function importAesKey(keyHex: string): Promise<CryptoKey> {
  const raw = hexToBytes(keyHex);
  if (raw.length !== 32) {
    throw new Error("AES-256 requires exactly 32-byte key material");
  }
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt arbitrary UTF-8 string field.
 * @param plaintext - Value to protect (e.g. base32 TOTP secret)
 * @param keyVersion - Stored alongside row for rotation (default 1)
 */
export async function encryptField(
  plaintext: string,
  keyVersion = 1,
): Promise<{ ciphertext: string; keyVersion: number }> {
  const keyHex = resolveKeyHex(keyVersion);
  const cryptoKey = await importAesKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer, tagLength: GCM_TAG_BITS },
    cryptoKey,
    encoded.buffer as ArrayBuffer,
  );
  const packed = concat(
    new Uint8Array([BLOB_VERSION]),
    iv,
    new Uint8Array(cipherBuf),
  );
  return { ciphertext: bytesToBase64Url(packed), keyVersion };
}

/**
 * Decrypt field encrypted with encryptField().
 * WHY: Throws on tamper/wrong key — caller must fail closed (reject auth).
 */
export async function decryptField(ciphertext: string, keyVersion: number): Promise<string> {
  const packed = base64UrlToBytes(ciphertext);
  if (packed.length < 1 + IV_LENGTH + 16) {
    throw new Error("Ciphertext blob too short");
  }
  const version = packed[0];
  if (version !== BLOB_VERSION) {
    throw new Error(`Unsupported blob version: ${version}`);
  }
  const iv = packed.slice(1, 1 + IV_LENGTH);
  const cipherWithTag = packed.slice(1 + IV_LENGTH);
  const keyHex = resolveKeyHex(keyVersion);
  const cryptoKey = await importAesKey(keyHex);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer, tagLength: GCM_TAG_BITS },
    cryptoKey,
    cipherWithTag.buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(plainBuf);
}

/** TOTP-specific helpers — same crypto, explicit naming for audit clarity. */
export async function encryptTotpSecret(
  base32Secret: string,
  keyVersion = 1,
): Promise<{ totp_secret_encrypted: string; totp_key_version: number }> {
  const { ciphertext, keyVersion: ver } = await encryptField(base32Secret, keyVersion);
  return { totp_secret_encrypted: ciphertext, totp_key_version: ver };
}

export async function decryptTotpSecret(
  totp_secret_encrypted: string,
  totp_key_version: number,
): Promise<string> {
  return decryptField(totp_secret_encrypted, totp_key_version);
}
