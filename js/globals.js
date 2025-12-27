/* ============================================================
   globals.js — WCL Frontend Globals (NO MODULES)
   Creates: window.WCL + window.WCL.supabase
   ============================================================ */
(function () {
  "use strict";

  // Global helpers
  window.qs  = (sel) => document.querySelector(sel);
  window.qsa = (sel) => Array.from(document.querySelectorAll(sel));

  // Namespace
  const WCL = (window.WCL = window.WCL || {});

  // Config (keep your values)
  WCL.config = {
    SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
    SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",

    PHOTO_PROXY_URL:
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",

    FALLBACK_IMG:
      "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",

    FLAGS_BASE:
      "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags",
  };

  // Ensure Supabase CDN is loaded
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("❌ Supabase CDN not loaded. Check the CDN <script> in HTML.");
    return;
  }

  // Create a client WITHOUT overwriting window.supabase (the library namespace)
  WCL.supabase = window.supabase.createClient(
    WCL.config.SUPABASE_URL,
    WCL.config.SUPABASE_ANON_KEY
  );

  console.log("✅ Frontend globals.js loaded — WCL ready");
})();
