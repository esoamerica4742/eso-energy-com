/**
 * Enable Realtime publications for telemetry + energy_metrics.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadProjectEnv } from './load-env.mjs';

loadProjectEnv({ force: true });

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../supabase/migrations/20260521130000_realtime_publications.sql',
);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required in .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

try {
  await client.connect();
  console.log('Applying Realtime publications migration…');
  await client.query(readFileSync(migrationPath, 'utf8'));
  console.log('✓ Realtime enabled for enode_telemetry_snapshots, energy_metrics.');
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
