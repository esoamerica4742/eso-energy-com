# Eso Pay — Power Shield (v4)

Power Shield estimates **prepaid volume remaining** as a percentage of the **total kWh vended** in the last Monnify electricity purchase (parsed from token/receipt or inferred from amount ÷ tariff). Alerts fire on **volume %**, not a fixed countdown:

| Tier | Threshold | Behavior |
|------|-----------|----------|
| Warning Shield | ≤ **10%** of last batch kWh | Push + SMS: `Power Shield: 10% Remaining (Approx. X kWh left. Secure your utility reserve.)` |
| Critical Shield | ≤ **5%** of last batch kWh | Push + SMS: `Power Shield: 5% Remaining (Approx. Y kWh left. Tap to top up immediately.)` |
| Auto-Top Up (5% only) | ≤ **5%** + user opt-in | Debit **Monnify wallet**, vend token via **Monnify bill-pay** (discovery → validation → pay), store token on `utility_purchases` |

## Legacy note (v3)

v3 used kobo burn vs last purchase amount. v4 keeps kobo helpers for wallet reserve only.

## API (`GET /power-shield`)

Each meter includes:

| Field | Purpose |
|-------|---------|
| `capacity_remaining_pct` | Volume % remaining (alias of `volume_remaining_pct`) |
| `volume_remaining_pct` | % of last vend kWh batch still estimated available |
| `batch_total_kwh` / `remaining_kwh` | Batch size and estimated units left |
| `shield_context_text` | Buffered hour-range label for UI (non-triggering) |
| `alert_state` | `safe` \| `warn_10` \| `critical` \| `expired` |
| `auto_top_up_enabled` | User opt-in for 5% auto reload |
| `auto_top_up_execute_at` | When scheduled auto top-up runs |
| `notify_warn_10` / `notify_critical_5` | Notification toggles |

`summary.alert_engine_version` is **4**; `summary.threshold_basis` is `volume_pct`.

## Grid Ledger

All alerts, auto top-up schedule/success/failure, and token credits are written to `grid_ledger_entries` via `record_grid_ledger_entry`.

## Mobile (`eso-energy-mobile`)

- **Server push + SMS** — primary delivery; local 48h/24h/6h scheduling removed.
- **Push registration** — `usePowerShieldNotifications` registers Expo token only.
- **Crisis UI** — `usePowerShieldCriticalPanic` drives crimson flash on `FleetSiteCard`, `SiteSelector`, and `PowerShieldMeterCard`.

## Cron

Workflow: `.github/workflows/power-shield-alerts.yml` → `POST /power-shield/cron` with `X-Cron-Secret`.

The cron job runs the **wallet threshold monitor**, which:

1. Evaluates prepaid **token reserve** volume % (10% / 5%) against last vend kWh batch.
2. Evaluates **Monnify wallet** balance against a 7-day reserve target derived from the same burn model.
3. Delivers push/SMS via Power Shield and optional **outbound webhooks** (`eso_pay.low_token_warning`).
4. Executes **auto re-vend** through the strict Monnify pipeline (discovery → validation → pay).

### Low-token webhook

| Secret | Purpose |
|--------|---------|
| `ESO_PAY_LOW_TOKEN_WEBHOOK_URL` | HTTPS endpoint for threshold events |
| `ESO_PAY_LOW_TOKEN_WEBHOOK_SECRET` | HMAC-SHA512 signing key (`X-Eso-Pay-Signature`) |

Deliveries are idempotent in `eso_pay_low_token_webhook_deliveries`.

### Monnify auto re-vend (5% critical)

`executePowerShieldAutoTopUp` in `powerShield.ts`:

1. **Wallet debit** — `esopay_debit_wallet` for last purchase amount (or 7-day estimate)
2. **Bill payment** — `executeMonnifyBillPipelineForProvider` (validate → pay)
3. **Receipt** — prepaid token → `utility_purchases.token_or_receipt`, `monnify_transaction_reference`

Map each `utility_providers` row with `monnify_biller_code` and `monnify_product_code`.

Apply migrations:

- `supabase/migrations/20260531130000_power_shield_capacity_engine.sql`
- `supabase/migrations/20260602140000_eso_pay_wallet_threshold_webhooks.sql`
- `supabase/migrations/20260602150000_volume_threshold_engine.sql`

Secrets: `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`, `MONNIFY_CONTRACT_CODE`, `MONNIFY_ENV`.
