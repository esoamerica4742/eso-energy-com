/**
 * Verify Monnify sandbox credentials from eso-energy-com/.env
 */
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

const apiKey = process.env.MONNIFY_API_KEY?.trim();
const secretKey = process.env.MONNIFY_SECRET_KEY?.trim();
const contractCode = process.env.MONNIFY_CONTRACT_CODE?.trim();
const env = (process.env.MONNIFY_ENV ?? "sandbox").toLowerCase();
const baseUrl =
  process.env.MONNIFY_BASE_URL?.trim() ||
  (env === "live" || env === "production"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com");

console.log("Monnify env:", env);
console.log("Base URL:", baseUrl);
console.log("Contract code:", contractCode ? `${contractCode.slice(0, 4)}…` : "MISSING");

if (!apiKey || !secretKey || !contractCode) {
  console.error("\nMissing in .env:");
  if (!apiKey) console.error("  MONNIFY_API_KEY");
  if (!secretKey) console.error("  MONNIFY_SECRET_KEY");
  if (!contractCode) console.error("  MONNIFY_CONTRACT_CODE");
  console.error("\nCopy from Monnify Dashboard → Developer → API Keys & Contracts");
  process.exit(1);
}

const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
  method: "POST",
  headers: {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  },
});

const json = await res.json();
if (!res.ok || !json.requestSuccessful) {
  console.error("\nMonnify auth FAILED:", json.responseMessage ?? res.status);
  process.exit(1);
}

console.log("\nMonnify auth: OK");
console.log("Token expires in (s):", json.responseBody?.expiresIn ?? "?");

const sandboxBvn = process.env.MONNIFY_SANDBOX_BVN?.trim();
if (!sandboxBvn) {
  console.log(
    "\nNext: add MONNIFY_SANDBOX_BVN=22222222222 to .env (required for Fund wallet virtual accounts)",
  );
  console.log("Then: npm run probe:monnify:account && npm run secrets:monnify");
} else {
  console.log("\nSandbox BVN: set (run npm run probe:monnify:account to test virtual account creation)");
}
