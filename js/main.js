// ============================================================
// MAIN.JS — WCL Frontend (RESTORED, NO MODULES)
// ============================================================

const qs  = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

// Supabase client (global)
const supabase = window.supabase;

/* ================= LOGIN POPUP ================= */

function showLoginPopup() {
  const popup = qs("#loginPopup");
  popup.classList.remove("hidden");

  const email = qs("#loginEmail");
  const pass  = qs("#loginPassword");
  const btn   = qs("#loginSubmit");

  btn.onclick = async () => {
    const e = email.value.trim();
    const p = pass.value.trim();
    if (!e || !p) return alert("Fill in email and password");

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p,
    });

    if (error) {
      alert("Login failed");
      return;
    }

    location.reload();
  };
}

/* ================= LOGOUT ================= */

const logoutBtn = qs("#logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };
}

/* ================= AUTH GUARD ================= */

async function guard() {
  const { data: { session } } = await supabase.auth.getSession();
  const container = qs(".container");

  if (!session) {
    container.style.display = "none";
    showLoginPopup();
    return;
  }

  container.style.removeProperty("display");

  // ⬇️ THESE FUNCTIONS ALREADY EXIST IN YOUR PROJECT
  if (typeof buildFrontendSidebar === "function") {
    await buildFrontendSidebar(supabase, loadStores);
  }

  if (typeof resetToHero === "function") {
    resetToHero();
  }
}

document.addEventListener("DOMContentLoaded", guard);
supabase.auth.onAuthStateChange(guard);
