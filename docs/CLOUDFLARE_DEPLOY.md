# Deploy `app.eso-energy.com` (Cloudflare Workers)

The web command deck is a **TanStack Start** app deployed as a **Cloudflare Worker** with static assets.

Production URL: **https://app.eso-energy.com**

---

## Prerequisites

1. **Cloudflare account** with the **eso-energy.com** zone added (orange-cloud / proxied).
2. **Wrangler CLI** (bundled via `npx wrangler` after `npm ci`).
3. **`.env`** in repo root (copy from `.env.example`) with:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (baked into client at build time)
   - Server secrets (pushed separately — see below)

---

## One-time setup

### 1. Log in to Cloudflare

```powershell
cd "C:\Users\Preci\ESO ENERGY PROJECT\eso-energy-com"
npx wrangler login
npx wrangler whoami
```

### 2. Push Worker secrets

```powershell
powershell -ExecutionPolicy Bypass -File scripts/set-cf-secrets.ps1
```

This reads `.env` and runs `wrangler secret put` for crypto, Supabase, Enode, etc.

### 3. DNS (automatic)

`wrangler.jsonc` declares a **custom domain**:

```jsonc
"routes": [{ "pattern": "app.eso-energy.com", "custom_domain": true }]
```

On first deploy, Cloudflare creates the DNS record and certificate **if `eso-energy.com` is on the same account**.

**Manual DNS (if needed):**

| Type  | Name | Target |
|-------|------|--------|
| CNAME | app  | `eso-energy-app.<your-subdomain>.workers.dev` (or Custom Domain from Workers dashboard) |

Ensure the record is **Proxied** (orange cloud).

### 4. Supabase auth redirect URLs

In Supabase → Authentication → URL configuration, add:

- Site URL: `https://app.eso-energy.com`
- Redirect URLs: `https://app.eso-energy.com/**` (covers `/auth/callback?product=monitoring` and `esopay`)

Enable **Confirm email** under Auth → Providers → Email if you want the verify-email step before first login.

### 5. Enode link callback (web)

Set in `.env` / production secrets:

```
ENODE_LINK_REDIRECT_URI=https://app.eso-energy.com/link-device/callback
VITE_ENODE_LINK_REDIRECT_URI=https://app.eso-energy.com/link-device/callback
```

---

## Deploy from your PC

```powershell
npm run deploy:web
```

Dry run (build only):

```powershell
npm run deploy:web:dry
```

Verify:

```powershell
npm run verify:enterprise -- --url https://app.eso-energy.com
```

Open on phone: **https://app.eso-energy.com/welcome**

---

## GitHub Actions (CI deploy)

Workflow: `.github/workflows/deploy-cloudflare.yml`

**Repository secrets (Settings → Secrets → Actions):**

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Deploy token — Workers Scripts Edit + Account Read |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `VITE_SUPABASE_URL` | Client build |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client build |
| `VITE_SUPABASE_ANON_KEY` | Optional alias for publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Optional client metadata |

**Worker runtime secrets** are not in GitHub by default — set once via `set-cf-secrets.ps1` or Cloudflare dashboard (they persist across deploys).

Trigger:

- Push to `main` (when app files change), or
- **Actions → Deploy Cloudflare Workers → Run workflow**

Also set `ENTERPRISE_STAGING_URL` / `GO_LIVE_TARGET_URL` to `https://app.eso-energy.com` for existing CI gates.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `app.eso-energy.com` does not resolve | Confirm zone on Cloudflare; check DNS for `app` CNAME; re-run deploy |
| 500 on health endpoint | Run `set-cf-secrets.ps1`; check Worker logs: `npx wrangler tail --config dist/server/wrangler.json` |
| Login works locally but not prod | Add Supabase redirect URLs; rebuild with correct `VITE_SUPABASE_*` |
| Enode link fails | Set `ENODE_LINK_REDIRECT_URI` + `VITE_ENODE_LINK_REDIRECT_URI` to production callback |

---

## Worker name

- Config: `eso-energy-app` (`wrangler.jsonc`)
- Replaces legacy `tanstack-start-app`
