// ============================================================
// MAIN.JS — WCL Frontend (CLEAN · DEBUG-SAFE · AUTH-GATE FIXED)
// ============================================================

import { supabase } from "/js/globals.js";
import { buildFrontendSidebar } from "./sidebar.js";
import { trackEvent } from "./analytics-tracker.js";
import { resetToHero } from "./cards.js";

import "./analytics-frontend.js";
import "./start.js";

import {
  t,
  initI18n
} from "/js/i18n.js";

const qs = (sel) =>
  document.querySelector(sel);

// ============================================================
// LOGIN POPUP (UI)
// ============================================================

function hideLoginPopup() {

  const popup =
    qs("#loginPopup");

  if (!popup) return;

  popup.classList.add(
    "hidden"
  );

  popup.style.display =
    "none";

}

function showLoginPopup() {

  const popup =
    qs("#loginPopup");

  if (!popup) return;

  popup.style.display =
    "flex";

  popup.classList.remove(
    "hidden"
  );

  const email =
    qs("#loginEmail");

  email?.focus();

  const msg =
    qs("#authMessage");

  if (msg) {
    msg.textContent = "";
  }

  updateButtons();

}

// ============================================================
// AUTH GATE (source of truth = session)
// ============================================================

async function syncAuthGate() {

  const popup =
    document.getElementById(
      "loginPopup"
    );

  const loginBtn =
    document.getElementById(
      "loginBtn"
    );

  const authStatus =
    document.getElementById(
      "authStatus"
    );
  
console.log("AUTH UI CHECK", {
  popup,
  loginBtn,
  authStatus
});
  
  const {
    data: { session }
  } =
    await supabase.auth.getSession();

  // ============================================================
  // NOT LOGGED IN
  // ============================================================

  if (!session) {

    document.body.classList.add(
      "auth-locked"
    );

    // ❌ Ta bort auto-popup

    if (popup) {

      popup.classList.add(
        "hidden"
      );

      popup.style.display =
        "none";

    }

    if (loginBtn) {

      loginBtn.textContent =
        t("login", "Login");
      console.log(
  "LOGIN BTN AFTER SET:",
  loginBtn.textContent
);

    }

    
    if (authStatus) {
      authStatus.textContent = "";
    }

    return;

  }

// ============================================================
// LOGGED IN
// ============================================================

document.body.classList.remove(
  "auth-locked"
);

if (popup) {

  popup.classList.add(
    "hidden"
  );

  popup.style.display =
    "none";

}

if (loginBtn) {

  loginBtn.textContent =
    t("logout", "Logout");

}

if (authStatus) {

  try {

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("display_name")
        .eq(
          "id",
          session.user.id
        )
        .single();

    authStatus.textContent =
      profile?.display_name ||
      session.user.email;

    console.log(
  "AUTH STATUS AFTER SET:",
  authStatus.textContent
);

  } catch (err) {

    console.error(
      "AUTH STATUS ERROR",
      err
    );

    authStatus.textContent =
      session.user.email || "";

  }

}
  }
  
// ============================================================
// LOGIN BINDINGS
// ============================================================

function bindLoginButtons() {

  // Sidebar "Login" button

  const loginBtn =
    qs("#loginBtn");

  loginBtn?.addEventListener(
    "click",
    async () => {

      const {
        data: { session }
      } =
        await supabase.auth.getSession();

      if (session) {

        // 🔥 LOGOUT

        await supabase.auth.signOut();

        return;

      }

      // 🔥 LOGIN

      showLoginPopup();

    }
  );

  // 🔥 AUTH MESSAGE

  const msg =
    qs("#authMessage");

  function setMessage(
    text,
    type = "info"
  ) {

    if (!msg) return;

    msg.textContent = text;

    msg.className =
      "auth-message " + type;

  }

  // 🔥 BUTTONS

  const signupBtn =
    qs("#signupSubmit");

  const resetBtn =
    qs("#resetSubmit");

  const submit =
    qs("#loginSubmit");

  const emailInput =
    qs("#loginEmail");

  const passInput =
    qs("#loginPassword");

  function updateButtons() {

    const email =
      emailInput?.value?.trim();

    const pass =
      passInput?.value?.trim();

    // LOGIN

    submit.disabled =
      !(email && pass);

    // SIGNUP

    signupBtn.disabled =
      !(email && pass);

    // RESET

    resetBtn.disabled =
      !email;

  }

  emailInput?.addEventListener(
    "input",
    updateButtons
  );

  passInput?.addEventListener(
    "input",
    updateButtons
  );

 // ============================================================
// LOGIN
// ============================================================

submit?.addEventListener(
  "click",
  async () => {

    const email =
      qs("#loginEmail")
        ?.value
        ?.trim();

    const pass =
      qs("#loginPassword")
        ?.value
        ?.trim();

    const remember =
      qs("#rememberMe");

    const spinner =
      qs("#loginSpinner");

    const label =
      qs(".login-text");

    if (!email || !pass) {

      setMessage(
        t(
          "enter_email_password",
          "Enter email and password"
        ),
        "error"
      );

      return;

    }

    try {

      if (remember?.checked) {

        localStorage.setItem(
          "wcl_saved_email",
          email
        );

      } else {

        localStorage.removeItem(
          "wcl_saved_email"
        );

      }

    } catch {}

    submit.disabled = true;

    spinner?.classList.remove(
      "hidden"
    );

    if (label) {

      label.textContent =
        t(
          "logging_in",
          "Logging in…"
        );

    }

    const {
  data,
  error
} =
  await supabase.auth
    .signInWithPassword({
      email,
      password: pass,
    });

if (error) {

  setMessage(
    error.message,
    "error"
  );

  submit.disabled = false;

  spinner?.classList.add(
    "hidden"
  );

  if (label) {

    label.textContent =
      t("login", "Login");

  }

  return;

}

// 🔥 force session persist
await supabase.auth.getSession();

// 🔥 TRACK LOGIN
await trackEvent(
  "user_login",
  {
    email: email,

    country:
      window.WCL_GEO
        ?.country || null,

    city:
      window.WCL_GEO
        ?.city || null
  }
);

submit.disabled = false;

spinner?.classList.add(
  "hidden"
);

if (label) {

  label.textContent =
    t("login", "Login");

}

hideLoginPopup();

await syncAuthGate();

  }
);
  
  // ============================================================
// CREATE ACCOUNT
// ============================================================

signupBtn?.addEventListener(
  "click",
  async () => {

    const email =
      qs("#loginEmail")
        ?.value
        ?.trim();

    const pass =
      qs("#loginPassword")
        ?.value
        ?.trim();

    const spinner =
      qs("#loginSpinner");

    const label =
      qs(".login-text");

    // 🔥 VISA MODE DIREKT

    if (!email || !pass) {

      setMessage(
        t(
          "signup_enter_email_password",
          "Enter an email and create a password for your new account. You will receive a confirmation email, just follow the given link. Welcome!"
        ),
        "success"
      );

      return;

    }

    signupBtn.disabled = true;

    spinner?.classList.remove(
      "hidden"
    );

    if (label) {

      label.textContent =
        t(
          "creating_account",
          "Creating account…"
        );

    }

    const {
      data,
      error
    } =
      await supabase.auth
        .signUp({
          email,
          password: pass,
        });

    signupBtn.disabled = false;

    spinner?.classList.add(
      "hidden"
    );

    if (label) {

      label.textContent =
        t("login", "Login");

    }

    if (error) {

      setMessage(
        error.message,
        "error"
      );

      return;

    }

    // 🔥 HANDLE BOTH CASES

    if (data?.session) {

      // auto login

      hideLoginPopup();

    } else {

      // email confirm required

      setMessage(
        t(
          "confirm_new_account",
          "Enter your email and create a password to confirm your new account"
        ),
        "success"
      );

    }

  }
);

// ============================================================
// RESET PASSWORD
// ============================================================

resetBtn?.addEventListener(
  "click",
  async () => {

    const email =
      qs("#loginEmail")
        ?.value
        ?.trim();

    const spinner =
      qs("#loginSpinner");

    const label =
      qs(".login-text");

    if (!email) {

      setMessage(
        t(
          "reset_password_help",
          "To reset your password, enter your email address and follow the link in your email."
        ),
        "success"
      );

      return;

    }

    resetBtn.disabled = true;

    spinner?.classList.remove(
      "hidden"
    );

    setMessage(
      t(
        "sending_reset_email",
        "Sending reset email…"
      )
    );

    const { error } =
      await supabase.auth
        .resetPasswordForEmail(
          email
        );

    resetBtn.disabled = false;

    spinner?.classList.add(
      "hidden"
    );

    if (label) {

      label.textContent =
        t("login", "Login");

    }

    if (error) {

      setMessage(
        error.message,
        "error"
      );

      return;

    }

    setMessage(
      t(
        "password_reset_email_sent",
        "Password reset email sent"
      ),
      "success"
    );

  }
);

function handleEnter(e) {

  if (e.key === "Enter") {

    e.preventDefault();

    if (
      document.activeElement ===
        emailInput &&
      !passInput?.value
    ) {

      resetBtn?.click();

    } else {

      submit?.click();

    }

  }

}

emailInput?.addEventListener(
  "keydown",
  handleEnter
);

passInput?.addEventListener(
  "keydown",
  handleEnter
);
  
// ============================================================
// PREFILL EMAIL
// ============================================================

try {

  const saved =
    localStorage.getItem(
      "wcl_saved_email"
    );

  const emailEl =
    qs("#loginEmail");

  const rememberEl =
    qs("#rememberMe");

  if (saved && emailEl) {

    emailEl.value = saved;

    if (rememberEl) {
      rememberEl.checked = true;
    }

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

    console.log(
      "SIDEBAR BUILT"
    );

  } catch (err) {

    console.error(
      "SIDEBAR ERROR:",
      err
    );

  }

}

// ============================================================
// BOOT
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log("MAIN BOOT");

    // ============================================================
    // I18N INIT
    // ============================================================

    await initI18n();

    const ageGate =
      document.getElementById(
        "ageGate"
      );

    const enterBtn =
      document.getElementById(
        "enterBtn"
      );

    const leaveBtn =
      document.getElementById(
        "leaveBtn"
      );

    const ageVerified =
      localStorage.getItem(
        "wcl_age_verified"
      );

    // ============================================================
    // AGE GATE
    // ============================================================

    if (!ageVerified) {

      ageGate?.classList.remove(
        "hidden"
      );

      enterBtn?.addEventListener(
        "click",
        async () => {

          localStorage.setItem(
            "wcl_age_verified",
            "1"
          );

          ageGate.classList.add(
            "hidden"
          );

          // start app after age gate

          await initSidebarOnce();

          bindLoginButtons();

          await syncAuthGate();

        }
      );

      leaveBtn?.addEventListener(
        "click",
        () => {

          window.location.href =
            "https://www.google.com";

        }
      );

    } else {

      // ============================================================
      // NORMAL BOOT
      // ============================================================

      await initSidebarOnce();

      bindLoginButtons();

      await syncAuthGate();

    }

  }
);

// ------------------------------------------------------------
// ADD STORE BUTTON (auth guarded)
// ------------------------------------------------------------

const addBtn =
  qs("#addStoreBtn");

addBtn?.addEventListener(
  "click",
  async () => {

    const {
      data: { session }
    } =
      await supabase.auth
        .getSession();

    if (!session) {

      showLoginPopup();

      return;

    }

    window.location.href =
      "add-store.html";

  }
);

// ------------------------------------------------------------
// AUTH LISTENER (sync gate only; never rebuild sidebar)
// ------------------------------------------------------------

window.addEventListener(
  "load",
  () => {

    supabase.auth.onAuthStateChange(
      () => {

        syncAuthGate();

      }
    );

  }
);

// ============================================================
// MOBILE MENU TOGGLE
// ============================================================

const mobileMenuBtn =
  document.getElementById(
    "mobileMenuBtn"
  );

const sidebar =
  document.querySelector(
    ".sidebar"
  );

if (mobileMenuBtn && sidebar) {

  mobileMenuBtn.addEventListener(
    "click",
    () => {

      sidebar.classList.toggle(
        "open"
      );

      document.body.classList.toggle(
        "menu-open"
      );

    }
  );

}

// ============================================================
// MOBILE SEARCH UX
// ============================================================

const mobileSearchBtn =
  document.getElementById(
    "mobileSearchBtn"
  );

const searchPanel =
  document.getElementById(
    "searchPanel"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const clearBtn =
  document.getElementById(
    "clearBtn"
  );

// open search panel + focus input

if (
  mobileSearchBtn &&
  searchPanel &&
  searchInput
) {

  mobileSearchBtn.addEventListener(
    "click",
    () => {

      searchPanel.classList.toggle(
        "open"
      );

      if (
        searchPanel.classList.contains(
          "open"
        )
      ) {

        setTimeout(
          () => {

            searchInput.focus();

          },
          220
        );

      }

    }
  );

}

// click outside closes search panel

document.addEventListener(
  "click",
  (e) => {

    if (
      !searchPanel ||
      !mobileSearchBtn
    ) {
      return;
    }

    if (
      window.innerWidth <= 768 &&
      !searchPanel.contains(
        e.target
      ) &&
      !mobileSearchBtn.contains(
        e.target
      )
    ) {

      searchPanel.classList.remove(
        "open"
      );

    }

  }
);

// clear button closes search panel (mobile)

if (clearBtn && searchPanel) {

  clearBtn.addEventListener(
    "click",
    () => {

      if (
        window.innerWidth <= 768
      ) {

        searchPanel.classList.remove(
          "open"
        );

      }

    }
  );

}

// ============================================================
// MOBILE SIDEBAR AUTO CLOSE (menu click)
// ============================================================

document.addEventListener(
  "click",
  (e) => {

    if (
      window.innerWidth <= 768
    ) {

      const sidebarMenuLink =
        e.target.closest(
          "#sidebarMenu a"
        );

      if (
        sidebarMenuLink &&
        sidebar
      ) {

        sidebar.classList.remove(
          "open"
        );

      }

    }

  }
);

// ============================================================
// MOBILE SIDEBAR CLICK OUTSIDE CLOSE
// ============================================================

document.addEventListener(
  "click",
  (e) => {

    if (
      !sidebar ||
      !mobileMenuBtn
    ) {
      return;
    }

    if (
      window.innerWidth <= 768 &&
      !sidebar.contains(
        e.target
      ) &&
      !mobileMenuBtn.contains(
        e.target
      )
    ) {

      sidebar.classList.remove(
        "open"
      );

    }

  }
);

// ============================================================
// SAFARI SCROLL FIX (GLOBAL)
// ============================================================

window.addEventListener(
  "pageshow",
  () => {

    window.scrollTo(0, 0);

  }
);

// ============================================================
// STORE DEEP LINK
// ============================================================

import {
  openModal
} from "./modal.js";

window.addEventListener(
  "load",
  async () => {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const storeId =
      Number(
        params.get("store")
      );

    if (!storeId) return;

    // wait for app boot

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          900
        )
    );

    openModal({
      id: storeId,
      source: "account"
    });

  }
);

// ============================================================
// FAVORITES UI SYNC
// ============================================================

window.syncFavoriteUI =
  async function(storeId) {

    const id =
      Number(storeId);

    if (!id) return;

    const {
      data,
      error
    } =
      await supabase.rpc(
        "is_store_favorited_v1",
        {
          p_store_id: id
        }
      );

    if (error) {

      console.error(
        "is_store_favorited_v1 error:",
        error
      );

      return;

    }

    const active =
      !!data;

    // ============================================================
    // MODAL BUTTON
    // ============================================================

    const modalBtn =
      document.getElementById(
        "modalFavoriteBtn"
      );

    if (
      modalBtn &&
      Number(
        modalBtn.dataset.storeId
      ) === id
    ) {

      modalBtn.classList.toggle(
        "active",
        active
      );

    }

    // ============================================================
    // CARD BUTTONS
    // ============================================================

    document
      .querySelectorAll(
        `.favorite-btn[data-store-id="${id}"]`
      )
      .forEach((btn) => {

        btn.classList.toggle(
          "active",
          active
        );

      });

  };

