# Build + deploy ESO Energy web app to Cloudflare Workers (app.eso-energy.com).
# Prereqs: npx wrangler login && .env in repo root
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$dryRun = $args -contains "--dry-run"
$argsList = @("scripts/deploy-web-app.mjs")
if ($dryRun) { $argsList += "--dry-run" }

node @argsList
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
