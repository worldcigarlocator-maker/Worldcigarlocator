// ============================================================
// MAIN.JS — AUTH, LOGIN POPUP, SIDEBAR, SÖK, INIT
// ============================================================

import { supabase } from "./globals.js";
import { resetToHero, loadStores } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { initAgeGate, initFakeOnline } from "./start.js";

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

  if (!email || !password || !submit) return;

  // Autofocus
  setTimeout(() => email.focus(), 80);

  // Remember me – fyll i sparad email
  const saved = localStorage.getItem("wcl_saved_email");
  if (saved) {
    email.value = saved;
    if (remember) remember.checked = true;
  }

  // Undvik att binda flera gånger om man öppnar popupen igen
  submit.onclick = async () => {
    const e = email.value.trim();
    const p = password.value.trim();

    if (!e || !p) {
      alert("Please enter both email and password.");
      return;
    }

    // Spara / rensa email i localStorage
    if (remember?.checked) {
      localStorage.setItem("wcl_saved_email", e);
    } else {
      localStorage.removeItem("wcl_saved_email");
    }

    // Lås knapp + visa spinner
    submit.disabled = true;
    const labelSpan = submit.querySelector(".login-text");
    if (labelSpan) labelSpan.textContent = "Logging in…";
    if (spinner) spinner.classList.remove("hidden");

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p
    });

    if (error) {
      alert("Login failed: " + error.message);
      submit.disabled = false;
      if (spinner) spinner.classList.add("hidden");
      if (labelSpan) labelSpan.textContent = "Login";
      return;
    }

    // Lyckad login
    location.reload();
  };

  // Forgot password
  if (forgot) {
    forgot.onclick = async (ev) => {
      ev.preventDefault();
      const e = email.value.trim();
      if (!e) {
        alert("Enter your email first.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(e);
      if (error) {
        alert("Could not send reset email: " + error.message);
      } else {
        alert("A reset link has been sent to your email.");
      }
    };
  }
}

// Sidebar-login-knapp öppnar popup
function setupSidebarAuthButtons() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn) {
    loginBtn.onclick = () => {
      showLoginPopup();
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      location.reload();
    };
  }
}

// ============================================================
// FRONTEND GUARD — PROTECT FULL SITE
// ============================================================

async function guardFrontend() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error("getSession error:", error);
  }

  const container = document.querySelector(".container");

  if (!session) {
    // Inte inloggad → göm hela appen, visa login-popup
    if (container) container.style.display = "none";
    showLoginPopup();
    return;
  }

  // Inloggad → visa UI
  if (container) container.style.display = "grid";

  // Sidebar + hero
  buildFrontendSidebar(supabase, loadStores);
  resetToHero();
}

// ============================================================
// SEARCH LOGIC
// ============================================================

function setupSearch() {
  const input = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const clearBtn = document.getElementById("clearBtn");

  let debounceTimer = null;

  // Live search (debounced)
  input.addEventListener("input", () => {
    const term = input.value.trim();

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (term.length === 0) {
        resetToHero();
      } else {
        loadStores({}, term);
      }
    }, 280); // perfekt balans: snabbt men inte spammigt
  });

  // Search button (optional)
  searchBtn.onclick = () => {
    const term = input.value.trim();
    if (term) loadStores({}, term);
  };

  // Clear button
  clearBtn.onclick = () => {
    input.value = "";
    resetToHero();
  };

  // Enter → do search instantly
  input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceTimer);
      loadStores({}, input.value.trim());
    }
  });
}


// ============================================================
// INIT
// ============================================================

supabase.auth.onAuthStateChange(() => {
  // Om session ändras (login/logout) → kör guard igen
  guardFrontend();
});

document.addEventListener("DOMContentLoaded", () => {
  // 1. Age gate + fake online
  initAgeGate();
  initFakeOnline();

  // 2. Auth-knappar i sidebar
  setupSidebarAuthButtons();

  // 3. Skydda frontenden (visa login eller app)
  guardFrontend();

  // 4. Sök
  setupSearch();
});
