// ============================================================
// MAIN.JS — WCL Frontend (CLEAN · DEBUG-SAFE · AUTH-GATE FIXED)
// ============================================================

import { supabase } from "./globals.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { resetToHero } from "./cards.js";
import "./analytics-frontend.js";
import "./start.js";

const qs = (sel) => document.querySelector(sel);

// ============================================================
// LOGIN POPUP (UI)
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
// AUTH GATE (source of truth = session)
// ============================================================
async function syncAuthGate() {

  const popup = document.getElementById("loginPopup");

  const { data: { session } } = await supabase.auth.getSession();

  // NOT LOGGED IN
  if (!session) {

    document.body.classList.add("auth-locked");

    if (popup) {
      popup.classList.remove("hidden");
      popup.style.display = "flex";
    }

    return;
  }

  // LOGGED IN
  document.body.classList.remove("auth-locked");

  if (popup) {
    popup.classList.add("hidden");
    popup.style.display = "none";
  }

}

// ============================================================
// LOGIN BINDINGS
// ============================================================
function bindLoginButtons() {
  // Sidebar "Login" button
  const loginBtn = qs("#loginBtn");
  loginBtn?.addEventListener("click", () => showLoginPopup());

  // Popup submit
  const submit = qs("#loginSubmit");
  submit?.addEventListener("click", async () => {
    const email = qs("#loginEmail")?.value?.trim();
    const pass  = qs("#loginPassword")?.value?.trim();
    const remember = qs("#rememberMe");

    const spinner = qs("#loginSpinner");
    const label   = qs(".login-text");

    if (!email || !pass) {
      alert("Please fill in email and password.");
      return;
    }

    // Remember email (optional)
    try {
      if (remember?.checked) localStorage.setItem("wcl_saved_email", email);
      else localStorage.removeItem("wcl_saved_email");
    } catch {}

    submit.disabled = true;
    spinner?.classList.remove("hidden");
    if (label) label.textContent = "Logging in…";

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      alert("Login failed: " + error.message);
      submit.disabled = false;
      spinner?.classList.add("hidden");
      if (label) label.textContent = "Login";
      return;
    }

    // Auth listener will hide, but hide immediately feels snappy
    hideLoginPopup();
  });

  // Pre-fill email if remembered
  try {
    const saved = localStorage.getItem("wcl_saved_email");
    const emailEl = qs("#loginEmail");
    const rememberEl = qs("#rememberMe");
    if (saved && emailEl) {
      emailEl.value = saved;
      if (rememberEl) rememberEl.checked = true;
    }
  } catch {}
}

// ============================================================
// SIDEBAR INIT (run once)
// ============================================================
let SIDEBAR_BUILT = false;

async function initSidebarOnce() {
  if (SIDEBAR_BUILT) return;
  SIDEBAR_BUILT = true;

  try {
    await buildFrontendSidebar();
    console.log("SIDEBAR BUILT");
  } catch (err) {
    console.error("SIDEBAR ERROR:", err);
  }
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("MAIN BOOT");

  // Build sidebar
  await initSidebarOnce();

  // Bind login UI
  bindLoginButtons();

  // Always reset hero (safe)
  resetToHero();

  // Sync gate with session (show if not logged in)
  await syncAuthGate();

  // ----------------------------------------------------------
  // ADD STORE BUTTON (auth guarded)
  // ----------------------------------------------------------
  const addBtn = qs("#addStoreBtn");

  addBtn?.addEventListener("click", async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      showLoginPopup();
      return;
    }

    window.location.href = "add-store.html";
  });
});

// ------------------------------------------------------------
// AUTH LISTENER (sync gate only; never rebuild sidebar)
// ------------------------------------------------------------
supabase.auth.onAuthStateChange(() => {
  syncAuthGate();
});

// ============================================================
// MOBILE MENU TOGGLE
// ============================================================

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.querySelector(".sidebar");

if (mobileMenuBtn && sidebar) {
  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}


// ============================================================
// MOBILE SEARCH UX
// ============================================================

const mobileSearchBtn = document.getElementById("mobileSearchBtn");
const searchPanel = document.getElementById("searchPanel");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");


// open search panel + focus input
if (mobileSearchBtn && searchPanel && searchInput) {

  mobileSearchBtn.addEventListener("click", () => {

    searchPanel.classList.toggle("open");

    if (searchPanel.classList.contains("open")) {
      setTimeout(() => {
        searchInput.focus();
      }, 220);
    }

  });

}


// click outside closes search panel
document.addEventListener("click", (e) => {

  if (!searchPanel || !mobileSearchBtn) return;

  if (
    window.innerWidth <= 768 &&
    !searchPanel.contains(e.target) &&
    !mobileSearchBtn.contains(e.target)
  ) {
    searchPanel.classList.remove("open");
  }

});


// clear button closes search panel (mobile)
if (clearBtn && searchPanel) {

  clearBtn.addEventListener("click", () => {

    if (window.innerWidth <= 768) {
      searchPanel.classList.remove("open");
    }

  });

}


// ============================================================
// MOBILE SIDEBAR AUTO CLOSE (menu click)
// ============================================================

document.addEventListener("click", (e) => {

  if (window.innerWidth <= 768) {

    const sidebarMenuLink = e.target.closest("#sidebarMenu a");

    if (sidebarMenuLink && sidebar) {
      sidebar.classList.remove("open");
    }

  }

});


// ============================================================
// MOBILE SIDEBAR CLICK OUTSIDE CLOSE
// ============================================================

document.addEventListener("click", (e) => {

  if (!sidebar || !mobileMenuBtn) return;

  if (
    window.innerWidth <= 768 &&
    !sidebar.contains(e.target) &&
    !mobileMenuBtn.contains(e.target)
  ) {
    sidebar.classList.remove("open");
  }

});
