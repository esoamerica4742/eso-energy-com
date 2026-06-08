# Enterprise Readiness Runbook

This runbook defines the minimum operational bar for ESO Energy enterprise deployments.

## 0) Deploy web app (`app.eso-energy.com`)

See **[CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md)** for Worker deploy, DNS, secrets, and GitHub Actions.

Quick local deploy:

```bash
npm run deploy:web
```

## 1) Fast verification

- Local env + runtime checks:
  - `npm run verify:enterprise`
- Local-only env checks (no HTTP probe):
  - `npm run verify:enterprise -- --local-only`
- Explicit runtime target:
  - `npm run verify:enterprise -- --url https://your-domain.com`

## 2) Health endpoint

- Endpoint: `GET /api/health/enterprise`
- Optional Enode OAuth probe:
  - `GET /api/health/enterprise?probe=enode`

Response fields:
- `overall`: `pass | warn | fail`
- `checks.env`: validated against `src/lib/env.ts`
- `checks.supabase`: service-role runtime health
- `checks.enodeConfig`: credential presence
- `checks.enodeProbe`: live OAuth token probe (only when requested)

## 3) Required controls before production

- **Tenant isolation**
  - All multi-tenant tables enforce strict RLS by `company_id`.
  - Policy tests prove no cross-tenant read/write.
- **Secrets**
  - Client apps use publishable/anon keys only.
  - `ENODE_CLIENT_SECRET`, webhook secrets, and service-role keys stay server-side.
  - Key rotation runbook exists and is rehearsed.
- **Reliability**
  - Enode webhook handling is idempotent.
  - Retry strategy for transient failures (429/5xx).
  - Dead-letter strategy for persistent failures.
- **Observability**
  - Structured logs with correlation IDs.
  - Alerts for auth failures, webhook failures, and sync drift.
  - SLO dashboard for telemetry freshness and API health.
- **Release gates**
  - CI runs typecheck, lint, tests, security checks, and enterprise verification.
  - Deploy only from passing mainline builds.

## 4) Recommended CI command sequence

Use this in CI for a baseline gate:

1. `npm run lint`
2. `npm run test`
3. `npm run verify:backend`
4. `npm run verify:enterprise -- --url https://staging.your-domain.com`

## 5) Immediate next improvements

- Add automated RLS policy tests per critical table.
- Add webhook replay detection and dead-letter queue.
- Add p95 latency and error-budget tracking for:
  - `/api/enode/*`
  - `/api/health/enterprise`
  - Supabase realtime ingestion path.

## 6) Enode 5-minute telemetry pipeline (new)

Implemented components:
- Queue table: `enode_webhook_queue`
- Delta ingest RPC: `enode_ingest_telemetry(...)`
- Aggregations: `enode_telemetry_5m`, `enode_telemetry_hourly`, `enode_telemetry_daily`
- Latest cache: `enode_telemetry_latest`
- Offline detection/alerts: `enode_detect_offline(...)`, `enode_alerts`
- Retention: `enode_prune_telemetry(...)`

Operational job endpoints (job token required):
- `POST /api/enode/jobs/process-webhook-queue`
- `POST /api/enode/jobs/offline-check`
- `POST /api/enode/jobs/rollups`

Scheduler recommendation:
- Every minute: `process-webhook-queue`
- Every 5 minutes: `offline-check`
- Every 15 minutes: `rollups`

Required env for job execution:
- `ENODE_JOB_TOKEN`
- `ENODE_JOBS_BASE_URL` for `npm run jobs:enode` script

GitHub Actions scheduler:
- Workflow: `.github/workflows/enode-jobs-scheduler.yml`
- Required repository secrets:
  - `ENODE_JOBS_BASE_URL` (example: `https://app.eso-energy.com/api/enode`)
  - `ENODE_JOB_TOKEN`
- Note: GitHub Actions minimum schedule interval is 5 minutes.
