/* ============================================================
   main.js — WCL Frontend Main (NO MODULES)
   Depends on: globals.js (WCL), cards.js, sidebar.js, start.js
   ============================================================ */
(function () {
  "use strict";

  const WCL = window.WCL;
  if (!WCL || !WCL.supabase) {
    console.error("main.js: WCL or supabase missing");
    return;
  }

  const supabase = WCL.supabase;

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

      const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });

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

  function setupLoginButton() {
    const loginBtn = qs("#loginBtn");
    loginBtn?.addEventListener("click", () => showLoginPopup());
  }

  // ============================================================
  // SIDEBAR INIT
  // ============================================================
  let SIDEBAR_BUILT = false;

  function restoreMenuState() {
    const open = localStorage.getItem("wclMenuOpen");
    if (!open) return;

    const el = document.querySelector(`[data-continent="${open}"]`);
    if (el) el.classList.add("open");
  }

  async function initSidebar() {
    if (SIDEBAR_BUILT) return;
    SIDEBAR_BUILT = true;

    if (typeof window.buildFrontendSidebar !== "function") {
      console.error("buildFrontendSidebar missing — sidebar.js did not load");
      return;
    }
    if (typeof window.loadStores !== "function") {
      console.error("loadStores missing — cards.js did not load");
      return;
    }

    await window.buildFrontendSidebar(supabase, window.loadStores);

    // Persist open continent (optional, safe)
    document.querySelectorAll(".line.continent").forEach((el) => {
      el.addEventListener("click", () => {
        // label text as key (simple)
        const label = el.querySelector(".label")?.textContent || "";
        localStorage.setItem("wclMenuOpen", label);
      });
    });

    restoreMenuState();
  }

  // ============================================================
  // SEARCH
  // ============================================================
  function setupSearch() {
    const input = qs("#searchInput");
    const searchBtn = qs("#searchBtn");
    const clearBtn = qs("#clearBtn");

    if (!input || !searchBtn || !clearBtn) return;

    const runSearch = () => {
      const q = input.value.trim();
      window.loadStores({}, q);
    };

    searchBtn.onclick = runSearch;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runSearch();
    });

    clearBtn.onclick = () => {
      input.value = "";
      window.resetToHero();
    };
  }

  // ============================================================
  // AUTH GUARD
  // ============================================================
  async function guard() {
    const { data: { session } } = await supabase.auth.getSession();
    const container = qs(".container");

    const loginBtn = qs("#loginBtn");
    const logoutBtn = qs("#logoutBtn");

    if (!session) {
      // Hide app, show login popup
      container.style.display = "none";
      logoutBtn && (logoutBtn.style.display = "none");
      loginBtn && (loginBtn.style.display = "inline-flex");

      showLoginPopup();
      return;
    }

    // show app
    container.style.removeProperty("display");
    logoutBtn && (logoutBtn.style.display = "inline-flex");
    loginBtn && (loginBtn.style.display = "none");

    // build sidebar then hero
    await initSidebar();
    window.resetToHero();
  }

  // ============================================================
  // BOOT
  // ============================================================
  document.addEventListener("DOMContentLoaded", () => {
    setupLogout();
    setupLoginButton();
    setupSearch();
    guard();
  });

  supabase.auth.onAuthStateChange(() => {
    guard();
  });

  console.log("✅ main.js loaded");
})();
