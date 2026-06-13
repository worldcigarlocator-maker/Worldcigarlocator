// ============================================================
// WCL AUTH UI
// Shared frontend guard for account-only actions.
// ============================================================

import { supabase } from "/js/globals.js";

export function requestAuthentication(message = "") {
  window.dispatchEvent(
    new CustomEvent("wcl:auth-required", {
      detail: { message }
    })
  );
}

export async function requireAuthenticatedUser(message = "") {
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session?.user) return session.user;
  } catch (error) {
    console.warn("Auth check failed:", error);
  }

  requestAuthentication(message);
  return null;
}
