/**
 * Integration test: TOTP encrypt/decrypt + Supabase (skips if no DATABASE_URL).
 * Run: npm run test:security -- tests/security/totp-integration.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Load .env for integration run
const envPath = join(process.cwd(), ".env");
try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env */
}

const hasSupabase =
  !!process.env.SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !!process.env.ENCRYPTION_MASTER_KEY;

describe.skipIf(!hasSupabase)("TOTP Supabase integration", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET ??= "a".repeat(64);
    process.env.AUTH_URL ??= "http://10.110.187.192:5178";
    process.env.TOTP_ISSUER ??= "ESO Energy Test";
  });

  it("encrypts TOTP secret and verifies via otplib v13", async () => {
    const { encryptTotpSecret, decryptTotpSecret } = await import("@/lib/encryption");
    const { generateSecret, generate, verify } = await import("otplib");

    const secret = generateSecret();
    const { totp_secret_encrypted, totp_key_version } = await encryptTotpSecret(secret);
    expect(totp_secret_encrypted).not.toContain(secret);

    const decrypted = await decryptTotpSecret(totp_secret_encrypted, totp_key_version);
    const token = await generate({ secret: decrypted });
    const result = await verify({ secret: decrypted, token });
    expect(result.valid).toBe(true);
  });
});
