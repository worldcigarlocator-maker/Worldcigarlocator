// ============================================================
// MAIN.JS — WCL Frontend
// AUTH-FIRST · STABLE · SINGLE SEARCH PIPELINE
// ============================================================

// ----- Local helpers (ESM-safe) -----
const qs  = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

// ============================================================
// IMPORTS (SAFE ORDER)
// ============================================================

// 🔒 Supabase MUST load first
import { supabase } from "./globals.js";

// ❌ Analytics DISABLED until explicitly re-enabled
// import "./analytics-frontend.js";

// App modules
import { resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import "./start.js";

// ============================================================
// LOGIN POPUP
// ============================================================
function showLoginPopup() {
  const popup = qs("#loginPopup");
  if (!popup) return;

  popup.classList.remove("hidden");

  const email    = qs("#loginEmail");
  const pass     = qs("#loginPassword");
  const remember = qs("#rememberMe");
  const btn      = qs("#loginSubmit");
  const spinner  = qs("#loginSpinner");
  const label    = qs(".login-text");

  setTimeout(() => email?.focus(), 80);

  const saved = localStorage.getItem("wcl_saved_email");
  if (saved && email && remember) {
    email.value = saved;
    remember.checked = true;
  }

  btn.onclick = async () => {
    const e = email.value.trim();
    const p = pass.value.trim();
    if (!e || !p) {
      alert("Please fill in all fields.");
      return;
    }

    if (remember?.checked) {
      localStorage.setItem("wcl_saved_email", e);
    } else {
      localStorage.removeItem("wcl_saved_email");
    }

    btn.disabled = true;
    spinner?.classList.remove("hidden");
    if (label) label.textContent = "Logging in…";

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p,
    });

    if (error) {
      alert("Login failed: " + error.message);
      btn.disabled = false;
      spinner?.classList.add("hidden");
      if (label) label.textContent = "Login";
      return;
    }

    location.reload();
  };
}

// ============================================================
// LOGOUT
// ============================================================
function setupLogout() {
  const logout = qs("#logoutBtn");
  if (!logout) return;

  logout.onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };
}

// ============================================================
// SIDEBAR INIT — BUILD ONCE (AFTER AUTH)
// ============================================================
let SIDEBAR_READY = false;

async function initSidebar() {
  if (SIDEBAR_READY) return;
  SIDEBAR_READY = true;

  try {
    await buildFrontendSidebar();
  } catch (e) {
    console.error("❌ Sidebar init failed", e);
  }
}

// ============================================================
// AUTH GUARD — SINGLE SOURCE OF TRUTH
// ============================================================
async function guard() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const container = qs(".container");

  if (!session) {
    if (container) container.style.display = "none";
    showLoginPopup();
    return;
  }

  if (container) container.style.display = "";

  await initSidebar();
  resetToHero();
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  guard();
});

supabase.auth.onAuthStateChange(() => {
  guard();
});
