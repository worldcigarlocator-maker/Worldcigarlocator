// ============================================================
// MAIN.JS — FRONTEND AUTH + LOGIN POPUP + INITIALIZATION
// ============================================================

import { supabase } from "./globals.js";
import { resetToHero, loadStores } from "./cards.js";
import { buildFrontendSidebar } from "./sidebar.js";
import "./start.js"; // Age gate

// ============================================================
// LOGIN POPUP
// ============================================================

function showLoginPopup() {
  const box = document.getElementById("loginPopup");
  if (!box) return;

  box.classList.remove("hidden");

  // Autofokus på email
  const emailField = document.getElementById("loginEmail");
  if (emailField) setTimeout(() => emailField.focus(), 50);

  // SUBMIT
  document.getElementById("loginSubmit").onclick = async () => {
    const email = emailField.value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("Please fill in both fields.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("Login failed: " + error.message);
    } else {
      location.reload();
    }
  };
}

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
// FRONTEND GUARD — BLOCK PUBLIC ACCESS
// ============================================================

async function guardFrontend() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Hide the main UI
    const container = document.querySelector(".container");
    if (container) container.style.display = "none";

    showLoginPopup();
    return;
  }

  // Logged in → show UI
  const container = document.querySelector(".container");
  if (container) container.style.display = "flex";

  // Build sidebar
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
