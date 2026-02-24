
// ============================================================
// MAIN.JS — WCL Frontend (PUBLIC-FIRST)
// - Sidebar always builds
// - Page always renders
// - Auth only gates auth-required actions
// ============================================================

// ============================================================
// LOCAL HELPERS (ESM-safe)
// ============================================================
const qs  = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

function hideLoginPopup() {
  const popup = qs("#loginPopup");
  if (!popup) return;

  popup.classList.add("hidden");

  // säkerhetsbälte: plocka bort helt efter animation
  setTimeout(() => {
    popup.style.display = "none";
  }, 260);
}

// ============================================================
// IMPORTS (SAFE ORDER)
// ============================================================

// 🔒 Supabase MUST load first
import { supabase } from "./globals.js";

// ❌ Analytics DISABLED (explicitly)
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
    const e = email?.value?.trim();
    const p = pass?.value?.trim();

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
// SIDEBAR — PUBLIC, BUILD ONCE
// ============================================================
let SIDEBAR_READY = false;

async function initSidebar() {
  if (SIDEBAR_READY) return;
  SIDEBAR_READY = true;

  try {
    console.log("🧭 Building sidebar (public)");
    await buildFrontendSidebar();
  } catch (err) {
    console.error("❌ Sidebar failed to build", err);
  }
}

// ============================================================
// AUTH GUARD — BLOCKS UI UNTIL AUTH
// ============================================================
async function guard() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  await initSidebar();

  if (!session) {
    // 🔒 PUBLIC / LOCKED
    document.body.classList.add("auth-locked");
    showLoginPopup();
    resetToHero();
    return;
  }

  // 🔓 LOGGED IN
  document.body.classList.remove("auth-locked");
  hideLoginPopup();   // 🔑 DENNA RAD VAR DET SOM SAKNADES
  resetToHero();
}



// ============================================================
// BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  guard();

  const addBtn = qs("#addStoreBtn");

  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        showLoginPopup();
        return;
      }

      // 🔓 User logged in → go to add store page
      window.location.href = "add-store.html";
    });
  }
});
supabase.auth.onAuthStateChange(() => {
  guard();
});
