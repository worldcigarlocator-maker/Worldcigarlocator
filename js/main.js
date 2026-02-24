// ============================================================
// MAIN.JS — WCL Frontend (CLEAN · DEBUG-SAFE)
// ============================================================

import { supabase } from "./globals.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { resetToHero } from "./cards.js";
import "./start.js";

const qs = (sel) => document.querySelector(sel);

// ============================================================
// LOGIN POPUP
// ============================================================
function hideLoginPopup() {
  const popup = qs("#loginPopup");
  if (!popup) return;
  popup.classList.add("hidden");
  popup.style.display = "none";
}

function showLoginPopup() {
  const popup = qs("#loginPopup");
  if (!popup) return;
  popup.style.display = "flex";
  popup.classList.remove("hidden");
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {

  console.log("MAIN BOOT");

  // 🔥 Bygg sidebar DIREKT (ingen flagga)
  try {
    await buildFrontendSidebar();
    console.log("SIDEBAR BUILT");
  } catch (err) {
    console.error("SIDEBAR ERROR:", err);
  }

  resetToHero();

  // ----------------------------------------------------------
  // ADD STORE BUTTON
  // ----------------------------------------------------------
  const addBtn = qs("#addStoreBtn");

  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        showLoginPopup();
        return;
      }

      window.location.href = "add-store.html";
    });
  }

});

// ------------------------------------------------------------
// AUTH LISTENER (UI only)
// ------------------------------------------------------------
supabase.auth.onAuthStateChange(() => {
  hideLoginPopup();
});
