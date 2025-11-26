// globals.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";

// ⭐ Supabase project URL
export const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";

// ⭐ Your ANON KEY (safe for frontend)
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

// ⭐ Create client (this was failing before)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ⭐ Small query selector helper
export const qs = (id) => document.getElementById(id);
