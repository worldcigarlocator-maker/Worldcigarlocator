// ============================================================
// MAIN.JS — WCL Frontend (CLEAN · DEBUG-SAFE · AUTH-GATE FIXED)
// ============================================================

import {
  debugLog,
  supabase,
  TURNSTILE_SITE_KEY
} from "/js/globals.js";
import { buildFrontendSidebar } from "./sidebar.js";
import {
  trackEvent,
  trackAuthenticatedMemberActive,
  trackLoginEvent
} from "./analytics-tracker.js";
import { resetToHero } from "./cards.js";

import {
  t,
  initI18n
} from "/js/i18n.js";

const qs = (sel) =>
  document.querySelector(sel);

let LOGIN_BINDINGS_BOUND = false;
let BETA_LANDING_BINDINGS_BOUND = false;
let refreshAuthButtons = () => {};
let OPEN_LOGIN_AFTER_BOOT = false;
let DIRECT_MAIN_AFTER_BOOT = false;
let SITE_OPEN_TRACKED = false;
let ENTRANCE_GATE_BINDINGS_BOUND = false;
let mainSigninCaptchaToken = "";
let mainSigninCaptchaWidgetId = null;
let mainSigninTurnstileScriptPromise = null;

function hasLegalAgeConfirmation() {
  try {
    return localStorage.getItem(
      "wcl_age_verified"
    ) === "1";
  } catch {
    return false;
  }
}

try {
  const url =
    new URL(window.location.href);

  OPEN_LOGIN_AFTER_BOOT =
    url.searchParams.get("signin") === "1" ||
    url.searchParams.get("login") === "1";

  DIRECT_MAIN_AFTER_BOOT =
    url.searchParams.get("app") === "1" ||
    url.searchParams.get("main") === "1";

  if (
    OPEN_LOGIN_AFTER_BOOT ||
    DIRECT_MAIN_AFTER_BOOT
  ) {
    url.searchParams.delete("signin");
    url.searchParams.delete("login");
    url.searchParams.delete("app");
    url.searchParams.delete("main");

    window.history.replaceState(
      {},
      "",
      url.pathname +
        url.search +
        url.hash
    );
  }
} catch {}

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

function loadMainSigninTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (mainSigninTurnstileScriptPromise) {
    return mainSigninTurnstileScriptPromise;
  }

  mainSigninTurnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }

      reject(new Error("Turnstile did not load"));
    };

    script.onerror = () => {
      reject(new Error("Turnstile script failed"));
    };

    document.head.appendChild(script);
  });

  return mainSigninTurnstileScriptPromise;
}

async function renderMainSigninCaptcha() {
  if (!TURNSTILE_SITE_KEY) return;

  const wrap = qs("#mainSigninTurnstileWrap");
  const target = qs("#mainSigninTurnstile");

  if (!wrap || !target) return;

  wrap.hidden = false;

  if (mainSigninCaptchaWidgetId !== null) return;

  try {
    const turnstile = await loadMainSigninTurnstileScript();

    mainSigninCaptchaWidgetId = turnstile.render(target, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback(token) {
        mainSigninCaptchaToken = token || "";
        const message = qs("#authMessage");
        if (message?.textContent?.toLowerCase().includes("bot check")) {
          message.textContent = "";
          message.className = "auth-message";
        }
      },
      "expired-callback"() {
        mainSigninCaptchaToken = "";
      },
      "error-callback"() {
        mainSigninCaptchaToken = "";
        const message = qs("#authMessage");
        if (message) {
          message.textContent = "Bot check failed. Please try again.";
          message.className = "auth-message error";
        }
      }
    });
  } catch (error) {
    console.warn("Main sign-in Turnstile load failed:", error);
    const message = qs("#authMessage");
    if (message) {
      message.textContent = "Bot check could not load. Please refresh and try again.";
      message.className = "auth-message error";
    }
  }
}

function resetMainSigninCaptcha() {
  mainSigninCaptchaToken = "";

  if (
    mainSigninCaptchaWidgetId !== null &&
    window.turnstile?.reset
  ) {
    window.turnstile.reset(mainSigninCaptchaWidgetId);
  }
}

function showLoginPopup(mode = "login", message = "") {

  if (mode === "signup") {
    window.location.href =
      "account.html?mode=signup";
    return;
  }

  const popup =
    qs("#loginPopup");

  if (!popup) return;

  popup.dataset.mode = mode;

  popup.style.display =
    "flex";

  popup.classList.remove(
    "hidden"
  );

  window.requestAnimationFrame(() => {
    void renderMainSigninCaptcha();
  });

  const email =
    qs("#loginEmail");

  email?.focus();

  const msg =
    qs("#authMessage");

  if (msg) {
    msg.textContent =
      message ||
      (mode === "signup"
        ? t(
            "signup_enter_email_password",
            "Enter an email and create a password for your new account. You will receive a confirmation email, just follow the given link. Welcome!"
          )
        : "");

    msg.className =
      mode === "signup"
        ? "auth-message success"
        : "auth-message";
  }

  refreshAuthButtons();

}

function bindBetaLandingButtons() {

  if (BETA_LANDING_BINDINGS_BOUND) return;

  BETA_LANDING_BINDINGS_BOUND = true;

}

bindBetaLandingButtons();

// ============================================================
// AUTH GATE (source of truth = session)
// ============================================================

async function syncAuthGate() {

  const popup =
    document.getElementById(
      "loginPopup"
    );

  const betaLanding =
    document.getElementById(
      "betaLanding"
    );

  const appContainer =
    document.querySelector(
      ".container"
    );

  const loginBtn =
    document.getElementById(
      "loginBtn"
    );

  const authStatus =
    document.getElementById(
      "authStatus"
    );
  
debugLog("AUTH UI CHECK", {
  popup,
  loginBtn,
  authStatus
});
  
  const {
    data: { session }
  } =
    await supabase.auth.getSession();

  // Keep the directory closed until the visitor has actively confirmed age.
  if (!hasLegalAgeConfirmation()) {
    return session || null;
  }

  // ============================================================
  // NOT LOGGED IN
  // ============================================================

  if (!session) {

    DIRECT_MAIN_AFTER_BOOT = false;

    document.documentElement.classList.remove(
      "wcl-direct-main"
    );

    document.body.classList.remove(
      "auth-locked"
    );

    betaLanding?.classList.add(
      "hidden"
    );

    betaLanding?.setAttribute(
      "aria-hidden",
      "true"
    );

    appContainer?.removeAttribute(
      "inert"
    );

    appContainer?.removeAttribute(
      "aria-hidden"
    );

    // Ta bort auto-popup

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
      debugLog(
  "LOGIN BTN AFTER SET:",
  loginBtn.textContent
);

    }

    
    if (authStatus) {
      authStatus.textContent = "";
    }

    return null;

  }

// ============================================================
// LOGGED IN
// ============================================================

void trackAuthenticatedMemberActive("session_active");

document.body.classList.remove(
  "auth-locked"
);

betaLanding?.classList.add(
  "hidden"
);

betaLanding?.setAttribute(
  "aria-hidden",
  "true"
);

appContainer?.removeAttribute(
  "inert"
);

appContainer?.removeAttribute(
  "aria-hidden"
);

DIRECT_MAIN_AFTER_BOOT = false;

document.documentElement.classList.remove(
  "wcl-direct-main"
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

    debugLog(
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

  return session;

}

// ============================================================
// LOGIN BINDINGS
// ============================================================

function bindLoginButtons() {

  if (LOGIN_BINDINGS_BOUND) {
    refreshAuthButtons();
    return;
  }

  LOGIN_BINDINGS_BOUND = true;

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

        // LOGOUT

        await supabase.auth.signOut();

        return;

      }

      // LOGIN

      showLoginPopup();

    }
  );

  qs("#startLoginBtn")?.addEventListener(
    "click",
    () => showLoginPopup("login")
  );

  qs("#startSignupBtn")?.addEventListener(
    "click",
    () => showLoginPopup("signup")
  );

  qs("#authCreateAccountBtn")?.addEventListener(
    "click",
    () => showLoginPopup("signup")
  );

  bindBetaLandingButtons();

  qs("#startExploreBtn")?.addEventListener(
    "click",
    () => {
      qs("#searchInput")?.focus();
      resetToHero();
    }
  );

  qs("#loginClose")?.addEventListener(
    "click",
    hideLoginPopup
  );

  // AUTH MESSAGE

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

  // BUTTONS

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

    if (signupBtn) {
      signupBtn.disabled =
        !(email && pass);
    }

    // RESET

    resetBtn.disabled =
      !email;

  }

  refreshAuthButtons = updateButtons;

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

    if (TURNSTILE_SITE_KEY && !mainSigninCaptchaToken) {
      setMessage(
        "Complete the bot check before signing in",
        "error"
      );
      void renderMainSigninCaptcha();
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

    const credentials = {
      email,
      password: pass
    };

    if (TURNSTILE_SITE_KEY) {
      credentials.options = {
        captchaToken: mainSigninCaptchaToken
      };
    }

    const {
      data,
      error
    } = await supabase.auth.signInWithPassword(credentials);

if (error) {

  resetMainSigninCaptcha();

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

// force session persist
await supabase.auth.getSession();

// TRACK LOGIN
await trackLoginEvent("main_login");

submit.disabled = false;

submit.disabled = false;

spinner?.classList.add(
  "hidden"
);

if (label) {

  label.textContent =
    t("login", "Login");

}

hideLoginPopup();
resetMainSigninCaptcha();

await syncAuthAndMaybeBootApp();

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

    // VISA MODE DIREKT

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

    // HANDLE BOTH CASES

    if (data?.session) {

      // auto login

      hideLoginPopup();

      await syncAuthAndMaybeBootApp();

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
// COOKIE BANNER
// ============================================================

function initCookieBanner() {
  const banner = qs("#cookieBanner");
  const acceptBtn = qs("#cookieAcceptBtn");
  const rejectBtn = qs("#cookieRejectBtn");
  const manageBtn = qs("#cookieManageBtn");
  const saveBtn = qs("#cookieSaveBtn");
  const settingsBtn = qs("#cookieSettingsBtn");
  const managePanel = qs("#cookieManagePanel");
  const analyticsToggle = qs("#cookieAnalyticsToggle");
  const storageKey = "wcl_cookie_consent_v1";

  if (!banner) return;

  function getConsent() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function clearAnalyticsStorage() {
    try {
      [
        "wcl_visitor_id",
        "wcl_session_id",
        "wcl_session_date",
        "wcl_session",
        "wcl_session_start_tracked_date",
        "wcl_viewed_stores"
      ].forEach((key) => localStorage.removeItem(key));

      const localKeys = [];

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key) localKeys.push(key);
      }

      localKeys.forEach((key) => {
        if (
          key.startsWith("wcl_viewed_v1:") ||
          key.startsWith("wcl_viewed_stores_")
        ) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    try {
      const sessionKeys = [];

      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (key) sessionKeys.push(key);
      }

      sessionKeys.forEach((key) => {
        if (key.startsWith("wcl_viewed_stores_")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {}
  }

  function hideBanner() {
    banner.style.display = "none";
    managePanel?.classList.add("hidden");
    saveBtn?.classList.add("hidden");
    manageBtn?.classList.remove("hidden");
    acceptBtn?.classList.remove("hidden");
  }

  function showBanner(showManage = false) {
    const accepted =
      getConsent() === "accepted";

    if (analyticsToggle) {
      analyticsToggle.checked = accepted;
    }

    managePanel?.classList.toggle(
      "hidden",
      !showManage
    );

    saveBtn?.classList.toggle(
      "hidden",
      !showManage
    );

    manageBtn?.classList.toggle(
      "hidden",
      showManage
    );

    acceptBtn?.classList.toggle(
      "hidden",
      showManage
    );

    banner.style.display = "flex";
  }

  function saveConsent(value) {
    try {
      localStorage.setItem(storageKey, value);
    } catch {}

    if (value === "accepted") {
      window.dispatchEvent(
        new Event("wcl:cookie-consent")
      );
    } else {
      clearAnalyticsStorage();
      window.dispatchEvent(
        new Event("wcl:cookie-consent-declined")
      );
    }

    hideBanner();
  }

  if (getConsent()) {
    hideBanner();
  } else {
    showBanner(false);
  }

  acceptBtn?.addEventListener(
    "click",
    () => saveConsent("accepted")
  );

  rejectBtn?.addEventListener(
    "click",
    () => saveConsent("rejected")
  );

  manageBtn?.addEventListener(
    "click",
    () => showBanner(true)
  );

  saveBtn?.addEventListener(
    "click",
    () => {
      saveConsent(
        analyticsToggle?.checked
          ? "accepted"
          : "rejected"
      );
    }
  );

  settingsBtn?.addEventListener(
    "click",
    () => showBanner(true)
  );
}

function trackSiteOpenedOnce() {
  if (SITE_OPEN_TRACKED) return;
  SITE_OPEN_TRACKED = true;

  void trackEvent("site_opened", {
    source: "direct"
  });
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

    debugLog(
      "SIDEBAR BUILT"
    );

  } catch (err) {

    console.error(
      "SIDEBAR ERROR:",
      err
    );

  }

}

async function syncAuthAndMaybeBootApp() {
  const session =
    await syncAuthGate();

  await initSidebarOnce();

  return session;
}

function bindEntranceGate(onEnter) {
  if (ENTRANCE_GATE_BINDINGS_BOUND) return;

  const startEnterBtn =
    document.getElementById(
      "startEnterBtn"
    );

  const legalAgeConfirm =
    document.getElementById(
      "startLegalAgeConfirm"
    );

  if (!startEnterBtn || !legalAgeConfirm) return;

  ENTRANCE_GATE_BINDINGS_BOUND = true;

  const syncEnterButton = () => {
    startEnterBtn.disabled =
      !legalAgeConfirm.checked;
  };

  legalAgeConfirm.addEventListener(
    "change",
    syncEnterButton
  );

  legalAgeConfirm.addEventListener(
    "input",
    syncEnterButton
  );

  startEnterBtn.addEventListener(
    "click",
    async () => {
      if (!legalAgeConfirm.checked) return;

      startEnterBtn.disabled = true;
      await onEnter();
    }
  );

  syncEnterButton();
}

// ============================================================
// BOOT
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    debugLog("MAIN BOOT");

    const enterPublicDirectory =
      async () => {
        try {
          localStorage.setItem(
            "wcl_age_verified",
            "1"
          );
        } catch {}

        bindLoginButtons();
        initCookieBanner();
        trackSiteOpenedOnce();

        await syncAuthAndMaybeBootApp();

        if (OPEN_LOGIN_AFTER_BOOT) {
          OPEN_LOGIN_AFTER_BOOT = false;
          showLoginPopup("login");
        }
      };

    // Bind the entrance controls immediately. Slow auth or language requests
    // must never leave the visible Enter button unusable.
    bindEntranceGate(
      enterPublicDirectory
    );

    // ============================================================
    // I18N INIT
    // ============================================================

    try {
      await initI18n();
    } catch (err) {
      console.warn(
        "I18N init skipped",
        err
      );
    }

    // ============================================================
    // AGE GATE
    // ============================================================

    if (hasLegalAgeConfirmation()) {

      // ============================================================
      // NORMAL BOOT
      // ============================================================

      bindLoginButtons();
      initCookieBanner();
      trackSiteOpenedOnce();

      await syncAuthAndMaybeBootApp();

      if (OPEN_LOGIN_AFTER_BOOT) {
        OPEN_LOGIN_AFTER_BOOT = false;
        showLoginPopup("login");
      }

    }

  }
);

// ------------------------------------------------------------
// ADD STORE BUTTON (public submission)
// ------------------------------------------------------------

const addBtn =
  qs("#addStoreBtn");

addBtn?.addEventListener(
  "click",
  () => {
    window.location.href =
      "add-store.html";

  }
);

// ------------------------------------------------------------
// AUTH LISTENER
// ------------------------------------------------------------

window.addEventListener(
  "load",
  () => {

    supabase.auth.onAuthStateChange(
      () => {

        if (hasLegalAgeConfirmation()) {
          syncAuthAndMaybeBootApp();
        }

      }
    );

  }
);

window.addEventListener(
  "wcl:auth-required",
  (event) => {
    showLoginPopup(
      "login",
      event.detail?.message ||
        "Sign in to use this feature."
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
      source: "deep_link"
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
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      document
        .querySelectorAll(
          `.favorite-btn[data-store-id="${id}"],
           .favorite-heart[data-store-id="${id}"],
           #modalFavoriteBtn[data-store-id="${id}"]`
        )
        .forEach((btn) => btn.classList.remove("active"));

      return;
    }

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
