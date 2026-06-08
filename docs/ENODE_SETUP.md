# Enode integration setup

Production Enode flow for ESO Energy: OAuth Link (mobile), Supabase Edge BFF, webhooks, and realtime telemetry.

## Architecture

```
Mobile / Web  ──Bearer JWT──►  /api/enode (local web BFF)  OR  enode-api (Edge)  ──►  Enode API
                                      │
Enode Webhooks ──────────────►  /api/enode/webhook  OR  enode-webhook (Edge)  ──►  Postgres
                                      │
Realtime ◄── WebSocket ──────── enode_devices / enode_events (RLS by company)
```

**Local dev (no Supabase CLI):** `npm run dev` serves the BFF at `http://10.110.187.192:5178/api/enode` (bind `0.0.0.0` for phones on LAN).

- **Tenant scope:** Enode user id = `eso-company-{company_id}` (one Enode user per B2B company).
- **Secrets:** `ENODE_CLIENT_ID`, `ENODE_CLIENT_SECRET`, `ENODE_WEBHOOK_SECRET` only on Supabase/edge — never in the mobile bundle.

## 0. One-shot setup (recommended)

```bash
cd eso-energy-com
npm run setup:all
npm run bootstrap:tenant
```

## 1. Database migration

```bash
cd eso-energy-com
npm run db:migrate:enode
```

Creates: `enode_connections`, `enode_devices`, `enode_events`, `enode_telemetry_snapshots` + RLS + Realtime.

## 2. Enode dashboard

1. Create a client at [developers.enode.com](https://developers.enode.com) (start with **Sandbox**).
2. Note **Client ID** and **Client Secret**.
3. Create a webhook pointing to:
   `https://<PROJECT_REF>.supabase.co/functions/v1/enode-webhook`
4. Copy the webhook **signing secret**.
5. Subscribe to events:
   - `user:device:updated`
   - `user:device:discovered`
   - `charger:action:updated`

## 3. Supabase secrets

```bash
supabase secrets set ENODE_ENV=sandbox
supabase secrets set ENODE_CLIENT_ID=...
supabase secrets set ENODE_CLIENT_SECRET=...
supabase secrets set ENODE_WEBHOOK_SECRET=...
supabase secrets set ENODE_LINK_REDIRECT_URI=esoenergymobile://link-device/callback
supabase secrets set SUPABASE_ANON_KEY=your-anon-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in Edge Functions.

## 4. Deploy edge functions

```bash
cd eso-energy-com
supabase functions deploy enode-webhook --no-verify-jwt
supabase functions deploy enode-api
```

`enode-webhook` must be public (Enode servers call it). Signature verification is enforced in code.

## 5. Mobile environment

Copy `eso-energy-mobile/.env.example` to `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_ENODE_REDIRECT_URI=esoenergymobile://link-device/callback
```

Users must be **signed in** (Supabase session) before Link or device APIs work.

## 6. Routes

| Platform | Route | Purpose |
|----------|-------|---------|
| Mobile | `/link-device` | Branded Link UI + `WebBrowser.openAuthSessionAsync` |
| Mobile | `/link-device/callback` | Deep link after Enode redirect |
| Web | `/link-device` | Branded Link UI → redirect to Enode |
| Web | `/link-device/callback` | Browser redirect after Link completes |

Mobile scheme: `esoenergymobile` (see `app.json`). Web callback: set `VITE_ENODE_LINK_REDIRECT_URI` to your deployed origin + `/link-device/callback`.

## 6b. Sign in (required)

Both apps need a Supabase session (`profiles.company_id` set) before Enode APIs work.

- **Mobile:** `/login` (email/password) — auto-redirect when `EXPO_PUBLIC_SUPABASE_*` is set.
- **Web:** `/login` (existing) — then open `/link-device` or dashboard Enode panel.

## 7. API surface (BFF)

| Method | Path | Auth |
|--------|------|------|
| POST | `/link` | JWT |
| GET | `/devices?sync=true` | JWT |
| GET | `/devices/:id?refresh=true` | JWT |
| POST | `/sync` | JWT |
| GET | `/telemetry/:id?hours=24` | JWT |
| GET | `/connection` | JWT |

## 8. Mobile hooks

- `useEnodeDevices()` — list, 30s poll
- `useEnodeDevice(id)` — single device, poll + Realtime
- `useEnodeLink()` — OAuth session
- `useEnodeTelemetry(id)` — chart data

Client: `src/services/enode.ts` (retries, typed errors).

## 9. Production checklist

- [ ] Switch `ENODE_ENV=production` and production credentials
- [ ] Webhook URL uses production Supabase project
- [ ] Redirect URI registered in Enode Link settings
- [ ] RLS verified: user A cannot read company B devices
- [ ] Webhook signature test from Enode dashboard
