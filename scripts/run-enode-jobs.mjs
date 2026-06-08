/**
 * Runs Enode background jobs through authenticated job endpoints.
 *
 * Required env:
 * - ENODE_JOBS_BASE_URL (e.g. https://app.eso-energy.com/api/enode)
 * - ENODE_JOB_TOKEN
 *
 * Example:
 *   ENODE_JOBS_BASE_URL=https://app.eso-energy.com/api/enode ENODE_JOB_TOKEN=... node scripts/run-enode-jobs.mjs
 */

const baseUrl = (process.env.ENODE_JOBS_BASE_URL ?? "").replace(/\/$/, "");
const token = process.env.ENODE_JOB_TOKEN ?? "";

if (!baseUrl || !token) {
  console.error("Missing ENODE_JOBS_BASE_URL or ENODE_JOB_TOKEN");
  process.exit(1);
}

async function call(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "x-job-token": token,
      "content-type": "application/json",
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  console.log("Running Enode queue processor...");
  const queue = await call("/jobs/process-webhook-queue?limit=500&parallel=12");
  console.log(queue);

  console.log("Running Enode offline detection...");
  const offline = await call("/jobs/offline-check?staleMinutes=10&criticalMinutes=15&cooldownMinutes=30");
  console.log(offline);

  console.log("Running Enode rollups/prune...");
  const rollups = await call("/jobs/rollups?hourlyHours=72&dailyDays=30&rawDays=14&fiveMinDays=120&hourlyRetainDays=730");
  console.log(rollups);
}

void main();
