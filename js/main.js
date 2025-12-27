// ============================================================
// MAIN.JS — WCL Frontend (NO MODULES / GLOBAL SUPABASE)
// Auth-first, Stable Sidebar & Search
// ============================================================

"use strict";

/* ============================================================
   GLOBAL HELPERS
   ============================================================ */
window.qs  = (sel) => document.querySelector(sel);
window.qsa = (sel) => Array.from(document.querySelectorAll(sel));

/* ============================================================
   GLOBAL DEPENDENCIES (must already be loaded by <script>)
   - globals.js   → window.supabase (client)
   - cards.js     → window.loadStores, window.resetToHero
   - sidebar.js   → window.buildFrontendSidebar
   - start.js     → age gate, online tracker
   ============================================================ */

const supabase = window.supabase;
if (!supabase) {
  console.error("❌ supabase not found on window. globals.js not loaded?");
}

/* ============================================================
   LOGIN POPUP
   ============================================================ */
function showLoginPopup() {
  const popup = qs("#loginPopup");
  if (!popup) return;

  popup.classList.remove("hidden");

  const email    = qs("#loginEmail");
  const pass     = qs("#loginPassword");
  const remember = qs("#rememberMe");
  const btn      = qs("#loginSubmit");
  const spinner  = qs("#loginSpinner");

  setTimeout(() => email?.focus(), 80);

  const saved = localStorage.getItem("wcl_saved_email");
  if (saved && email && remember) {
    email.value = saved;
    remember.checked = true;
  }

  btn.onclick = async () => {
    const e = email?.value.trim();
    const p = pass?.value.trim();
    if (!e || !p) {
      alert("Please fill in all fields.");
      return;
    }

    if (remember?.checked) localStorage.setItem("wcl_saved_email", e);
    else localStorage.removeItem("wcl_saved_email");

    btn.disabled = true;
    spinner?.classList.remove("hidden");
    qs(".login-text") && (qs(".login-text").textContent = "Logging in…");

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p,
    });

    if (error) {
      alert("Login failed: " + error.message);
      btn.disabled = false;
      spinner?.classList.add("hidden");
      qs(".login-text") && (qs(".login-text").textContent = "Login");
      return;
    }

    location.reload();
  };
}

/* ============================================================
   LOGOUT
   ============================================================ */
function setupLogout() {
  const logout = qs("#logoutBtn");
  if (!logout) return;

  logout.onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };
}

/* ============================================================
   SIDEBAR STATE (restore open continent)
   ============================================================ */
function restoreMenuState() {
  const open = localStorage.getItem("wclMenuOpen");
  if (!open) return;

  const el = document.querySelector(`[data-continent="${open}"]`);
  if (el) el.classList.add("open");
}

/* ============================================================
   SIDEBAR INIT (build once, after auth)
   ============================================================ */
let SIDEBAR_BUILT = false;

async function initSidebar() {
  if (SIDEBAR_BUILT) return;
  SIDEBAR_BUILT = true;

  if (typeof window.buildFrontendSidebar !== "function") {
    console.error("❌ buildFrontendSidebar not found (sidebar.js missing?)");
    return;
  }

  if (typeof window.loadStores !== "function") {
    console.error("❌ loadStores not found (cards.js missing?)");
    return;
  }

  await window.buildFrontendSidebar(supabase, window.loadStores);

  // Persist open continent
  document.querySelectorAll("[data-continent]").forEach((el) => {
    el.addEventListener("click", () => {
      localStorage.setItem("wclMenuOpen", el.dataset.continent);
    });
  });

  restoreMenuState();
}

/* ============================================================
   SEARCH — STABLE MODE (NO LIVE SPAM)
   ============================================================ */
function setupSearch() {
  const input    = qs("#searchInput");
  const searchBtn = qs("#searchBtn");
  const clearBtn  = qs("#clearBtn");

  if (!input || !searchBtn || !clearBtn) return;

  const runSearch = () => {
    const q = input.value.trim();
    if (typeof window.loadStores === "function") {
      window.loadStores({}, q);
    }
  };

  searchBtn.onclick = runSearch;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });

  clearBtn.onclick = () => {
    input.value = "";
    if (typeof window.resetToHero === "function") {
      window.resetToHero();
    }
  };
}

/* ============================================================
   AUTH GUARD — SINGLE SOURCE OF TRUTH
   ============================================================ */
async function guard() {
  const { data: { session } } = await supabase.auth.getSession();
  const container = qs(".container");

  if (!session) {
    container && (container.style.display = "none");
    showLoginPopup();
    return;
  }

  container && container.style.removeProperty("display");

  // Correct boot order
  await initSidebar();
  if (typeof window.resetToHero === "function") {
    window.resetToHero();
  }
}

/* ============================================================
   BOOT SEQUENCE
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  setupSearch();
  guard();
});

supabase.auth.onAuthStateChange(() => {
  guard();
});
