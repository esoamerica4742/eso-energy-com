# Deploy Eso Pay + Monnify edge functions to Supabase (requires: npx supabase login + .env)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Linking project..." -ForegroundColor Cyan
$ProjectRef = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { "pndsuzscjedumjhadtio" }
npx supabase@latest link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Applying Eso Pay SQL migrations (direct Postgres)..." -ForegroundColor Cyan
node scripts/apply-eso-pay-migration.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Setting Monnify edge secrets..." -ForegroundColor Cyan
node scripts/set-monnify-secrets.mjs
if ($LASTEXITCODE -ne 0) {
  Write-Host "Warning: secrets set failed (add SUPABASE_ACCESS_TOKEN or run npx supabase login)" -ForegroundColor Yellow
}

Write-Host "Deploying monnify-webhook (no JWT - Monnify calls directly)..." -ForegroundColor Cyan
npx supabase@latest functions deploy monnify-webhook --no-verify-jwt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying eso-pay-api..." -ForegroundColor Cyan
npx supabase@latest functions deploy eso-pay-api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nRunning API smoke test..." -ForegroundColor Cyan
node scripts/probe-eso-pay-api.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDone." -ForegroundColor Green
Write-Host "  BFF:     https://$ProjectRef.supabase.co/functions/v1/eso-pay-api"
Write-Host "  Webhook: https://$ProjectRef.supabase.co/functions/v1/monnify-webhook"
Write-Host "`nRegister the webhook URL in Monnify Dashboard -> Settings -> Webhooks"
