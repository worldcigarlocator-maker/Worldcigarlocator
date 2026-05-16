// ============================================================
// GLOBALS.JS — WCL Supabase Client
// SINGLE SOURCE OF TRUTH
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

export const WCL_DEBUG =
  Boolean(window?.WCL_DEBUG);

export function debugLog(...args) {
  if (WCL_DEBUG) console.log(...args);
}

/* ============================================================
   SUPABASE CONFIG
   ============================================================ */

export const SUPABASE_URL =
  "https://gbxxoeplkzbhsvagnfsr.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

export const GOOGLE_BROWSER_KEY =
  "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

/* ============================================================
   SUPABASE CLIENT
   ============================================================ */

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/* ============================================================
   GLOBAL EXPORT
   ============================================================ */

window.supabase = supabase;

debugLog("WCL Supabase client loaded");
debugLog("supabase.from =", typeof supabase.from);
debugLog("supabase.rpc =", typeof supabase.rpc);

/* ============================================================
   DOM UTIL
   ============================================================ */

export const qs = (id) => document.getElementById(id);

/* ============================================================
   IMAGE RESOLVER
   ============================================================ */

export const FALLBACK_IMAGE = "images/store.jpg";

export function resolveStoreImage(store) {

  if (!store) return FALLBACK_IMAGE;

  // CDN image (highest priority)
  if (store.photo_cdn_url) {
    return store.photo_cdn_url;
  }

  // Google Places photo proxy
  if (store.photo_reference) {
    return (
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy" +
      `?photo_reference=${encodeURIComponent(store.photo_reference)}` +
      "&maxwidth=800"
    );
  }

  // fallback
  return FALLBACK_IMAGE;
}
