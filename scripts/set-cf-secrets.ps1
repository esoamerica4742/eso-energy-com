# Push Worker secrets to Cloudflare (eso-energy-app).
# Requires: npx wrangler login && npx wrangler whoami
# Reads values from .env in repo root.

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $repoRoot ".env"

if (-not (Test-Path $envFile)) {
  Write-Error ".env not found at $envFile"
}

function Get-EnvValue($name) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match "^$name=(.+)$") {
      return $matches[1].Trim('"', "'")
    }
  }
  return $null
}

$secrets = @(
  "ENCRYPTION_MASTER_KEY",
  "AUTH_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "ENODE_CLIENT_ID",
  "ENODE_CLIENT_SECRET",
  "ENODE_WEBHOOK_SECRET",
  "ENODE_JOB_TOKEN",
  "ENODE_LINK_REDIRECT_URI",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN"
)

Set-Location $repoRoot
Write-Host "Setting Cloudflare Workers secrets for eso-energy-app..." -ForegroundColor Cyan

foreach ($name in $secrets) {
  $val = Get-EnvValue $name
  if (-not $val) {
    Write-Warning "Skipping $name — not in .env"
    continue
  }
  Write-Host "  -> $name"
  $val | npx wrangler secret put $name
}

Write-Host "`nPlain vars live in wrangler.jsonc (AUTH_URL, WEBAUTHN_*, ENODE_JOBS_BASE_URL)." -ForegroundColor Yellow
Write-Host "Client VITE_* vars are baked at build time — set them before npm run deploy:web." -ForegroundColor Yellow
Write-Host "`nDone."
