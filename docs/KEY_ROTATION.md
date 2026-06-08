# Encryption Key Rotation Procedure

ESO Energy Command Deck uses **AES-256-GCM** (Web Crypto) with keys stored in **Cloudflare Workers Secrets**, never in the database.

## Keys

| Secret name | Purpose |
|-------------|---------|
| `ENCRYPTION_MASTER_KEY` | Primary key (version 1) |
| `ENCRYPTION_MASTER_KEY_V2` | Rotation target (version 2) |

Each key: `openssl rand -hex 32` → 64 hex characters.

## Rotation steps

1. **Generate** new key → add as `ENCRYPTION_MASTER_KEY_V2` in CF Secrets (keep v1 active).
2. **Deploy** — `decryptField` / `encryptField` already support dual-read via `totp_key_version` column.
3. **Re-encrypt** all rows (run migration script or admin job):
   - `SELECT user_id, totp_secret_encrypted, totp_key_version FROM user_security_settings WHERE totp_secret_encrypted IS NOT NULL`
   - For each row: decrypt with old version → encrypt with version 2 → update row.
4. **Verify** — run `npm run test:security`.
5. **Swap** — move v2 value to `ENCRYPTION_MASTER_KEY`, remove v2 secret.
6. **Schedule** — repeat every 90 days.

## TOTP-specific

- Column `totp_key_version` on `user_security_settings` records which key encrypted the blob.
- Plaintext TOTP secrets are never logged or stored outside the encrypted blob.

## Rollback

If rotation fails mid-flight, rows with `totp_key_version = 2` require `ENCRYPTION_MASTER_KEY_V2`. Do not delete v2 until all rows are re-encrypted or rolled back.
