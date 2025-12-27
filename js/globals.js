// ============================================================
// globals.js — Frontend Supabase Client (ES MODULE)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔴 SKAPA KLIENTEN (detta saknades funktionellt)
const supabase = createClient(
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

// 🔵 EXPORTERA SJÄLVA KLIENTEN – INTE BIBLIOTEKET
export { supabase };

// Debug (tillfälligt)
console.log("✅ Supabase CLIENT created:", supabase);
