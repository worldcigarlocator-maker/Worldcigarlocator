// ============================================================
// MAIN.JS — WCL Frontend (Auth-first, Hero-first, Stable UI)
// ============================================================

// ------------------------------------------------------------
// Global selectors
// ------------------------------------------------------------
window.qs  = (sel) => document.querySelector(sel);
window.qsa = (sel) => document.querySelectorAll(sel);

// ------------------------------------------------------------
// Imports
// ------------------------------------------------------------
import { supabase } from "./globals.js";
import { loadStores, resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import "./start.js"; // age gate + online tracker


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

  setTimeout(() => email?.focus(), 80);

  const saved = localStorage.getItem("wcl_saved_email");
  if (saved) {
    email.value = saved;
    remember.checked = true;
  }

  btn.onclick = async () => {
    const e = email.value.trim();
    const p = pass.value.trim();
    if (!e || !p) return alert("Please fill in all fields.");

    if (remember.checked) localStorage.setItem("wcl_saved_email", e);
    else localStorage.removeItem("wcl_saved_email");

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
// SIDEBAR STATE (restore open continent)
// ============================================================
function restoreMenuState() {
  const open = localStorage.getItem("wclMenuOpen");
  if (!open) return;

  const el = document.querySelector(`[data-continent="${open}"]`);
  if (el) el.classList.add("open");
}


// ============================================================
// SIDEBAR INIT (build once, after auth)
// ============================================================
let SIDEBAR_BUILT = false;

async function initSidebar() {
  if (SIDEBAR_BUILT) return;
  SIDEBAR_BUILT = true;

  // ⚠️ Sidebar bygger hierarkin men renderar INGA cards själv
  await buildFrontendSidebar(supabase, loadStores);

  // Persist open continent
  document.querySelectorAll("[data-continent]").forEach((el) => {
    el.addEventListener("click", () => {
      localStorage.setItem("wclMenuOpen", el.dataset.continent);
    });
  });

  restoreMenuState();
}


// ============================================================
// SEARCH — EXPLICIT ONLY (NO AUTO LOAD)
// ============================================================
function setupSearch() {
  const input = qs("#searchInput");
  const searchBtn = qs("#searchBtn");
  const clearBtn = qs("#clearBtn");

  if (!input || !searchBtn || !clearBtn) return;

  const runSearch = () => {
    const q = input.value.trim();
    if (!q) return;
    loadStores({}, q);
  };

  searchBtn.onclick = runSearch;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });

  clearBtn.onclick = () => {
    input.value = "";
    resetToHero();
  };
}


// ============================================================
// AUTH GUARD — SINGLE SOURCE OF TRUTH
// ============================================================
async function guard() {
  const { data: { session } } = await supabase.auth.getSession();
  const container = qs(".container");

  if (!session) {
    container.style.display = "none";
    showLoginPopup();
    return;
  }

  // Logged in
  container.style.removeProperty("display");

  // ✅ CRITICAL ORDER (DO NOT CHANGE)
  await initSidebar();
  resetToHero(); // ⬅️ NO cards rendered here
}


// ============================================================
// BOOT SEQUENCE
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  setupSearch();
  guard();
});

supabase.auth.onAuthStateChange(() => {
  guard();
});
