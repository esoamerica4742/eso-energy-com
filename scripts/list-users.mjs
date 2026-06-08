import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const { rows } = await client.query(
  `select p.id, p.email, p.company_id, c.name as company
   from public.profiles p
   left join public.companies c on c.id = p.company_id
   order by p.created_at desc
   limit 10`,
);
console.table(rows);
await client.end();
