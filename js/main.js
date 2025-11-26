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
  const box = document.getElementById("loginPopup");
  if (!box) return;

  box.classList.remove("hidden");

  const emailField = document.getElementById("loginEmail");
  const passwordField = document.getElementById("loginPassword");
  const rememberBox = document.getElementById("rememberMe");
  const submitBtn = document.getElementById("loginSubmit");
  const spinner = document.getElementById("loginSpinner");
  const forgotLink = document.getElementById("forgotPassword");

  // Autofokus
  if (emailField) setTimeout(() => emailField.focus(), 80);

  // Remember-me autofyll
  const savedEmail = localStorage.getItem("wcl_saved_email");
  if (savedEmail) {
    emailField.value = savedEmail;
    rememberBox.checked = true;
  }

  // SUBMIT
  submitBtn.onclick = async () => {
    const email = emailField.value.trim();
    const password = passwordField.value.trim();

    if (!email || !password) {
      alert("Please fill in both fields.");
      return;
    }

    // Save email
    if (rememberBox.checked) {
      localStorage.setItem("wcl_saved_email", email);
    } else {
      localStorage.removeItem("wcl_saved_email");
    }

    // Spinner ON
    submitBtn.disabled = true;
    spinner.classList.remove("hidden");
    submitBtn.querySelector(".login-text").textContent = "Logging in…";

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("Login failed: " + error.message);
      submitBtn.disabled = false;
      spinner.classList.add("hidden");
      submitBtn.querySelector(".login-text").textContent = "Login";
      return;
    }

    location.reload();
  };

  // RESET PASSWORD
  if (forgotLink) {
    forgotLink.onclick = async () => {
      const email = emailField.value.trim();
      if (!email) {
        alert("Enter your email first.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        alert("Could not send reset email: " + error.message);
        return;
      }

      alert("A reset link has been sent to your email.");
    };
  }
}

// Sidebar login button
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.onclick = showLoginPopup;
});

// ============================================================
// LOGOUT BUTTON
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      location.reload();
    };
  }
});

// ============================================================
// FRONTEND GUARD — PROTECTS PUBLIC SITE
// ============================================================

async function guardFrontend() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Hide UI
    const container = document.querySelector(".container");
    if (container) container.style.display = "none";

    showLoginPopup();
    return;
  }

  // Show UI
  const container = document.querySelector(".container");
  if (container) container.style.display = "grid";

  buildFrontendSidebar(supabase, loadStores);
  resetToHero();
}

// ============================================================
// SEARCH
// ============================================================

function setupSearch() {
  const searchBtn = document.getElementById("searchBtn");
  const clearBtn = document.getElementById("clearBtn");
  const searchInput = document.getElementById("searchInput");

  if (searchBtn)
    searchBtn.onclick = () => loadStores({}, searchInput.value.trim());

  if (clearBtn)
    clearBtn.onclick = () => {
      searchInput.value = "";
      resetToHero();
    };

  searchInput?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      loadStores({}, searchInput.value.trim());
    }
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
