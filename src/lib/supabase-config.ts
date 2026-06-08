/** True when VITE_SUPABASE_URL is set (client can reach Supabase). */
export const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);
