/**
 * TOTP field encryption tests — validates Web Crypto round-trip and tamper detection.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { encryptField, decryptField, encryptTotpSecret, decryptTotpSecret } from "@/lib/encryption";

beforeAll(() => {
  // 32-byte test key — never use in production
  process.env.ENCRYPTION_MASTER_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.AUTH_SECRET =
    "a".repeat(64);
  process.env.AUTH_URL = "https://app.eso-energy.com";
  process.env.TOTP_ISSUER = "ESO Energy Test";
});

describe("encryption", () => {
  it("round-trips a TOTP base32 secret", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const { totp_secret_encrypted, totp_key_version } = await encryptTotpSecret(secret);
    expect(totp_secret_encrypted).not.toContain(secret);
    const decrypted = await decryptTotpSecret(totp_secret_encrypted, totp_key_version);
    expect(decrypted).toBe(secret);
  });

  it("produces unique ciphertext per encrypt (random IV)", async () => {
    const a = await encryptField("same-plaintext");
    const b = await encryptField("same-plaintext");
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("rejects tampered ciphertext", async () => {
    const { ciphertext, keyVersion } = await encryptField("test");
    const tampered = ciphertext.slice(0, -4) + "XXXX";
    await expect(decryptField(tampered, keyVersion)).rejects.toThrow();
  });

  it("rejects wrong key version", async () => {
    const { ciphertext } = await encryptField("test", 1);
    await expect(decryptField(ciphertext, 99)).rejects.toThrow();
  });
});
