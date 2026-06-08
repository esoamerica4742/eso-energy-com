/**
 * Generate ENODE_WEBHOOK_SECRET and append Enode placeholders to .env if missing.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = join(dirname(fileURLToPath(import.meta.url)), "../.env");
if (!existsSync(envPath)) {
  console.error(".env not found");
  process.exit(1);
}

let content = readFileSync(envPath, "utf8");
const secret = randomBytes(32).toString("hex");

const additions = [];
if (!/^ENODE_WEBHOOK_SECRET=/m.test(content)) {
  additions.push(`ENODE_WEBHOOK_SECRET="${secret}"`);
}
if (!/^ENODE_ENV=/m.test(content)) {
  additions.push('ENODE_ENV="sandbox"');
}
if (!/^ENODE_CLIENT_ID=/m.test(content)) {
  additions.push("# ENODE_CLIENT_ID=from developers.enode.com");
}
if (!/^ENODE_CLIENT_SECRET=/m.test(content)) {
  additions.push("# ENODE_CLIENT_SECRET=from developers.enode.com");
}

if (additions.length > 0) {
  content += "\n\n# --- Enode (auto-generated) ---\n" + additions.join("\n") + "\n";
  writeFileSync(envPath, content);
  console.log("Updated .env with Enode settings.");
  if (additions.some((l) => l.startsWith("ENODE_WEBHOOK_SECRET"))) {
    console.log(`  ENODE_WEBHOOK_SECRET generated (${secret.length} chars)`);
  }
} else {
  console.log("Enode env keys already present.");
}

console.log("\nNext: add ENODE_CLIENT_ID and ENODE_CLIENT_SECRET from https://developers.enode.com");
