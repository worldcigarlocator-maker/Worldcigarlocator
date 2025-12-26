/* ============================================================
   globals.js — Backoffice Globals (NO MODULES / NO EXPORTS)
   Namespace: window.WCL_BO
   ============================================================ */

(function () {
  "use strict";

  // Global namespace (safe)
  const WCL_BO = (window.WCL_BO = window.WCL_BO || {});

  /* ======================== CONFIG ======================== */
  WCL_BO.config = {
    SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
    SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",

    PHOTO_PROXY_URL:
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
    PHOTO_REFS_URL:
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs",

    FALLBACK_IMG:
      "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",

    FLAGS_BASE:
      "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags",
  };

  /* ======================= HELPERS ======================== */
  WCL_BO.$ = (sel) => document.querySelector(sel);
  WCL_BO.$$ = (sel) => Array.from(document.querySelectorAll(sel));
  WCL_BO.safe = (v) => (v ?? "").toString();

  WCL_BO.toast = (msg, cls = "success") => {
    const c = WCL_BO.$("#toast-container");
    if (!c) {
      console.warn("[toast]", msg);
      return;
    }
    const t = document.createElement("div");
    t.className = `toast ${cls}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };

  /* ======================= SUPABASE ======================= */
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "Supabase CDN not loaded. Check <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script>"
    );
    return;
  }

  WCL_BO.supabase = window.supabase.createClient(
    WCL_BO.config.SUPABASE_URL,
    WCL_BO.config.SUPABASE_ANON_KEY
  );

  console.log("✅ globals.js loaded — WCL_BO ready");
})();
