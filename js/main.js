// ============================================================
// MAIN.JS — FRONTEND AUTH + LOGIN POPUP + INITIALIZATION
// ============================================================

import { supabase, qs } from "./globals.js";
import { loadStores, resetToHero } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import "./start.js"; // endast age gate + online - INTE sidebar!

/* ============================================================
   LOGIN POPUP
============================================================ */
function showLoginPopup() {
  const popup = qs("loginPopup");
  popup.classList.remove("hidden");

  const email = qs("loginEmail");
  const pass = qs("loginPassword");
  const remember = qs("rememberMe");
  const btn = qs("loginSubmit");
  const spinner = qs("loginSpinner");

  setTimeout(() => email?.focus(), 80);

  const saved = localStorage.getItem("wcl_saved_email");
  if (saved) {
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

    // Save email
    if (remember.checked) localStorage.setItem("wcl_saved_email", e);
    else localStorage.removeItem("wcl_saved_email");

    // UI lock
    btn.disabled = true;
    spinner.classList.remove("hidden");
    btn.querySelector(".login-text").textContent = "Logging in…";

    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });

    if (error) {
      alert("Login failed: " + error.message);
      btn.disabled = false;
      spinner.classList.add("hidden");
      btn.querySelector(".login-text").textContent = "Login";
      return;
    }

    location.reload();
  };
}

/* ============================================================
   LOGOUT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const logout = qs("logoutBtn");
  if (!logout) return;

  logout.onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };
});

/* ============================================================
   PROTECT FRONTEND
============================================================ */
async function guard() {
  const { data: { session } } = await supabase.auth.getSession();
  const container = document.querySelector(".container");

  if (!session) {
    container.style.display = "none"; // hide UI
    showLoginPopup();
    return;
  }

  // logged in → allow CSS to control layout
  container.style.removeProperty("display");

  // Load sidebar + hero
  buildFrontendSidebar(supabase, loadStores);
  resetToHero();
}

/* ============================================================
   REALTIME SEARCH
============================================================ */
function setupSearch() {
  const input = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");

  input.addEventListener("input", () => loadStores({}, input.value.trim()));
  searchBtn.onclick = () => loadStores({}, input.value.trim());

  clearBtn.onclick = () => {
    input.value = "";
    resetToHero();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadStores({}, input.value.trim());
  });
}

/* ============================================================
   INIT
============================================================ */
supabase.auth.onAuthStateChange(() => guard());

document.addEventListener("DOMContentLoaded", () => {
  guard();
  setupSearch();
});
