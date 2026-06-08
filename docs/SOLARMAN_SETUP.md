# Solarman OpenAPI setup

Full onboarding for Solarman Smart / Solarman Business inverters (Deye, Sofar, etc.) alongside Enode.

## Architecture

```
Mobile  ──JWT──►  solarman-api (Supabase Edge)  ──►  api.solarmanpv.com
                         │
                         ├── solarman_connections (tokens, org)
                         ├── solarman_stations (plant ↔ ESO site)
                         └── enode_devices + telemetry_latest_state (unified dashboard)
```

- **Secrets:** `SOLARMAN_APP_ID`, `SOLARMAN_APP_SECRET` only on Supabase Edge — never in the mobile bundle.
- **Password:** SHA-256 hashed server-side before Solarman token request (per OpenAPI spec).
- **Sync cadence:** Backend ingest remains **5 minutes**; mobile live stream interpolates between syncs.

## 1. Get Solarman developer credentials

1. Register at [pro.solarmanpv.com](https://pro.solarmanpv.com/login)
2. Email **service@solarmanpv.com** for OpenAPI access (APP ID + APP Secret)
3. Ensure your plants/devices are visible in Solarman Smart or Business

## 2. Database migration

```bash
cd eso-energy-com
npm run db:migrate
```

Creates `solarman_connections`, `solarman_stations` + RLS.

## 3. Supabase secrets

```bash
supabase secrets set SOLARMAN_APP_ID=your_app_id
supabase secrets set SOLARMAN_APP_SECRET=your_app_secret
supabase secrets set SOLARMAN_LANGUAGE=en
supabase secrets set SOLARMAN_WEBHOOK_SECRET=your_webhook_signing_secret
```

`SOLARMAN_WEBHOOK_SECRET` is used by the existing telemetry webhook (`x-solarman-signature`).

## 4. Deploy edge function

```bash
cd eso-energy-com
supabase functions deploy solarman-api
```

## 5. Mobile onboarding flow

Route: **`/link-solarman`**

Steps:

1. **Credentials** — Solarman email or username + password
2. **Org** (Business accounts only) — pick `orgId` when multiple companies returned
3. **Plant** — link a Solarman station to the active ESO site
4. **Sync** — devices imported into dashboard telemetry pipeline

Also reachable from **Connect device → Connect Solarman instead**.

## 6. API surface (BFF)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/connection` | JWT | Link status + linked plant counts |
| POST | `/connect` | JWT | C-end login + initial station cache |
| POST | `/connect/org` | JWT | Business token with `orgId` |
| GET | `/orgs` | JWT | List business orgs |
| GET | `/stations` | JWT | List/cache plants |
| POST | `/stations/link` | JWT | Map plant → ESO `siteId` + sync devices |
| POST | `/sync` | JWT | Re-sync linked plants |
| POST | `/disconnect` | JWT | Remove Solarman link |

## 7. Mobile env (optional)

```
EXPO_PUBLIC_SOLARMAN_API_URL=https://YOUR_PROJECT.supabase.co/functions/v1/solarman-api
```

Defaults to Supabase functions URL when omitted.

## 8. Periodic sync (required — 5 minute backend)

The GitHub scheduler (`.github/workflows/enode-jobs-scheduler.yml`) calls:

```bash
POST /jobs/sync-all
```

every **5 minutes** on `solarman-api` (uses the same `ENODE_JOB_TOKEN` + base URL with `enode-api` → `solarman-api`).

Manual trigger:

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/solarman-api/jobs/sync-all" \
  -H "x-job-token: YOUR_JOB_TOKEN"
```

Each sync writes to `telemetry_latest_state` → Supabase Realtime → mobile dashboard re-anchors. The app **live-streams between syncs** (2s UI ticks, micro-fluctuation on last anchor).

## 9. Real-time dashboard (frontend)

Backend truth refreshes every **5 minutes**. The mobile app keeps the dashboard feeling real-time by:

- Subscribing to `telemetry_latest_state` (instant push on each sync)
- Interpolating values every **2 seconds** between backend anchors (`usePerceivedTelemetry`, `useLiveData`)
- Showing `live stream · synced Xm ago` (honest sync age, smooth UI)

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing SOLARMAN_APP_ID` | Set Supabase secrets and redeploy |
| No plants listed | Confirm account has authorized plants in Solarman portal |
| Business login loops org step | Select correct org; password re-sent for business token |
| Dashboard empty after link | Pull to refresh; verify plant linked to active site |
