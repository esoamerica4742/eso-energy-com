import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type GridLedgerEntryType =
  | "capacity_alert"
  | "auto_top_up_scheduled"
  | "auto_top_up_success"
  | "auto_top_up_failed"
  | "token_credit";

export async function recordGridLedgerEntry(
  supabase: SupabaseClient,
  input: {
    user_id: string;
    meter_id: string;
    entry_type: GridLedgerEntryType;
    amount_kobo?: number | null;
    capacity_pct?: number | null;
    message: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string | null> {
  const { data, error } = await supabase.rpc("record_grid_ledger_entry", {
    p_user_id: input.user_id,
    p_meter_id: input.meter_id,
    p_entry_type: input.entry_type,
    p_amount_kobo: input.amount_kobo ?? null,
    p_capacity_pct: input.capacity_pct ?? null,
    p_message: input.message,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[grid-ledger]", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}
