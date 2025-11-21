// ============================================================
// SUPABASE CLIENT
// ============================================================
export const supabase = window.supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "YOUR_PUBLIC_ANON_KEY"
);

// Snabb query selector
export const qs = (id) => document.getElementById(id);
