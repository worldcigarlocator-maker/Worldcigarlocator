// globals.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";

// ⭐ Your project URL
export const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";

// ⭐ Public ANON key (only anon key, *never* service_role)
export const SUPABASE_ANON_KEY = "PASTE-YOUR-ANON-KEY-HERE";

// Create client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Small helper
export const qs = (id) => document.getElementById(id);
