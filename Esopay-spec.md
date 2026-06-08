# Eso Pay — Product Specification Document
### For: Cursor Composer 2.5 | Version: 1.1.0 | Classification: Internal Engineering

---

> **Scope:** Eso Pay is a premium B2B utility billing extension embedded natively inside an existing React Native solar inverter monitoring application. It provides enterprise clients with real-time inverter-offset billing, **Monnify wallet + virtual account funding**, **Monnify utility bill payment**, and a luxury-grade financial dashboard — all operating within the same authenticated session as the parent app.

---

## Table of Contents

1. [Design & Feel](#1-design--feel)
2. [Integration Layer](#2-integration-layer)
3. [Detailed Data Schema](#3-detailed-data-schema)
4. [Micro-Task Blueprint](#4-micro-task-blueprint)
5. [Constraints & Non-Goals](#5-constraints--non-goals)

---

## 1. Design & Feel

### 1.1 Brand Identity

Eso Pay inhabits a **dark luxury fintech** aesthetic — the visual language of a private banking terminal fused with the precision instrumentation of a solar control room. Every surface communicates trust, exclusivity, and technical authority.

The product must feel categorically different from consumer fintech. There are no rounded pastel cards, no playful illustrations, no generic SF Pro pairings. Every pixel is deliberate.

---

### 1.2 Color System

All colors are defined as design tokens and consumed via a central `theme.ts` token file. Never hard-code hex values in component files.

#### Core Palette

| Token Name | Value | Usage |
|---|---|---|
| `color.bg.void` | `#080A0F` | Root screen background — deepest obsidian |
| `color.bg.surface` | `#0E1118` | Card and panel surfaces |
| `color.bg.elevated` | `#141822` | Modal overlays, bottom sheets |
| `color.bg.inset` | `#1C2130` | Input fields, table row hover states |
| `color.gold.primary` | `#C9A84C` | Brushed gold — primary CTA, active nav, key headings |
| `color.gold.shimmer` | `#E8CC7A` | Gold highlight — icon glints, focus rings, gradient terminus |
| `color.gold.muted` | `#7A6430` | Tertiary gold — disabled states, placeholder text |
| `color.emerald.live` | `#00FF88` | Neon emerald — live/active utility status indicator |
| `color.emerald.dim` | `#00994D` | Dimmed emerald — secondary status, partial offset |
| `color.red.alert` | `#FF3B55` | Overdue bills, critical alerts, error states |
| `color.red.dim` | `#8B1A28` | Alert background tint |
| `color.text.primary` | `#F0EDE6` | Off-white — primary body and label text |
| `color.text.secondary` | `#8A8FA8` | Secondary metadata, subtitles |
| `color.text.disabled` | `#3E4256` | Disabled/inactive text |
| `color.border.subtle` | `#1E2436` | Card borders, dividers |
| `color.border.active` | `#C9A84C33` | Gold border at 20% opacity — focused inputs |

#### Micro-Indicator Semantic Colors

These colors are reserved exclusively for real-time status badges and must never be repurposed:

- **Neon Emerald** (`#00FF88`): Utility status LIVE — inverter actively offsetting the bill.
- **Pulsing Amber** (`#F0A500`): Partial offset — inverter output covers less than 80% of current billing cycle draw.
- **Static Red** (`#FF3B55`): No offset — inverter offline, bill fully unmitigated.
- **Platinum** (`#C8D0E0`): Bill paid — settled and archived.

---

### 1.3 Typography Scale

Font choices are loaded via `expo-font` or the platform's native font loader. Do not use system fonts for display text.

#### Typefaces

| Role | Family | Weight | Notes |
|---|---|---|---|
| Display / Hero Numbers | `Cormorant Garamond` | 300 Light | Used for large currency figures (e.g., `$12,840.00`). The serifs convey legacy banking authority. |
| Heading | `Syne` | 700 Bold | Section titles, modal headers, card labels |
| Sub-heading | `Syne` | 400 Regular | Card subtitles, table column headers |
| Body / Labels | `DM Sans` | 400 Regular | All descriptive text, form labels, input values |
| Monospace / Data | `JetBrains Mono` | 400 Regular | Invoice IDs, transaction hashes, kWh readings |
| Caption / Legal | `DM Sans` | 300 Light | Timestamps, terms references, footnote-level text |

#### Type Scale (in `sp` / React Native units)

| Scale Token | Size | Line Height | Tracking |
|---|---|---|---|
| `type.hero` | 48sp | 52sp | -1.5 |
| `type.display` | 36sp | 40sp | -1.0 |
| `type.h1` | 24sp | 30sp | -0.5 |
| `type.h2` | 18sp | 24sp | -0.25 |
| `type.h3` | 15sp | 20sp | 0 |
| `type.body` | 14sp | 22sp | 0 |
| `type.label` | 12sp | 16sp | +0.5 |
| `type.caption` | 11sp | 15sp | +0.75 |
| `type.mono` | 13sp | 18sp | 0 |

---

### 1.4 Spatial System & Layout

- **Base grid unit:** 4dp
- **Component padding:** Always multiples of 4dp. Standard card internal padding: `16dp horizontal / 20dp vertical`.
- **Screen edge margin:** 20dp on all standard screens. Reduce to 16dp on screens narrower than 375pt.
- **Border radius scale:** `4dp` (inputs), `8dp` (cards), `12dp` (bottom sheets), `20dp` (pills/badges), `999dp` (circular elements).
- **Elevation model:** Use `box-shadow` analogs via React Native `shadow*` props + a subtle `1px` border of `color.border.subtle` on all elevated surfaces. Never use platform drop-shadow alone — the border anchors the card in the dark environment.

---

### 1.5 Iconography

- **Icon set:** `phosphor-react-native` — use the `Duotone` variant throughout. The secondary layer of duotone icons should be tinted gold (`color.gold.muted`) to maintain brand cohesion.
- **Icon sizing:** 20dp (inline/label), 24dp (card actions), 32dp (feature icons), 48dp (empty states).
- **Custom icons:** Three custom SVG icons are required — `InverterOffsetBadge`, `GoldCheckmark`, and `EsoPayWordmark`. These live in `src/esopay/assets/icons/`.

---

### 1.6 Premium Micro-Interactions

All animations are implemented via `react-native-reanimated` (v3+). Avoid the `Animated` API from core React Native — it runs on the JS thread and will produce frame drops on dense financial screens.

#### Interaction Catalogue

**1. Bill Card Entrance (Staggered Reveal)**
When the Bills List screen mounts, each `BillCard` component enters with a staggered `FadeInDown` animation. Delay increments by `60ms` per card. Each card simultaneously scales from `0.97` to `1.0` with a `spring` config of `{ damping: 18, stiffness: 200 }`. This creates a cascading "materialization" effect — premium, not bouncy.

**2. Gold Shimmer on Payment CTA**
The primary "Pay Now" button contains a looping diagonal shimmer overlay — a white gradient that sweeps left-to-right at 3-second intervals, covering the gold surface. Implemented as an absolutely positioned `LinearGradient` animated with `withRepeat(withTiming(...))`. This must be interruptible — tapping the button immediately cancels the shimmer and triggers the press state.

**3. Live Status Pulse**
The neon emerald micro-indicator (`●`) beside an active inverter offset pulses with a sinusoidal opacity animation between `1.0` and `0.4` over a 1.8s loop. Use `withRepeat(withSequence(...))`. The pulse must stop — frozen at full opacity — if the inverter connection is lost.

**4. Number Ticker on Payment Success**
After a successful **wallet debit / Monnify bill settlement**, the "Total Offset Savings" figure on the dashboard animates from its previous value to the new value using a frame-by-frame number interpolation. Duration: 1200ms, easing: `Easing.out(Easing.cubic)`.

**5. Haptic Orchestration**
- **Light impact:** Row tap, tab switch, toggle.
- **Medium impact:** CTA button press, filter apply.
- **Heavy impact + 120ms delay + medium impact:** Payment success confirmation (a "ker-chunk" feel).
- **Error pattern (3x light at 80ms intervals):** Payment failure, validation error.
Use `expo-haptics` exclusively. Never trigger haptics on passive/non-interactive events.

**6. Bottom Sheet Physics**
All Eso Pay bottom sheets (invoice detail, payment confirmation, filter panel) use `@gorhom/bottom-sheet` with a custom `snapPoints` of `['50%', '90%']`. The sheet's backdrop is a `BlurView` (`intensity: 20`) over a dark scrim — not a flat black overlay. The drag indicator is a 36dp × 4dp pill in `color.border.subtle`.

---

### 1.7 Dark Mode Exclusivity

Eso Pay does **not** support a light mode. It is a dark-only interface by product decision. The parent app's light/dark toggle must not propagate into Eso Pay screens. Implement this by wrapping all Eso Pay navigators in a forced `ThemeProvider` that locks to the dark token set regardless of `useColorScheme()` output.

---

## 2. Integration Layer

### 2.1 Architecture Principle

Eso Pay is not a standalone app — it is an **embedded module** that shares the runtime context of the parent inverter monitoring application. The integration follows a **context injection pattern**: the parent app exposes a typed interface that Eso Pay consumes, without Eso Pay ever directly touching auth storage, API clients, or company state itself.

This enforces a clean boundary: Eso Pay breaks if the contract changes, not silently corrupts.

---

### 2.2 Parent App Contract

The parent app must expose the following typed context via a React Context provider mounted at the root of the app (above the navigation tree):

#### `EsoPayHostContext` Interface

| Field | Type | Description |
|---|---|---|
| `authToken` | `string` | Short-lived JWT issued by the parent app's auth stack. Eso Pay treats this as opaque. |
| `refreshAuthToken` | `() => Promise<string>` | Callable that forces a token refresh and returns the new token. Eso Pay calls this on any 401 response. |
| `companyId` | `string` (UUID v4) | The currently active tenant's company ID. Used as a partition key on all Eso Pay API requests. |
| `userId` | `string` (UUID v4) | The authenticated user's ID. Used for audit logging on payment actions. |
| `userRole` | `'owner' \| 'admin' \| 'viewer'` | RBAC role from the parent app. Eso Pay uses this to gate destructive actions (manual bill void, payment override). |
| `activeInverterIds` | `string[]` | Array of inverter IDs currently associated with the company. Used to pre-populate offset attribution without a second lookup. |
| `onSessionExpired` | `() => void` | Callback Eso Pay fires if all token refresh attempts fail. The parent app handles logout UI. |

The parent app renders:

```
<EsoPayHostContextProvider value={hostContextValue}>
  <RootNavigator />
</EsoPayHostContextProvider>
```

Eso Pay's own `EsoPayModule` reads this via `useEsoPayHost()` — a typed hook wrapping `useContext(EsoPayHostContext)` with a guard that throws if consumed outside the provider.

---

### 2.3 API Client Adapter

Eso Pay maintains its own Axios instance (`esopayApiClient`) and a typed facade (`esoPayApi`) configured as follows:

- **Base URL:** Injected via environment variable `ESO_PAY_API_BASE_URL` / `EXPO_PUBLIC_ESO_PAY_API_URL`. Never hardcoded. Defaults to Supabase Edge `eso-pay-api`.
- **Request interceptor:** Reads `authToken` from `EsoPayHostContext` and attaches it as `Authorization: Bearer {token}` on every outbound request.
- **Response interceptor (401 handling):** On a 401, calls `refreshAuthToken()`, updates the in-memory token reference, and retries the original request exactly once. If the retry also returns 401, calls `onSessionExpired()` and rejects the promise.
- **Request header — Tenant partition:** Every request carries `X-Company-Id: {companyId}` as a mandatory header. The API layer enforces this as a tenant guard — requests without it return 400.
- **Idempotency:** Wallet debits and bill payments send `Idempotency-Key` (format: `{bill_id}-{user_id}-{unix_ms}`) to prevent double settlement on retry.
- **Timeout:** 15 seconds. No silent hangs.

The client is instantiated once per app session in `src/esopay/api/client.ts` and exported as a singleton. It is never re-instantiated on navigation.

#### Monnify BFF surface (mobile → `eso-pay-api` only)

The React Native app **never** calls Monnify directly. All Monnify Wallet, Reserved Account, and Bill Payment APIs are invoked server-side. The mobile client uses these BFF routes:

| Domain | Method | Path | Purpose |
|---|---|---|---|
| Wallet | GET | `/wallet` | Company wallet balance (kobo) |
| Wallet | GET | `/wallet/transactions` | Ledger (credits/debits/bill payments) |
| Wallet | GET/POST | `/wallet/reserved-account` | Monnify reserved virtual account (NUBAN) for bank-transfer funding |
| Wallet | POST | `/wallet/funding-intents` | Track inbound transfer intent + return VA details |
| Bills | GET | `/bills` | Paginated bill list |
| Bills | GET | `/bills/summary` | Dashboard hero stats + wallet balance |
| Bills | GET | `/bills/:id` | Bill detail |
| Bills | GET | `/bills/:id/offsets` | Inverter offset breakdown |
| Bills | GET | `/bills/:id/payments` | Monnify settlement history for bill |
| Bills | POST | `/bills/:id/pay` | **Pay bill from wallet** (backend debits Monnify wallet + Monnify bill pay) |
| Utilities | GET | `/utilities/providers` | Disco / biller catalog (Monnify biller codes) |
| Utilities | POST | `/utilities/validate` | Validate meter / account before purchase |
| Utilities | POST | `/utilities/purchase` | Ad-hoc utility purchase from wallet |

Typed access: `const api = useEsoPayApiClient()` → `api.wallet.get()`, `api.bills.payFromWallet(...)`, etc.

---

### 2.4 Navigation Integration

Eso Pay is mounted as a **nested stack navigator** inside the parent app's bottom tab navigator. The parent app adds a single tab entry:

| Tab | Icon | Navigator |
|---|---|---|
| Billing | `CurrencyDollar` (Phosphor Duotone) | `EsoPayStackNavigator` |

`EsoPayStackNavigator` owns all screens under the `/billing/` route namespace. It does not share a header with the parent app — it renders its own custom `EsoPayHeader` component with the gold wordmark and context-aware back navigation.

Deep links into Eso Pay follow the scheme: `esopay://billing/{screen}?{params}`. The parent app's Linking config registers these and delegates to the Eso Pay navigator.

---

### 2.5 Inverter Data Bridge

Eso Pay does not poll inverter telemetry independently. Instead, the parent app's existing WebSocket connection to the inverter fleet is leveraged via a shared Zustand store slice named `inverterTelemetrySlice`.

Eso Pay reads from this slice (read-only) to:
1. Display real-time generation kWh alongside each bill's current period consumption.
2. Calculate live offset percentages for the `inverter_offsets` records.
3. Drive the status micro-indicator (emerald / amber / red) without additional API calls.

Eso Pay never writes to `inverterTelemetrySlice`. The data flow is strictly unidirectional.

---

### 2.6 Security Boundaries

- Auth tokens are **never** stored in AsyncStorage by Eso Pay. They are only held in React context memory and the Axios instance interceptor's closure.
- The `companyId` is used as a partition key on every database query at the API layer. No Eso Pay query should ever return data from a different tenant.
- Payment actions (wallet debit / bill settlement) require the user's `userRole` to be `'owner'` or `'admin'`. The `'viewer'` role sees billing data but all payment CTAs are replaced with a locked state communicating role restriction.
- **Monnify API keys, contract codes, and wallet secrets** live only on Supabase Edge / backend (`eso-pay-api`, `monnify-webhook`). Never in the mobile bundle or client env.
- Webhook signatures from Monnify are verified server-side before wallet credits or bill status updates are applied.

---

### 2.7 Monnify Payment Architecture

Eso Pay uses a **wallet-first** model for Nigerian B2B clients:

```
┌─────────────┐     bank transfer      ┌──────────────────┐
│   Client    │ ─────────────────────► │ Monnify Reserved │
│   treasury  │   (virtual NUBAN)    │ Virtual Account  │
└─────────────┘                      └────────┬─────────┘
                                              │ webhook: PAID
                                              ▼
                                     ┌──────────────────┐
                                     │ Company Wallet   │
                                     │ (balance, kobo)  │
                                     └────────┬─────────┘
                                              │ debit
                                              ▼
                                     ┌──────────────────┐
                                     │ Monnify Bill Pay │
                                     │ (Disco / utility)│
                                     └──────────────────┘
```

1. **Provision wallet** — Backend creates/links a Monnify wallet per `company_id`.
2. **Fund wallet** — Client displays reserved virtual account (account number, bank name). Inbound transfers credit wallet via `monnify-webhook`.
3. **Pay utility bill** — Mobile calls `POST /bills/:id/pay`. Backend checks balance, debits wallet, calls Monnify Bill Payment API, records `monnify_bill_payments`, updates `bills.status`.
4. **Reconciliation** — All Monnify `transactionReference` / `paymentReference` values are stored for audit; client polls or receives push on completion.

**No card capture on device.** No Stripe. No PCI card-data scope on mobile.

## 3. Detailed Data Schema

> All tables are defined for a PostgreSQL 15+ backend with Row Level Security (RLS) enabled. UUIDs use `gen_random_uuid()`. All timestamps are `TIMESTAMPTZ` stored in UTC.

---

### 3.1 Table: `bills`

Primary entity representing a single utility billing period for one company.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique bill identifier |
| `company_id` | `UUID` | `NOT NULL` | Foreign key → `companies.id`. Tenant partition key. Indexed. |
| `billing_period_start` | `TIMESTAMPTZ` | `NOT NULL` | Start of billing cycle (inclusive) |
| `billing_period_end` | `TIMESTAMPTZ` | `NOT NULL` | End of billing cycle (exclusive) |
| `utility_provider` | `TEXT` | `NOT NULL` | Name of utility company (e.g., "Ikeja Electric") |
| `account_number` | `TEXT` | `NOT NULL` | Utility account number for this site |
| `site_id` | `UUID` | `NOT NULL` | Foreign key → `sites.id`. Which physical site this bill applies to. |
| `gross_amount_kobo` | `BIGINT` | `NOT NULL CHECK (gross_amount_kobo >= 0)` | Total bill before any solar offset, in smallest currency unit (kobo for NGN, cents for USD). Stored as integer to avoid float drift. |
| `offset_amount_kobo` | `BIGINT` | `NOT NULL DEFAULT 0 CHECK (offset_amount_kobo >= 0)` | Amount offset by inverter generation. Populated after offset calculation runs. |
| `net_amount_kobo` | `BIGINT` | `GENERATED ALWAYS AS (gross_amount_kobo - offset_amount_kobo) STORED` | Computed: what the company actually owes. |
| `currency` | `CHAR(3)` | `NOT NULL DEFAULT 'NGN'` | ISO 4217 currency code |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'offset_calculated', 'payment_initiated', 'paid', 'overdue', 'void'))` | Bill lifecycle state |
| `due_date` | `TIMESTAMPTZ` | `NOT NULL` | Payment due date |
| `invoice_pdf_url` | `TEXT` | `NULLABLE` | Signed S3/GCS URL to the generated PDF invoice |
| `raw_meter_reading_kwh` | `NUMERIC(12,4)` | `NULLABLE` | Utility meter reading for the period in kWh |
| `notes` | `TEXT` | `NULLABLE` | Internal admin notes |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last mutation timestamp. Updated via trigger. |
| `created_by` | `UUID` | `NOT NULL` | Foreign key → `users.id`. Who created this bill record. |

**Indexes:**
- `idx_bills_company_id` on `(company_id)`
- `idx_bills_status` on `(status)`
- `idx_bills_due_date` on `(due_date)`
- Composite: `idx_bills_company_period` on `(company_id, billing_period_start, billing_period_end)`

**RLS Policy:** Users can only SELECT/UPDATE rows where `company_id` matches their session's `app.current_company_id` setting.

---

### 3.2 Table: `inverter_offsets`

Records the solar generation contribution attributed to a specific bill, broken down by inverter unit. One bill can have multiple offset records (one per inverter).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique offset record identifier |
| `bill_id` | `UUID` | `NOT NULL REFERENCES bills(id) ON DELETE CASCADE` | The bill this offset is attributed to |
| `company_id` | `UUID` | `NOT NULL` | Denormalized tenant key for RLS and fast partition filtering |
| `inverter_id` | `TEXT` | `NOT NULL` | The inverter unit's ID (matches the parent app's inverter identifier) |
| `inverter_serial` | `TEXT` | `NOT NULL` | Human-readable serial number for display |
| `generation_kwh` | `NUMERIC(12,4)` | `NOT NULL CHECK (generation_kwh >= 0)` | Total kWh generated by this inverter during the billing period |
| `offset_kwh` | `NUMERIC(12,4)` | `NOT NULL CHECK (offset_kwh >= 0)` | kWh credited against the bill (may be less than `generation_kwh` if generation exceeds consumption) |
| `tariff_rate_per_kwh` | `NUMERIC(10,4)` | `NOT NULL` | The utility tariff rate used to convert kWh offset into monetary value |
| `offset_value_kobo` | `BIGINT` | `NOT NULL` | Monetary value of offset (`offset_kwh × tariff_rate`, stored as integer) |
| `offset_percentage` | `NUMERIC(5,2)` | `NOT NULL CHECK (offset_percentage BETWEEN 0 AND 100)` | What percentage of the bill's gross_amount this inverter offset covers |
| `calculation_method` | `TEXT` | `NOT NULL DEFAULT 'net_metering' CHECK (calculation_method IN ('net_metering', 'gross_export', 'self_consumption'))` | How the offset was computed |
| `data_source` | `TEXT` | `NOT NULL DEFAULT 'telemetry' CHECK (data_source IN ('telemetry', 'manual_entry', 'utility_api'))` | Where the generation data originated |
| `period_start` | `TIMESTAMPTZ` | `NOT NULL` | Start of the measurement window (should align with bill period) |
| `period_end` | `TIMESTAMPTZ` | `NOT NULL` | End of the measurement window |
| `is_verified` | `BOOLEAN` | `NOT NULL DEFAULT false` | Whether an admin has verified this offset record |
| `verified_by` | `UUID` | `NULLABLE REFERENCES users(id)` | Who verified it |
| `verified_at` | `TIMESTAMPTZ` | `NULLABLE` | When it was verified |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Record creation timestamp |

**Indexes:**
- `idx_inverter_offsets_bill_id` on `(bill_id)`
- `idx_inverter_offsets_company_id` on `(company_id)`
- `idx_inverter_offsets_inverter_id` on `(inverter_id)`
- Composite: `idx_inverter_offsets_company_bill` on `(company_id, bill_id)`

**Constraint:** `UNIQUE (bill_id, inverter_id)` — One offset record per inverter per bill. Re-calculation updates in place rather than inserting duplicates.

**RLS Policy:** Inherits from `bills` RLS via `company_id` check.

---

### 3.3 Table: `company_wallets`

One Monnify wallet per company tenant. Created server-side on first Eso Pay activation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Internal wallet record ID |
| `company_id` | `UUID` | `NOT NULL UNIQUE` | Foreign key → `companies.id`. Tenant partition key. |
| `monnify_wallet_reference` | `TEXT` | `NOT NULL UNIQUE` | Monnify wallet account reference |
| `balance_kobo` | `BIGINT` | `NOT NULL DEFAULT 0 CHECK (balance_kobo >= 0)` | Cached wallet balance in kobo (authoritative source is Monnify; reconciled via webhooks) |
| `currency` | `CHAR(3)` | `NOT NULL DEFAULT 'NGN'` | ISO 4217 currency code |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended'))` | Wallet lifecycle |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last balance/status update |

**Indexes:**
- `idx_company_wallets_company_id` on `(company_id)`
- `idx_company_wallets_monnify_ref` on `(monnify_wallet_reference)`

**RLS Policy:** SELECT scoped to `company_id`. INSERT/UPDATE via service role only.

---

### 3.4 Table: `wallet_transactions`

Immutable ledger of wallet credits (virtual account funding) and debits (bill payments, reversals).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Ledger entry ID |
| `company_id` | `UUID` | `NOT NULL` | Denormalized tenant key |
| `wallet_id` | `UUID` | `NOT NULL REFERENCES company_wallets(id)` | Parent wallet |
| `type` | `TEXT` | `NOT NULL CHECK (type IN ('credit', 'debit', 'bill_payment', 'refund', 'reversal'))` | Transaction category |
| `amount_kobo` | `BIGINT` | `NOT NULL CHECK (amount_kobo > 0)` | Movement amount |
| `balance_after_kobo` | `BIGINT` | `NULLABLE` | Wallet balance after this entry |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed'))` | Settlement state |
| `monnify_transaction_reference` | `TEXT` | `NULLABLE UNIQUE` | Monnify `transactionReference` — webhook lookup key |
| `monnify_payment_reference` | `TEXT` | `NULLABLE` | Monnify `paymentReference` |
| `narration` | `TEXT` | `NULLABLE` | Human-readable description |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | Reserved account ref, bill id, etc. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Entry timestamp |

**Indexes:**
- `idx_wallet_transactions_company_id` on `(company_id)`
- `idx_wallet_transactions_wallet_id` on `(wallet_id)`
- `idx_wallet_transactions_monnify_tx_ref` on `(monnify_transaction_reference)`
- `idx_wallet_transactions_created_at` on `(created_at DESC)`

**RLS Policy:** SELECT scoped to `company_id`. Writes via service role / edge functions only.

---

### 3.5 Table: `monnify_bill_payments`

Records every utility bill settlement debited from the company wallet via Monnify Bill Payment API. A bill may have multiple records (e.g., failed attempt followed by success).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Internal payment record ID |
| `bill_id` | `UUID` | `NOT NULL REFERENCES bills(id) ON DELETE RESTRICT` | The bill being paid |
| `company_id` | `UUID` | `NOT NULL` | Denormalized tenant key |
| `wallet_transaction_id` | `UUID` | `NULLABLE REFERENCES wallet_transactions(id)` | Linked wallet debit |
| `monnify_payment_reference` | `TEXT` | `NOT NULL UNIQUE` | Client/server idempotency reference sent to Monnify |
| `monnify_transaction_reference` | `TEXT` | `NULLABLE UNIQUE` | Monnify settlement reference after success |
| `monnify_biller_code` | `TEXT` | `NOT NULL` | Monnify biller code (Disco) |
| `customer_account_number` | `TEXT` | `NOT NULL` | Utility meter / account number |
| `amount_kobo` | `BIGINT` | `NOT NULL CHECK (amount_kobo > 0)` | Amount debited. Must match `bill.net_amount_kobo` at initiation. |
| `currency` | `CHAR(3)` | `NOT NULL DEFAULT 'NGN'` | ISO 4217 currency code |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'reversed'))` | Settlement lifecycle |
| `failure_code` | `TEXT` | `NULLABLE` | Monnify failure code if status is `failed` |
| `failure_message` | `TEXT` | `NULLABLE` | Human-readable failure from Monnify |
| `idempotency_key` | `TEXT` | `NOT NULL UNIQUE` | Client-generated key. Format: `{bill_id}-{user_id}-{unix_ms}` |
| `initiated_by` | `UUID` | `NOT NULL REFERENCES users(id)` | User who triggered payment |
| `webhook_received_at` | `TIMESTAMPTZ` | `NULLABLE` | When Monnify success webhook was processed |
| `token_or_receipt` | `TEXT` | `NULLABLE` | Prepaid token / receipt from biller when applicable |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | `{ company_name, bill_period, site_name }` for audit |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Payment initiation timestamp |
| `completed_at` | `TIMESTAMPTZ` | `NULLABLE` | When status reached terminal state |

**Indexes:**
- `idx_monnify_bill_payments_bill_id` on `(bill_id)`
- `idx_monnify_bill_payments_company_id` on `(company_id)`
- `idx_monnify_bill_payments_payment_ref` on `(monnify_payment_reference)`
- `idx_monnify_bill_payments_status` on `(status)`

**RLS Policy:** SELECT scoped to `company_id`. INSERT/UPDATE via service role only.

**Critical Note:** The mobile app never holds Monnify secrets. `POST /bills/:id/pay` validates wallet balance, creates a pending `monnify_bill_payments` row, debits the Monnify wallet, calls Monnify Bill Payment, and returns `{ bill_payment, wallet }`. Inbound bank transfers credit the wallet via `monnify-webhook` on reserved virtual account events.

---

### 3.6 Table: `eso_pay_funding_intents`

Optional tracking row when the client asks the user to fund the wallet before paying a bill.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Funding intent ID |
| `company_id` | `UUID` | `NOT NULL` | Tenant key |
| `amount_kobo` | `BIGINT` | `NOT NULL CHECK (amount_kobo > 0)` | Expected inbound amount |
| `reserved_account_reference` | `TEXT` | `NOT NULL` | Monnify reserved virtual account reference |
| `idempotency_key` | `TEXT` | `NOT NULL UNIQUE` | Prevents duplicate intent rows |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled'))` | Intent lifecycle |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | When the UI should stop showing this intent |
| `fulfilled_at` | `TIMESTAMPTZ` | `NULLABLE` | When matching wallet credit arrived |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Creation timestamp |

**RLS Policy:** SELECT scoped to `company_id`. Writes via service role only.

---

## 4. Micro-Task Blueprint

> Each step is a single-file (or tightly scoped file-pair) task designed for Cursor Composer to execute in one focused session. Steps are isolated — each can be reviewed and merged independently before the next begins.

---

### Step 1 — Design Token Foundation
**Target file:** `src/esopay/theme/tokens.ts`

**Objective:** Establish the complete, authoritative design token system for Eso Pay. This file is the single source of truth for all colors, typography scales, spacing, border radii, shadow definitions, and animation timing constants.

**Output contract:** Export a frozen `EsoPayTokens` object typed with a recursive `DeepReadonly<T>` wrapper. No color, size, or timing value may be defined anywhere in the Eso Pay module that isn't referenced from this object.

**Includes:**
- All color tokens defined in Section 1.2.
- All typography tokens (family names as string constants, scale sizes as numbers in `sp`) from Section 1.3.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
- Border radius scale: `xs: 4, sm: 8, md: 12, lg: 20, full: 9999`.
- Shadow definitions: `cardShadow`, `modalShadow`, `inputFocusShadow` — each as a React Native `ShadowStyle` object.
- Animation constants: shimmer duration (3000ms), pulse period (1800ms), stagger step (60ms), spring config objects for card entrance and bottom sheet physics.
- Status color map: `{ live: color.emerald.live, partial: amber, offline: color.red.alert, paid: platinum }`.

**Acceptance criteria:** TypeScript compiles with zero errors. No token name collision. A consuming file can import `{ EsoPayTokens as T }` and reference `T.color.gold.primary` with full IntelliSense resolution.

---

### Step 2 — Host Context Integration Bridge
**Target files:** `src/esopay/context/EsoPayHostContext.tsx` + `src/esopay/api/client.ts` + `src/esopay/api/endpoints.ts` + `src/esopay/api/types.ts`

**Objective:** Implement the full integration layer between the parent app and Eso Pay as specified in Section 2, targeting the Monnify-backed BFF (`eso-pay-api`).

**Output contract:**
- `EsoPayHostContext` — React Context with the typed interface from Section 2.2.
- `useEsoPayHost()` — typed hook with a runtime guard (throws `Error('useEsoPayHost must be used within EsoPayHostContextProvider')` if consumed outside the provider).
- `esopayApiClient` — configured Axios singleton with request and response interceptors as specified in Section 2.3. The 401 retry logic uses a `_esoPayRetried` flag on the request config to prevent infinite retry loops.
- `esoPayApi` — typed facade with `wallet`, `bills`, and `utilities` namespaces mapping to Monnify BFF routes (Section 2.3). Includes `buildEsoPayIdempotencyKey()` and `Idempotency-Key` headers on pay/purchase mutations.
- `useEsoPayApiClient()` — hook that returns `esoPayApi` with credentials synced from host context without recreating the Axios instance.

**Acceptance criteria:** Mock the `EsoPayHostContextProvider` in a test wrapper. Confirm that `useEsoPayHost()` outside the provider throws. Confirm that an intercepted 401 response triggers exactly one `refreshAuthToken()` call. Confirm all outbound requests include `X-Company-Id`. Confirm `esoPayApi.bills.payFromWallet` sends `Idempotency-Key`.

---

### Step 3 — Data Layer: API Hooks & Local State
**Target file:** `src/esopay/api/hooks/useBilling.ts`

**Objective:** Build the complete React Query-powered data access layer for Eso Pay's core entities — bills, Monnify wallet, reserved account funding, and bill settlement. Provide typed hooks that abstract all fetch, mutation, and cache-invalidation logic via `useEsoPayApiClient()`.

**Output contract (all hooks exported from this single file):**

- `useBillsList(filters?: BillFilters)` — paginates `esoPayApi.bills.list()`, caches by `[company_id, filters]`, refetches on window focus.
- `useBillDetail(billId: string)` — fetches `esoPayApi.bills.get(billId)`.
- `useInverterOffsets(billId: string)` — fetches `esoPayApi.bills.getOffsets(billId)`, merges live telemetry from parent store.
- `useBillSummaryStats()` — fetches `esoPayApi.bills.summary()` returning `{ totalOutstandingKobo, totalOffsetKobo, overdueCount, currentMonthBillCount, walletBalanceKobo }`.
- `useWallet()` — fetches `esoPayApi.wallet.get()`, short stale time (30s) for balance accuracy.
- `useWalletTransactions()` — paginates `esoPayApi.wallet.getTransactions()`.
- `useReservedAccount()` — fetches or ensures Monnify virtual account via `getReservedAccount` / `ensureReservedAccount`.
- `useCreateFundingIntent()` — mutation for `esoPayApi.wallet.createFundingIntent()` when user needs to top up before paying.
- `usePayBillFromWallet()` — mutation for `esoPayApi.bills.payFromWallet(billId, { idempotency_key })`. On success, invalidates bill detail, summary, wallet, and payment history caches. Optimistically sets bill status to `payment_initiated` while pending.
- `usePaymentHistory(billId: string)` — fetches `esoPayApi.bills.getPayments(billId)`, sorted by `created_at DESC` (Monnify bill payment records).
- `useUtilityProviders()` — fetches `esoPayApi.utilities.listProviders()` for ad-hoc purchases.
- `useValidateUtilityAccount()` — mutation for meter validation before purchase.

**Types:** Response types live in `src/esopay/api/types.ts` (Section 3 wallet/bill schema). Use `zod` for runtime validation — a schema parse failure must log a warning and return an error state rather than crashing.

**Acceptance criteria:** Mock `esoPayApi`. All hooks return correct `{ data, isLoading, isError }` states. `usePayBillFromWallet` on success updates caches without unnecessary refetches. Insufficient wallet balance surfaces API error with actionable copy (navigate to fund wallet). A zod parse failure on a malformed bill response returns `{ isError: true }` and does not throw to the component.

---

### Step 4 — Core UI Components Library
**Target file:** `src/esopay/components/index.ts` (barrel export for all components in `src/esopay/components/`)

**Objective:** Build the Eso Pay component library — the premium, reusable building blocks. Each component is self-contained with no external state dependencies.

**Components to implement:**

- `BillCard` — Displays one bill row. Props: `bill`, `onPress`. Shows: bill period, utility provider, `net_amount_kobo` formatted as currency, due date, status badge, and the live inverter offset micro-indicator (pulsing emerald / amber / red based on `status`). Implements the staggered entrance animation from Section 1.6 via an `animationIndex` prop that drives the delay.

- `StatusBadge` — Pill-shaped label component. Props: `status: BillStatus`. Renders the correct semantic color from the status color map token. Duotone icon prefix. Text label in `type.label` scale.

- `OffsetBreakdownRow` — One inverter's offset contribution row. Props: `offset: InverterOffset`. Shows inverter serial, generation kWh in `JetBrains Mono`, and offset percentage rendered as a thin gold progress bar on a `color.bg.inset` track.

- `GoldCTAButton` — Primary payment action button. Props: `label, onPress, isLoading, isDisabled`. Full-width, gold background, obsidian text. Implements the shimmer animation from Section 1.6. Loading state shows a `ActivityIndicator` in obsidian — the shimmer pauses. Disabled state uses `color.gold.muted` background and a lock icon.

- `EsoPayHeader` — Custom navigation header. Props: `title, canGoBack, onBack`. Renders the `EsoPayWordmark` SVG on the left when `canGoBack` is false. Renders a gold back chevron when `canGoBack` is true. Background is `color.bg.surface` with a 1dp bottom border in `color.border.subtle`.

- `HeroStatCard` — Dashboard metric tile. Props: `label, value, currencyFormat?, trend?`. Displays the `Cormorant Garamond` hero number. If `trend` is provided, renders a directional arrow colored emerald (up) or red (down).

**Acceptance criteria:** Each component renders without errors in isolation. `GoldCTAButton` shimmer animation does not cause re-renders (animation is fully within Reanimated's UI thread). `BillCard` with `animationIndex={0}` enters with 0ms delay; `animationIndex={3}` enters with 180ms delay.

---

### Step 5 — Screen Assembly: Bills List + Bill Detail + Wallet Payment Flow
**Target files:**
- `src/esopay/screens/BillsListScreen.tsx`
- `src/esopay/screens/BillDetailScreen.tsx`
- `src/esopay/screens/PaymentConfirmScreen.tsx`
- `src/esopay/screens/WalletFundScreen.tsx` (optional but recommended)

**Objective:** Assemble the primary Eso Pay screens using only components from Step 4 and hooks from Step 3. No business logic in screens — screens are pure orchestration.

**BillsListScreen:**
- Header: `EsoPayHeader` with title "Billing".
- Hero section: Three `HeroStatCard` tiles — "Outstanding", "Total Offset Savings", and "Wallet Balance" — from `useBillSummaryStats()` + `useWallet()`.
- Filter bar: Horizontal `ScrollView` of status filter chips (All, Pending, Paid, Overdue). Tapping a chip updates `BillFilters` passed to `useBillsList()`. Active chip is gold-tinted.
- Bill list: `FlatList` of `BillCard` components. Each `BillCard` receives its `animationIndex` for staggered entrance. `keyExtractor` uses `bill.id`. Pull-to-refresh triggers query refetch.
- Empty state: `phosphor-react-native` `Receipt` icon (48dp, duotone gold) + "No bills found" in `type.h3` + descriptive caption.

**BillDetailScreen:**
- Receives `billId` from navigation params.
- Sections: Bill summary (period, utility, gross / offset / net amounts), Inverter Offset Breakdown (`FlatList` of `OffsetBreakdownRow` components), and Payment History (list of `monnify_bill_payments` records with status badges).
- Wallet balance callout: Shows current balance vs. `net_amount_kobo`. If insufficient, CTA becomes "Fund Wallet" → `WalletFundScreen`.
- If the bill `status` is `pending` or `overdue` and `userRole` is `owner`/`admin` and wallet balance ≥ net amount: render `GoldCTAButton` labeled "Pay ₦{netAmount} from Wallet". Tapping navigates to `PaymentConfirmScreen`.
- If `userRole` is `viewer`: render a locked-state button with caption "Payment requires admin access."

**WalletFundScreen:**
- Displays Monnify reserved virtual account details from `useReservedAccount()` — account number, bank name, account name.
- Copy-to-clipboard on account number with light haptic.
- Optional expected amount from `useCreateFundingIntent()`.
- Polling or pull-to-refresh on `useWallet()` until balance increases or user navigates back.

**PaymentConfirmScreen:**
- Pre-payment summary: Bill period, net amount in hero typography, wallet balance after debit preview, inverter savings callout ("Your inverters saved ₦X this cycle").
- Confirmation CTA: Calls `usePayBillFromWallet()` — single tap debits company Monnify wallet and settles the utility bill server-side. No card sheet, no third-party SDK.
- On success: Heavy haptic pattern, `Number Ticker` animation on savings figure, invalidate caches, navigate back to `BillDetailScreen` with `paid` status. Toast: "Bill paid ✓" in emerald.
- On failure: Error haptic pattern, failure `StatusBadge` with Monnify `failure_message`. If error code indicates insufficient funds, offer navigation to `WalletFundScreen`. Otherwise show retry affordance.

**Acceptance criteria:** All screens render in React Native without prop-type errors. `BillDetailScreen` with a `paid` bill hides the payment CTA. `PaymentConfirmScreen` calls `usePayBillFromWallet` exactly once per payment attempt (guarded by mutation `isPending`). The haptic success sequence fires after API success — not before. No `@stripe/*` dependencies in the Eso Pay module.

---

## 5. Constraints & Non-Goals

### Constraints

- **React Native version:** Target RN 0.73+. No deprecated APIs (`Animated` from core, `AsyncStorage` from core).
- **Reanimated:** v3.x only. All animations on UI thread via worklets.
- **TypeScript:** Strict mode enabled. `noImplicitAny: true`. All API response types validated at runtime with `zod`.
- **No direct DB access from client:** The React Native app never touches the database. All data flows through the Eso Pay REST API. Schema in Section 3 is the API backend's concern.
- **Monnify compliance:** Monnify API keys and wallet credentials are server-side only. Mobile uses the Eso Pay BFF; no card capture, no PCI card-data scope on device.
- **Currency handling:** All monetary values are stored and transmitted as integers (kobo/cents). Conversion to display format happens in a single `formatCurrency(amountKobo: number, currency: string)` utility in `src/esopay/utils/currency.ts`. This function is the only place where currency formatting logic lives.
- **Offline behavior:** Eso Pay degrades gracefully — React Query's stale-while-revalidate strategy serves cached data with a "Last updated X min ago" indicator. Payment actions are blocked offline with a clear error state.

### Non-Goals (v1.0)

- Eso Pay v1.0 does **not** include: utility provider API auto-import of bills, recurring/autopay setup, multi-currency switching UI, in-app invoice PDF viewer (URL opens in system browser), white-label theming, custom invoice template builder, or batch bill payment for multiple sites in one checkout.
- Eso Pay does **not** manage inverter configuration or monitoring — that remains exclusively the parent app's domain.

---

*End of Eso Pay Product Specification v1.1.0*
*Document owner: Principal Architecture | Review cycle: Per sprint | Next review: Prior to Step 3 kickoff (Monnify wallet hooks)*