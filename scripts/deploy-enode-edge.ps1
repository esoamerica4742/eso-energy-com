# Deploy Enode edge functions to Supabase (requires: npx supabase login)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Linking project..." -ForegroundColor Cyan
npx supabase@latest link --project-ref ssmcnzsvrcxfbgufvoed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Setting secrets from .env..." -ForegroundColor Cyan
npx supabase@latest secrets set --env-file .env
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying enode-webhook..." -ForegroundColor Cyan
npx supabase@latest functions deploy enode-webhook --no-verify-jwt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying enode-api..." -ForegroundColor Cyan
npx supabase@latest functions deploy enode-api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDone. Webhook URL:" -ForegroundColor Green
Write-Host "  https://ssmcnzsvrcxfbgufvoed.supabase.co/functions/v1/enode-webhook"
