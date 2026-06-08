-- Enable Supabase Realtime for fleet energy metrics (idempotent).

do $$
begin
  alter publication supabase_realtime add table public.enode_telemetry_snapshots;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.energy_metrics;
exception
  when duplicate_object then null;
end $$;
