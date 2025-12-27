// ============================================================
// globals.js — FRONTEND (NO MODULES, RESTORED)
// ============================================================

"use strict";

// Supabase CDN must be loaded first
if (!window.supabase || !window.supabase.createClient) {
  console.error("❌ Supabase CDN not loaded");
}

// 🔑 CREATE THE CLIENT (THIS IS WHAT WAS MISSING)
window.supabase = window.supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"
);

console.log("✅ Frontend Supabase client restored");
