// ============================================================
// MAIN.JS — WCL Frontend (PUBLIC-FIRST · STABLE)
// - Sidebar always builds
// - Page always interactive
// - Auth only gates specific actions (like Add Store)
// ============================================================

// ============================================================
// IMPORTS
// ============================================================
import { supabase } from "./globals.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { resetToHero } from "./cards.js";
import "./start.js";

// ============================================================
// HELPERS
// ============================================================
const qs = (sel) => document.querySelector(sel);

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
// INIT SIDEBAR (RUN ONCE)
// ============================================================
let SIDEBAR_BUILT = false;

async function initSidebar() {
  if (SIDEBAR_BUILT) return;
  SIDEBAR_BUILT = true;

  try {
    await buildFrontendSidebar();
  } catch (err) {
    console.error("Sidebar build failed:", err);
  }
}

// ============================================================
// AUTH STATE (NON-BLOCKING)
// ============================================================
async function handleAuthUI() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    hideLoginPopup();
    return;
  }

  hideLoginPopup();
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  await initSidebar();
  await handleAuthUI();
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
// AUTH LISTENER (does NOT rebuild sidebar)
// ------------------------------------------------------------
supabase.auth.onAuthStateChange(() => {
  handleAuthUI();
});
