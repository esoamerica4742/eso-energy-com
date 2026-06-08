# ESO Energy Telemetry OS (Production)

## Ingestion

- Primary ingress endpoint: `POST /api/webhook/telemetry`
- Signature verification:
  - `x-enode-signature` with `ENODE_WEBHOOK_SECRET`
  - `x-solarman-signature` with `SOLARMAN_WEBHOOK_SECRET`
- 5-minute guardrail:
  - strict interval `300000ms`
  - per-device cache key and lock key
  - stale-while-revalidate behavior
- Delta persistence:
  - `public.ingest_telemetry_log(...)` writes only meaningful deltas

## Data Model

- `telemetry_logs` (partitioned, append history)
- `telemetry_latest_state` (low-bandwidth realtime state)
- `telemetry_site_summary` (site aggregate cache)
- `enode_telemetry_5m/hourly/daily` (rollups)
- `enode_webhook_queue` (burst smoothing)
- `enode_alerts` (debounced offline/fault alerts)

## Jobs

Token-protected endpoints (`x-job-token`):

- `POST /api/enode/jobs/process-webhook-queue`
- `POST /api/enode/jobs/offline-check`
- `POST /api/enode/jobs/rollups`

GitHub Scheduler:

- `.github/workflows/enode-jobs-scheduler.yml`
- Required secrets:
  - `ENODE_JOBS_BASE_URL`
  - `ENODE_JOB_TOKEN`

## Go-Live Automation

- Workflow: `.github/workflows/go-live-readiness.yml`
- Required repository secrets:
  - `GO_LIVE_TARGET_URL`
  - `ENODE_JOB_TOKEN`
  - `ENODE_WEBHOOK_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SMOKE_TENANT_ID`
  - `SMOKE_SITE_ID`
  - `SMOKE_DEVICE_ID`
- Smoke command:
  - `npm run smoke:telemetry`

## Mobile Realtime Perception

- Realtime subscription hook: `useRealtimeTelemetry`
- Perception engine (`telemetryLivePerception.ts`):
  - backend anchor cadence: **5 minutes** (`BACKEND_SYNC_INTERVAL_MS`)
  - frontend stream cadence: **2 seconds** (`FRONTEND_STREAM_TICK_MS`)
  - micro fluctuations on last anchor between Solarman/Enode syncs
  - chart + KPI cards use perceived values; health borders use real anchor timestamps
- Stores:
  - `realtimeTelemetryStore` with websocket status + reconnect counters
- Solarman scheduled sync: `solarman-api/jobs/sync-all` every 5 minutes (GitHub Actions)

## Performance Targets

- webhook ACK path optimized for sub-100ms on cache hit
- queue processing resilient with exponential retry
- dashboard updates from `telemetry_latest_state` for minimal payload
