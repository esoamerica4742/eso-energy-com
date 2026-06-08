# Monnify + Eso Pay — production setup

Eso Pay uses a **Monnify-backed BFF** (`eso-pay-api`) and webhook (`monnify-webhook`). The mobile app never holds Monnify secrets.

## 1. Monnify merchant

1. Create or use your [Monnify](https://monnify.com) merchant account.
2. Enable **Bills Payment** (email [email protected] if not on your account).
3. In **Developer → API Keys & Contracts**, copy:
   - API Key
   - Secret Key
   - Contract Code

Use **Sandbox** for testing (`MONNIFY_ENV=sandbox`).

## 2. Supabase secrets

Set on the project (`pndsuzscjedumjhadtio` or your ref):

| Secret | Description |
|--------|-------------|
| `MONNIFY_API_KEY` | Merchant API key |
| `MONNIFY_SECRET_KEY` | Merchant secret (also used for webhook HMAC) |
| `MONNIFY_CONTRACT_CODE` | Contract code |
| `MONNIFY_ENV` | `sandbox` or `live` |
| `MONNIFY_BASE_URL` | Optional override (`https://sandbox.monnify.com` / `https://api.monnify.com`) |
| `ESO_PAY_LOW_TOKEN_WEBHOOK_URL` | Optional — receives `eso_pay.low_token_warning` events at 10% / 5% |
| `ESO_PAY_LOW_TOKEN_WEBHOOK_SECRET` | Optional — HMAC-SHA512 for `X-Eso-Pay-Signature` |
| `ESO_PAY_CRON_SECRET` | Protects `/power-shield/cron` and `/utilities/fulfillment/cron` |

Existing Supabase vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) are required by edge functions.

## 3. Database migration

```bash
cd eso-energy-com
npx supabase db push
```

Migration: `supabase/migrations/20260528120000_payments_monnify.sql`

Preflight (read-only): `scripts/sql/preflight-eso-pay-production.sql`

## 4. Deploy edge functions

```powershell
cd eso-energy-com
# 1) Copy .env.monnify.sandbox.example → .env and fill keys
npm run probe:monnify
npm run setup:monnify
```

Or: `.\scripts\setup-monnify-sandbox.ps1`

Or manually:

```bash
npx supabase functions deploy monnify-webhook --no-verify-jwt
npx supabase functions deploy eso-pay-api
npx supabase secrets set --env-file .env
```

## 5. Monnify webhook URL

Register in Monnify Dashboard → **Settings → Webhooks**:

```
https://pndsuzscjedumjhadtio.supabase.co/functions/v1/monnify-webhook
```

Events: successful transfers to **reserved accounts** (wallet funding).

## 6. Mobile app

`eso-energy-mobile` defaults to:

```
https://pndsuzscjedumjhadtio.supabase.co/functions/v1/eso-pay-api
```

Override with `EXPO_PUBLIC_ESO_PAY_API_URL` in `.env` if needed.

## Fund wallet (virtual account)

Monnify **v2** reserved accounts require a customer **BVN or NIN**. For sandbox, set on Supabase edge secrets:

```
MONNIFY_SANDBOX_BVN=22222222222
```

Test locally:

```bash
npm run probe:monnify:account
npm run secrets:monnify
npx supabase functions deploy eso-pay-api --project-ref pndsuzscjedumjhadtio
```

The **Fund wallet** screen provisions a personal virtual account as follows:

1. User signs in with Supabase Auth (Eso Pay is per individual — no `profiles.company_id` required).
2. Open Fund wallet — the app calls `POST /wallet/reserved-account` to provision a personal virtual account.
3. You should see **account number**, **bank name**, and **account name**. Transfer from any Nigerian bank; balance updates via `monnify-webhook`.

If the screen only shows “Transfer any amount” with no account number:

- Redeploy `eso-pay-api` after code changes: `npx supabase functions deploy eso-pay-api`
- Confirm Monnify secrets on Supabase: `npx supabase secrets set --env-file .env`
- In Supabase → Edge Functions → `eso-pay-api` → Logs, look for `MONNIFY_NOT_CONFIGURED` or `RESERVED_ACCOUNT_UNAVAILABLE`

## 7. Verify

1. Sign in on the app with any Supabase user (wallet is created per user on first use).
2. Open **Eso Pay → Bills** — billers should load after first sync.
3. **Fund wallet** — NUBAN account number should appear.
4. Transfer in sandbox (Monnify test tools) — balance should update via webhook.
5. **Quick Pay** — validate meter → pay (wallet debited, Monnify bill payment).

## API surface (mobile → BFF)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/wallet` | Balance |
| GET/POST | `/wallet/reserved-account` | NUBAN funding |
| GET | `/utilities/providers` | Billers (synced from Monnify) |
| POST | `/utilities/validate` | Meter validation |
| POST | `/utilities/purchase` | Quick Pay |
| POST | `/bills/:id/pay` | Pay invoice from wallet (legacy / monitoring) |

## Troubleshooting

- **Empty billers** — Check Monnify bills product is enabled; call `GET /utilities/providers` once to trigger sync.
- **401 on BFF** — User must be signed in; `X-Eso-Pay-User-Id` must match the JWT user id.
- **402 insufficient balance** — Fund wallet via NUBAN first.
- **Webhook not crediting** — Confirm `monnify-webhook` is deployed with `--no-verify-jwt` and URL is registered in Monnify.
