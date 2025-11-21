import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "YOUR_PUBLIC_ANON_KEY"
);

export const qs = (id) => document.getElementById(id);
