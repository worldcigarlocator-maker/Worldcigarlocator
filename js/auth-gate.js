// ============================================================
// auth-gate.js — WCL
// ------------------------------------------------------------
// • HARD gate: blocks app if not authenticated
// • Must run BEFORE any UI logic
// • No UI, no side effects
// ============================================================

import { supabase } from "./globals.js";

export async function runAuthGate() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // 🔒 Not logged in → redirect
    window.location.href = "/login.html";
    return false;
  }

  // ✅ Logged in → allow app to boot
  return true;
}
