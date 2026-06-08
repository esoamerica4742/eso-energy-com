/**
 * Ensure default company exists and all profiles are linked (multi-tenant Enode).
 */
import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_SITE_ID = "00000000-0000-4000-8000-000000000010";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  await client.query(
    `insert into public.companies (id, name)
     values ($1, 'ESO Energy')
     on conflict (id) do update set name = excluded.name`,
    [DEMO_COMPANY_ID],
  );

  const updated = await client.query(
    `update public.profiles
     set company_id = $1, updated_at = now()
     where company_id is null
     returning id`,
    [DEMO_COMPANY_ID],
  );

  console.log(`✓ Company ready: ${DEMO_COMPANY_ID}`);
  console.log(`✓ Profiles linked to company: ${updated.rowCount}`);

  await client.query(
    `insert into public.sites (id, company_id, name, location, latitude, longitude)
     values ($1, $2, 'Lagos HQ', 'Lagos, Nigeria', 6.5244, 3.3792)
     on conflict (id) do update set
       name = excluded.name,
       location = excluded.location,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       updated_at = now()`,
    [DEMO_SITE_ID, DEMO_COMPANY_ID],
  );
  console.log(`✓ Demo site seeded: Lagos HQ (${DEMO_SITE_ID})`);

  await client.query(
    `insert into public.enode_connections (company_id, enode_user_id, link_status)
     values ($1, $2, 'pending')
     on conflict (company_id) do nothing`,
    [DEMO_COMPANY_ID, `eso-company-${DEMO_COMPANY_ID}`],
  );

  const demoDevice = await client.query(
    `select id from public.enode_devices where company_id = $1 limit 1`,
    [DEMO_COMPANY_ID],
  );

  if (demoDevice.rowCount === 0) {
    await client.query(
      `insert into public.enode_devices (
        company_id, enode_device_id, enode_user_id, device_type, vendor,
        display_name, is_reachable, connection_status,
        production_rate_kw, grid_power_kw, raw_state, last_seen_at
      ) values (
        $1, 'demo-inverter-1', $2, 'inverter', 'DEMO',
        'Demo Solar Inverter', true, 'connected',
        142.4, -142.4, '{}'::jsonb, now()
      )`,
      [DEMO_COMPANY_ID, `eso-company-${DEMO_COMPANY_ID}`],
    );
    console.log("✓ Demo Enode device seeded for dashboard UI");
  }

  const deviceRow = await client.query(
    `select id from public.enode_devices where company_id = $1 limit 1`,
    [DEMO_COMPANY_ID],
  );
  if (deviceRow.rowCount > 0) {
    await client.query(
      `insert into public.telemetry_site_summary (
        tenant_id, site_id, device_count, online_count, fault_count,
        total_solar_kw, total_load_kw, avg_battery_soc, stale_device_count, updated_at
      ) values ($1, $2, 1, 1, 0, 142.4, 0, null, 0, now())
      on conflict (tenant_id, site_id) do update set
        device_count = excluded.device_count,
        online_count = excluded.online_count,
        total_solar_kw = excluded.total_solar_kw,
        updated_at = now()`,
      [DEMO_COMPANY_ID, DEMO_SITE_ID],
    );
    console.log("✓ Demo telemetry site summary seeded");
  }

} catch (err) {
  console.error("Bootstrap failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
