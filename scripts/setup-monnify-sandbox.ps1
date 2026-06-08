# Monnify sandbox -> Supabase edge (Eso Pay)

# Prereq: fill MONNIFY_* and SUPABASE_DB_PASSWORD (or DATABASE_URL) in eso-energy-com/.env

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot\..



function Import-DotEnv {

  if (-not (Test-Path .env)) { return }

  Get-Content .env | ForEach-Object {

    $line = $_.Trim()

    if (-not $line -or $line.StartsWith('#')) { return }

    $idx = $line.IndexOf('=')

    if ($idx -lt 1) { return }

    $key = $line.Substring(0, $idx).Trim()

    $val = $line.Substring($idx + 1).Trim()

    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {

      $val = $val.Substring(1, $val.Length - 2)

    }

    Set-Item -Path "Env:$key" -Value $val

  }

}



Import-DotEnv



$ProjectRef = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { "pndsuzscjedumjhadtio" }



Write-Host "=== Monnify sandbox setup (project: $ProjectRef) ===" -ForegroundColor Cyan



Write-Host "`n1. Probing Monnify credentials..." -ForegroundColor Yellow

node scripts/probe-monnify.mjs

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $env:MONNIFY_SANDBOX_BVN) {
  Write-Host "`nWARNING: MONNIFY_SANDBOX_BVN missing in .env (Fund wallet needs 11-digit sandbox BVN)" -ForegroundColor DarkYellow
  Write-Host "Add: MONNIFY_SANDBOX_BVN=22222222222" -ForegroundColor DarkYellow
}



Write-Host "`n2. Linking Supabase..." -ForegroundColor Yellow

npx supabase@latest link --project-ref $ProjectRef

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }



Write-Host "`n3. Applying Eso Pay DB migrations (direct SQL, not db push)..." -ForegroundColor Yellow

node scripts/apply-eso-pay-migration.mjs

if ($LASTEXITCODE -ne 0) {

  Write-Host "Migration failed - see error above" -ForegroundColor Red

  exit $LASTEXITCODE

}



Write-Host "`n4. Setting Monnify secrets on Supabase..." -ForegroundColor Yellow

if (-not $env:SUPABASE_ACCESS_TOKEN) {

  Write-Host "No SUPABASE_ACCESS_TOKEN in .env - opening login (one-time)..." -ForegroundColor DarkYellow

  Write-Host "Or paste a token from https://supabase.com/dashboard/account/tokens into .env" -ForegroundColor DarkYellow

  npx supabase@latest login

  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

}

node scripts/set-monnify-secrets.mjs

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }



Write-Host "`n5. Deploying edge functions..." -ForegroundColor Yellow

npx supabase@latest functions deploy monnify-webhook --no-verify-jwt --project-ref $ProjectRef

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx supabase@latest functions deploy eso-pay-api --project-ref $ProjectRef

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }



$Base = "https://$ProjectRef.supabase.co/functions/v1"

Write-Host "`n=== Done ===" -ForegroundColor Green

Write-Host "  BFF:     ${Base}/eso-pay-api"

Write-Host "  Webhook: ${Base}/monnify-webhook"

Write-Host ""

Write-Host "Register webhook in Monnify Dashboard -> Settings -> Webhooks"

Write-Host "Then: node scripts/bootstrap-tenant.mjs  (company + profile link)"

Write-Host "Mobile: EXPO_PUBLIC_ESO_PAY_API_URL=${Base}/eso-pay-api"

