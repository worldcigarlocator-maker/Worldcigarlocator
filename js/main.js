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

  // 🔥 AUTH MESSAGE
  const msg = qs("#authMessage");

  function setMessage(text, type = "info") {
    if (!msg) return;

    msg.textContent = text;
    msg.className = "auth-message " + type;
  }

  // 🔥 BUTTONS
  const signupBtn = qs("#signupSubmit");
  const resetBtn  = qs("#resetSubmit");
  const submit    = qs("#loginSubmit");

// ============================================================
// LOGIN
// ============================================================
submit?.addEventListener("click", async () => {

  const email = qs("#loginEmail")?.value?.trim();
  const pass  = qs("#loginPassword")?.value?.trim();
  const remember = qs("#rememberMe");

  const spinner = qs("#loginSpinner");
  const label   = qs(".login-text");

  if (!email || !pass) {
    alert("Enter email and password");
    return;
  }

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
    alert(error.message);
    submit.disabled = false;
    spinner?.classList.add("hidden");
    if (label) label.textContent = "Login";
    return;
  }

  submit.disabled = false;
  spinner?.classList.add("hidden");
  if (label) label.textContent = "Login";

  hideLoginPopup();
});


// ============================================================
// CREATE ACCOUNT
// ============================================================
signupBtn?.addEventListener("click", async () => {

  const email = qs("#loginEmail")?.value?.trim();
  const pass  = qs("#loginPassword")?.value?.trim();

  const spinner = qs("#loginSpinner");
  const label   = qs(".login-text");

  if (!email || !pass) {
    alert("Enter email and password");
    return;
  }

  signupBtn.disabled = true;
  spinner?.classList.remove("hidden");
  if (label) label.textContent = "Creating account…";

  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  });

  signupBtn.disabled = false;
  spinner?.classList.add("hidden");
  if (label) label.textContent = "Login";

  if (error) {
 setMessage(error.message, "error");
    return;
  }

  // 🔥 HANDLE BOTH CASES
  if (data?.session) {
    // auto login
    hideLoginPopup();
  } else {
    // email confirm required
    setMessage("Check your email to confirm your account", "success");
  }

});


// ============================================================
// RESET PASSWORD
// ============================================================
resetBtn?.addEventListener("click", async () => {

  const email = qs("#loginEmail")?.value?.trim();

  const spinner = qs("#loginSpinner");
  const label   = qs(".login-text");

  if (!email) {
    alert("Enter email");
    return;
  }

  resetBtn.disabled = true;
  spinner?.classList.remove("hidden");
  if (label) label.textContent = "Sending…";

  const { error } = await supabase.auth.resetPasswordForEmail(email);

  resetBtn.disabled = false;
  spinner?.classList.add("hidden");
  if (label) label.textContent = "Login";

  if (error) {
    alert(error.message);
    return;
  }

  alert("Password reset email sent");
});


// ============================================================
// PREFILL EMAIL
// ============================================================
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

  const ageGate = document.getElementById("ageGate");
  const enterBtn = document.getElementById("enterBtn");
  const leaveBtn = document.getElementById("leaveBtn");

  const ageVerified = localStorage.getItem("wcl_age_verified");

  // ============================================================
  // AGE GATE
  // ============================================================

  if (!ageVerified) {

    ageGate?.classList.remove("hidden");

    enterBtn?.addEventListener("click", async () => {

      localStorage.setItem("wcl_age_verified", "1");

      ageGate.classList.add("hidden");

      // start app after age gate
      await initSidebarOnce();
      bindLoginButtons();
      await syncAuthGate();

    });

    leaveBtn?.addEventListener("click", () => {
      window.location.href = "https://www.google.com";
    });

  } else {

    // ============================================================
    // NORMAL BOOT
    // ============================================================

    await initSidebarOnce();
    bindLoginButtons();
    await syncAuthGate();

  }

});

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
    document.body.classList.toggle("menu-open");

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

// ============================================================
// SAFARI SCROLL FIX (GLOBAL)
// ============================================================

window.addEventListener("pageshow", () => {
  window.scrollTo(0, 0);
});

