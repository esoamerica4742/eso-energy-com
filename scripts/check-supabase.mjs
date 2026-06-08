import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const envPath = join(dirname(fileURLToPath(import.meta.url)), "../.env");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await admin.from("profiles").select("id").limit(1);
console.log("REST API:", error ? `ERR ${error.code} ${error.message}` : `OK (${data?.length ?? 0} rows)`);

try {
  const { error: secErr } = await admin.from("user_security_settings").select("user_id").limit(1);
  console.log("user_security_settings:", secErr ? `MISSING/ERR ${secErr.code}` : "EXISTS");
} catch (e) {
  console.log("user_security_settings:", e.message);
}
