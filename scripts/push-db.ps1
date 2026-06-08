# Push Supabase migrations. Tries session pooler; falls back to manual bundle.
# Usage:
#   .\scripts\push-db.ps1
#   .\scripts\push-db.ps1 -Password "your-real-db-password"
#
# Password: Supabase Dashboard -> Project Settings -> Database
param(
  [string]$Password = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$ProjectRef = "pndsuzscjedumjhadtio"
$PoolerHost = "aws-1-eu-west-2.pooler.supabase.com"
$SqlEditorUrl = "https://supabase.com/dashboard/project/$ProjectRef/sql/new"
$BundledSql = "scripts\sql\all-migrations-bundled.sql"

function Show-ManualSteps {
  Write-Host ""
  Write-Host "Cannot reach Postgres from this network (port 5432 blocked or timed out)." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Option A — SQL Editor (recommended):" -ForegroundColor Cyan
  Write-Host "  1. node scripts/bundle-migrations.mjs"
  Write-Host "  2. Open $SqlEditorUrl"
  Write-Host "  3. Paste contents of $BundledSql and click Run"
  Write-Host ""
  Write-Host "Option B — GitHub Actions:" -ForegroundColor Cyan
  Write-Host "  Add DATABASE_URL repo secret, then run workflow: Database Migrations"
  Write-Host ""
  Write-Host "Option C — Different network:" -ForegroundColor Cyan
  Write-Host "  Retry from mobile hotspot or another network that allows outbound :5432"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  $secure = Read-Host "Database password (Supabase Settings -> Database)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if ([string]::IsNullOrWhiteSpace($Password) -or $Password -match "YOUR_") {
  Write-Host "Use your real database password from the Supabase dashboard, not a placeholder." -ForegroundColor Red
  exit 1
}

Add-Type -AssemblyName System.Web
$EncodedPassword = [System.Web.HttpUtility]::UrlEncode($Password)
$DbUrl = "postgresql://postgres.${ProjectRef}:${EncodedPassword}@${PoolerHost}:5432/postgres"

Write-Host "Pushing migrations via ${PoolerHost}:5432 (session pooler)..." -ForegroundColor Cyan

$env:DATABASE_URL = $DbUrl
$env:SUPABASE_DB_PASSWORD = $Password

npx supabase@latest db push --db-url $DbUrl
if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Migrations applied." -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "supabase db push failed - trying node migration runner..." -ForegroundColor Yellow
node scripts/run-all-migrations.mjs
if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Migrations applied." -ForegroundColor Green
  exit 0
}

node scripts/bundle-migrations.mjs
Show-ManualSteps
exit 1
