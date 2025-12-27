// ============================================================
// globals.js — WCL Frontend Globals (ES MODULE)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "DIN_ANON_KEY",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

console.log("✅ Frontend globals.js loaded — Supabase ready");
