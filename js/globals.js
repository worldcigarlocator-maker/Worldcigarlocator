// ============================================================
// GLOBALS.JS — SINGLE SOURCE OF TRUTH
// ============================================================

// ✔️ Modern, stabil CDN import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ✔️ Your project URL
export const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";

// ✔️ Your public anon key
export const SUPABASE_ANON_KEY = "HÄR_DIN_PUBLIC_ANON_KEY";

// ✔️ Create global client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================================
// Helper: Quick selector function
// ============================================================
export function qs(id) {
  return document.getElementById(id);
}
