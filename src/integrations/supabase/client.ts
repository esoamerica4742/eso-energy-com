import { createClient } from "@supabase/supabase-js";

// Project ref decoded from the anon JWT: wjcpsemrttsnmosuvobx
const SUPABASE_URL = "https://wjcpsemrttsnmosuvobx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqY3BzZW1ydHRzbm1vc3V2b2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDg4NzYsImV4cCI6MjA5NDI4NDg3Nn0.gY43RuKodvutjwaV3YpNM-0EB7cIu77N2lZDaluEa_g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== "undefined",
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

export const ENTERPRISE_CLIENT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
