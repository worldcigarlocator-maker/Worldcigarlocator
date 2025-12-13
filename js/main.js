// ============================================================
// MAIN.JS — FRONTEND BOOT, AUTH, SIDEBAR, SEARCH, HERO CONTROL
// ============================================================

// ----- Global selectors -----
window.qs  = (sel) => document.querySelector(sel);
window.qsa = (sel) => document.querySelectorAll(sel);

// ----- Imports -----
import { supabase } from "./globals.js";
import { loadStores, resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import "./start.js"; // age gate + online tracker


// ============================================================
// INITIAL PAGE BOOT — MUST RUN FIRST (Safari-safe)
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  await initSidebar();      // 1. bygg sidomenyn
  resetToHero();            // 2. visa hero mode
  restoreMenuState();       // 3. öppna rätt kontinent i hierarkin
});


// ============================================================
// LOGIN POPUP
// ============================================================
function showLoginPopup() {
  const popup = qs("#loginPopup");
  popup.classList.remove("hidden");

  const email    = qs("#loginEmail");
  const pass     = qs("#loginPassword");
  const remember = qs("#rememberMe");
  const btn      = qs("#loginSubmit");
  const spinner  = qs("#loginSpinner");

  // Autofocus
  setTimeout(() => email?.focus(), 80);

  // Load saved email
  const saved = localStorage.getItem("wcl_saved_email");
  if (saved) {
    email.value = saved;
    remember.checked = true;
  }

  // Login handler
  btn.onclick = async () => {
    const e = email.value.trim();
    const p = pass.value.trim();

    if (!e || !p) {
      alert("Please fill in all fields.");
      return;
    }

    if (remember.checked) localStorage.setItem("wcl_saved_email", e);
    else localStorage.removeItem("wcl_saved_email");

    // UI lock
    btn.disabled = true;
    spinner.classList.remove("hidden");
    qs(".login-text").textContent = "Logging in…";

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p,
    });

    if (error) {
      alert("Login failed: " + error.message);
      btn.disabled = false;
      spinner.classList.add("hidden");
      qs(".login-text").textContent = "Login";
      return;
    }

    location.reload(); // success
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
// PROTECT FRONTEND (Require Login)
// ============================================================
async function guard() {
  const { data: { session } } = await supabase.auth.getSession();
  const container = qs(".container");

  if (!session) {
    // hide UI → show login popup
    container.style.display = "none";
    showLoginPopup();
    return;
  }

  // logged in
  container.style.removeProperty("display");
  // sidebar already built in initSidebar()
  resetToHero(); // ensure hero is visible when login finishes
}


// ============================================================
// SIDEBAR STATE (autocollapse restore)
// ============================================================
function restoreMenuState() {
  const open = localStorage.getItem("wclMenuOpen");
  if (!open) return;

  const item = document.querySelector(`[data-continent="${open}"]`);
  if (item) item.classList.add("open");
}


// ============================================================
// SIDEBAR INIT (build + event binding)
// ============================================================
async function initSidebar() {
  await buildFrontendSidebar(supabase, loadStores);

  // Save collapse state
  document.querySelectorAll("[data-continent]").forEach((el) => {
    el.addEventListener("click", () => {
      localStorage.setItem("wclMenuOpen", el.dataset.continent);
    });
  });
}


// ============================================================
// FULL INITIALIZATION MAIN LOGIC
// ============================================================

// Update UI when auth state changes
supabase.auth.onAuthStateChange(() => guard());

// DOM loaded → run UI setup
document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  setupSearch();
  guard(); // requires login to show page
});
