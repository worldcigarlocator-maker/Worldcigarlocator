/* ============================================================
   auth.js — Backoffice Auth Guard (NO MODULES / NO EXPORTS)
   Depends on: globals.js (window.WCL_BO)
   ============================================================ */

(function () {
  "use strict";

  const WCL_BO = window.WCL_BO;
  if (!WCL_BO || !WCL_BO.supabase) {
    console.error("auth.js: WCL_BO or supabase missing (globals.js failed?)");
    return;
  }

  async function showApp() {
    document.getElementById("login-screen")?.style.setProperty("display", "none");
    document.querySelector(".wrap")?.style.setProperty("display", "block");

    // Backoffice boot
    if (typeof window.reloadData === "function") {
      await window.reloadData("pending");
    } else {
      console.error("auth.js: reloadData() not found. backoffice.js did not load?");
    }
  }

  async function showLogin() {
    document.querySelector(".wrap")?.style.setProperty("display", "none");
    document.getElementById("login-screen")?.style.setProperty("display", "flex");
  }

  async function checkAuth() {
    try {
      const { data: { user }, error } = await WCL_BO.supabase.auth.getUser();
      if (error) {
        // If token/session is broken, we treat it as logged out
        console.warn("checkAuth getUser error:", error);
        return showLogin();
      }
      if (user) return showApp();
      return showLogin();
    } catch (e) {
      console.warn("checkAuth failed:", e);
      return showLogin();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    console.log("🧩 Auth init – DOM loaded");

    // Login button
    document.getElementById("login-btn")?.addEventListener("click", async () => {
      const email = document.getElementById("email")?.value?.trim() || "";
      const password = document.getElementById("password")?.value?.trim() || "";

      const { error } = await WCL_BO.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const el = document.getElementById("login-error");
        if (el) el.textContent = "❌ Wrong email or password";
        return;
      }

      await showApp();
    });

    // Check session on start
    checkAuth();
  });

  // Optional logout callable from UI
  window.logout = async () => {
    await WCL_BO.supabase.auth.signOut();
    await checkAuth();
  };

  // Expose guard (optional)
  window.checkAuth = checkAuth;
})();
