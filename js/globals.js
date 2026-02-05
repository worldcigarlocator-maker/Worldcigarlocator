// ============================================================
// GLOBALS.JS — Supabase (SINGLE SOURCE OF TRUTH)
// ============================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm";


export const supabase = createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"
);

// sanity check
console.log("✅ supabase.rpc =", typeof supabase.rpc);



// Quick selector
export const qs = (id) => document.getElementById(id);

// ============================================================
// IMAGE RESOLVER — SINGLE SOURCE OF TRUTH
// ============================================================

export const FALLBACK_IMAGE = "images/store.jpg";

export function resolveStoreImage(store) {
  // 1️⃣ Manuell / CDN-bild (HELIG – får aldrig skrivas över)
  if (store?.photo_cdn_url) {
    return store.photo_cdn_url;
  }

  // 2️⃣ Google Places via photo-proxy
  if (store?.photo_reference) {
  return `https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy?photo_reference=${encodeURIComponent(
    store.photo_reference
  )}&maxwidth=800`;
}


  // 3️⃣ Fallback
  return FALLBACK_IMAGE;
}
