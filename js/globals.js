// ============================================================
// GLOBALS.JS — Supabase (SINGLE SOURCE OF TRUTH)
// Frontend-only · ESM · Stable CDN
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";


/* ============================================================
   SUPABASE CLIENT
   ============================================================ */

export const SUPABASE_URL =
  "https://gbxxoeplkzbhsvagnfsr.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// 🔒 Sanity check (ska logga "function")
console.log("✅ supabase.rpc =", typeof supabase.rpc);

/* ============================================================
   SMALL UTILS
   ============================================================ */

// Quick selector (frontend convenience)
export const qs = (id) => document.getElementById(id);

/* ============================================================
   IMAGE RESOLVER — SINGLE SOURCE OF TRUTH
   ============================================================ */

export const FALLBACK_IMAGE = "images/store.jpg";

export function resolveStoreImage(store) {
  // 1️⃣ CDN / manuellt satt bild (HELIG)
  if (store?.photo_cdn_url) {
    return store.photo_cdn_url;
  }

  // 2️⃣ Google Places via Supabase photo-proxy
  if (store?.photo_reference) {
    return (
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy" +
      `?photo_reference=${encodeURIComponent(store.photo_reference)}` +
      "&maxwidth=800"
    );
  }

  // 3️⃣ Fallback
  return FALLBACK_IMAGE;
}
