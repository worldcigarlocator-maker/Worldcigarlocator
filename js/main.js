document.addEventListener("DOMContentLoaded", async () => {
  await initSidebar();   // måste laddas först
  resetToHero();         // visa starting layout
  restoreMenuState();    // autocollapse fix
});


// ============================================================
// MAIN.JS — FRONTEND AUTH + LOGIN POPUP + INITIALIZATION
// ============================================================

// ---- Global Element Selectors ----
window.qs  = (sel) => document.querySelector(sel);
window.qsa = (sel) => document.querySelectorAll(sel);

import { supabase } from "./globals.js";
import { loadStores, resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import "./start.js"; // age gate + online tracker


/* ============================================================
   LOGIN POPUP
============================================================ */
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

    // Save email to localStorage
    if (remember.checked) localStorage.setItem("wcl_saved_email", e);
    else localStorage.removeItem("wcl_saved_email");

    // UI lock
    btn.disabled = true;
    spinner.classList.remove("hidden");
    qs(".login-text").textContent = "Logging in…";

    // Try to authenticate
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

    // Success → reload UI
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
   PROTECT FRONTEND
============================================================ */
async function guard() {
  const { data: { session } } = await supabase.auth.getSession();
  const container = qs(".container");

  if (!session) {
    container.style.display = "none";
    showLoginPopup();
    return;
  }

  // Logged in → show UI
  container.style.removeProperty("display");

  // Initialize sidebar + hero view
  buildFrontendSidebar(supabase, loadStores);
  resetToHero();
}


/* ============================================================
   SEARCH
============================================================ */
function setupSearch() {
  const input = qs("#searchInput");
  const searchBtn = qs("#searchBtn");
  const clearBtn = qs("#clearBtn");

  searchBtn.onclick = () => loadStores({}, input.value.trim());

  clearBtn.onclick = () => {
    input.value = "";
    resetToHero();
  };

  input.addEventListener("input", () => {
    if (input.value.trim().length > 0) {
      loadStores({}, input.value.trim());
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      loadStores({}, input.value.trim());
    }
  });
}


/* ============================================================
   INIT
============================================================ */

// re-run guard on auth state change
supabase.auth.onAuthStateChange(() => guard());

// DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  setupSearch();
  guard();
});
