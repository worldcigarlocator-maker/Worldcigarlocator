// ============================================================
// MAIN.JS — FRONTEND AUTH + LOGIN POPUP + INITIALIZATION
// ============================================================

import { supabase } from "./globals.js";
import { resetToHero, loadStores } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import "./start.js"; // Age gate

// ============================================================
// LOGIN POPUP LOGIC
// ============================================================

function showLoginPopup() {
  const popup = document.getElementById("loginPopup");
  if (!popup) return;

  popup.classList.remove("hidden");

  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPassword");
  const remember = document.getElementById("rememberMe");
  const submit = document.getElementById("loginSubmit");
  const spinner = document.getElementById("loginSpinner");
  const forgot = document.getElementById("forgotPassword");

  // Autofocus
  if (email) setTimeout(() => email.focus(), 80);

  // Load saved email
  const saved = localStorage.getItem("wcl_saved_email");
  if (saved) {
    email.value = saved;
    remember.checked = true;
  }

  // -------------------------
  // LOGIN ACTION
  // -------------------------
  submit.onclick = async () => {
    const e = email.value.trim();
    const p = password.value.trim();

    if (!e || !p) {
      alert("Please enter both email and password.");
      return;
    }

    // Remember me
    if (remember.checked) localStorage.setItem("wcl_saved_email", e);
    else localStorage.removeItem("wcl_saved_email");

    // Lock UI
    submit.disabled = true;
    submit.querySelector(".login-text").textContent = "Logging in…";
    spinner.classList.remove("hidden");

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p
    });

    if (error) {
      alert("Login failed: " + error.message);
      submit.disabled = false;
      spinner.classList.add("hidden");
      submit.querySelector(".login-text").textContent = "Login";
      return;
    }

    location.reload();
  };

  // -------------------------
  // FORGOT PASSWORD
  // -------------------------
  if (forgot) {
    forgot.onclick = async () => {
      const e = email.value.trim();
      if (!e) {
        alert("Enter your email first.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(e);
      if (error) alert("Could not send reset email: " + error.message);
      else alert("A reset link has been sent to your email.");
    };
  }
}

// ------------------------------------------------------------
// OPEN POPUP WHEN CLICKING LOGIN IN SIDEBAR
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (btn) btn.onclick = () => showLoginPopup();
});

// ============================================================
// LOGOUT BUTTON
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };
});

// ============================================================
// FRONTEND GUARD — PROTECT FULL SITE
// ============================================================

async function guardFrontend() {
  const { data: { session } } = await supabase.auth.getSession();

  const container = document.querySelector(".container");

  if (!session) {
    if (container) container.style.display = "none";
    showLoginPopup();
    return;
  }

  // AUTH OK → SHOW UI
  if (container) container.style.display = "grid";

  buildFrontendSidebar(supabase, loadStores);
  resetToHero();
}

// ============================================================
// SEARCH LOGIC
// ============================================================

function setupSearch() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const clear = document.getElementById("clearBtn");

  btn.onclick = () => loadStores({}, input.value.trim());

  clear.onclick = () => {
    input.value = "";
    resetToHero();
  };

  input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") loadStores({}, input.value.trim());
  });
}

// ============================================================
// INIT
// ============================================================

supabase.auth.onAuthStateChange(() => guardFrontend());

document.addEventListener("DOMContentLoaded", () => {
  guardFrontend();
  setupSearch();
});
