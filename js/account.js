
// ============================================================
// ACCOUNT.JS — WCL ACCOUNT PAGE
// ============================================================

import { supabase } from "/js/globals.js";
import { openModal } from "/js/modal.js";
import { initI18n } from "/js/i18n.js";

// ============================================================
// DOM
// ============================================================

const emailInput =
  document.getElementById("accountEmail");

const accountApp =
  document.getElementById("accountApp");

const signupGate =
  document.getElementById("accountSignupGate");

const signupEmailInput =
  document.getElementById("signupEmail");

const signupPasswordInput =
  document.getElementById("signupPassword");

const signupDisplayNameInput =
  document.getElementById("signupDisplayName");

const signupRulesInput =
  document.getElementById("signupRulesAccepted");

const createAccountPageBtn =
  document.getElementById("createAccountPageBtn");

const signupMessageBox =
  document.getElementById("signupMessage");

const displayNameInput =
  document.getElementById("accountDisplayName");

const passwordInput =
  document.getElementById("accountPassword");

const saveDisplayBtn =
  document.getElementById("saveDisplayNameBtn");

const changePasswordBtn =
  document.getElementById("changePasswordBtn");

const logoutBtn =
  document.getElementById("logoutAccountBtn");

const deleteBtn =
  document.getElementById("deleteAccountBtn");

const messageBox =
  document.getElementById("accountMessage");

// ============================================================
// HELPERS
// ============================================================

function tr(key, fallback = "") {

  if (window.t) {
    return window.t(key, fallback);
  }

  return fallback || key;

}

function setMessage(
  text,
  isError = false
) {

  if (!messageBox) return;

  messageBox.textContent = text;

  messageBox.style.color =
    isError
      ? "#ff8c8c"
      : "rgba(255,255,255,0.78)";
}

function isSignupMode() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("mode") === "signup" ||
    params.get("signup") === "1"
  );
}

function setSignupMessage(
  text,
  isError = false
) {

  if (!signupMessageBox) return;

  signupMessageBox.textContent = text;

  signupMessageBox.style.color =
    isError
      ? "#ff8c8c"
      : "rgba(255,255,255,0.78)";
}

function showSignupGate() {
  signupGate?.classList.remove("hidden");
  accountApp?.classList.add("hidden");
  signupEmailInput?.focus();
}

function showAccountApp() {
  signupGate?.classList.add("hidden");
  accountApp?.classList.remove("hidden");
}

// ============================================================
// LOAD ACCOUNT
// ============================================================

async function loadAccount() {

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    if (isSignupMode()) {
      showSignupGate();
      return null;
    }

    window.location.href = "/";
    return null;
  }

  showAccountApp();

  const { data, error } =
    await supabase
      .from("profiles")
      .select(`
        email,
        display_name
      `)
      .eq("id", user.id)
      .single();

  if (error) {
    setMessage(error.message, true);
    return;
  }

  if (emailInput) {
    emailInput.value =
      data?.email || user.email || "";
  }

  if (displayNameInput) {
    displayNameInput.value =
      data?.display_name || "";
  }

  return user;
}

// ============================================================
// CREATE ACCOUNT
// ============================================================

async function createAccountFromPage() {
  const email =
    signupEmailInput?.value?.trim() || "";

  const password =
    signupPasswordInput?.value?.trim() || "";

  const displayName =
    signupDisplayNameInput?.value?.trim() || "";

  const rulesAccepted =
    !!signupRulesInput?.checked;

  if (!email || !password) {
    setSignupMessage(
      "Enter email and password",
      true
    );
    return;
  }

  if (password.length < 6) {
    setSignupMessage(
      "Password must be at least 6 characters",
      true
    );
    return;
  }

  if (!displayName) {
    setSignupMessage(
      "Enter a name or alias",
      true
    );
    return;
  }

  if (!rulesAccepted) {
    setSignupMessage(
      "You need to accept the WCL rules before creating an account",
      true
    );
    return;
  }

  if (createAccountPageBtn) {
    createAccountPageBtn.disabled = true;
  }
  setSignupMessage("Creating account...");

  const acceptedAt =
    new Date().toISOString();

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          wcl_rules_accepted: true,
          wcl_rules_accepted_at: acceptedAt
        }
      }
    });

  if (createAccountPageBtn) {
    createAccountPageBtn.disabled = false;
  }

  if (error) {
    setSignupMessage(error.message, true);
    return;
  }

  if (data?.session?.user?.id) {
    await supabase
      .from("profiles")
      .upsert(
        {
          id: data.session.user.id,
          email,
          display_name: displayName
        },
        {
          onConflict: "id"
        }
      );

    window.location.href = "account.html";
    return;
  }

  setSignupMessage(
    "Account created. Check your email and confirm the account, then sign in."
  );
}

// ============================================================
// DISPLAY NAME
// ============================================================

async function saveDisplayName() {

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const value =
    displayNameInput?.value?.trim() || "";

  const { error } =
    await supabase
      .from("profiles")
      .update({
        display_name: value
      })
      .eq("id", user.id);

  if (error) {
    setMessage(error.message, true);
    return;
  }

  setMessage("Display name updated");
}

// ============================================================
// PASSWORD
// ============================================================

async function changePassword() {

  const password =
    passwordInput?.value?.trim() || "";

  if (password.length < 6) {

    setMessage(
      "Password must be at least 6 characters",
      true
    );

    return;
  }

  const { error } =
    await supabase.auth.updateUser({
      password
    });

  if (error) {
    setMessage(error.message, true);
    return;
  }

  passwordInput.value = "";

  setMessage("Password updated");
}

// ============================================================
// LOGOUT
// ============================================================

async function logout() {

  await supabase.auth.signOut();

  window.location.href = "/";
}

// ============================================================
// DELETE ACCOUNT
// ============================================================

async function deleteAccount() {

  const confirmed = confirm(
    "Delete your account permanently?\n\nThis cannot be undone."
  );

  if (!confirmed) return;

  setMessage("Deleting account...");

  try {

    const { error } =
      await supabase.functions.invoke(
        "delete_account_v1"
      );

    if (error) {
      setMessage(error.message, true);
      return;
    }

    await supabase.auth.signOut();

    window.location.href = "/";

  } catch (err) {

    setMessage(
      err.message || "Delete failed",
      true
    );
  }
}

// ============================================================
// LOAD COMMENTS
// ============================================================

async function loadMyComments() {

  const container =
    document.querySelector(
      ".account-comments-list"
    );

  if (!container) return;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } =
    await supabase
      .from("store_comments")
      .select(`
        id,
        comment,
        created_at,
        store_id,
        stores (
          name,
          country,
          city
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    container.innerHTML = `
      <div class="account-empty">
        Failed to load comments
      </div>
    `;

    return;
  }

  if (!data?.length) {

    container.innerHTML = `
      <div class="account-empty">
        No comments yet
      </div>
    `;

    return;
  }

  container.innerHTML = data.map((item) => {

  const store =
    item.stores || {};

  return `
    <div
      class="account-comment-item"
      data-store-id="${item.store_id || ""}"
    >

      <div class="account-comment-top">

        <div>

          <div class="account-comment-store">
            ${store.name || "Unknown Store"}
          </div>

          <div class="account-comment-location">
            ${[
              store.country,
              store.city
            ]
              .filter(Boolean)
              .join(", ")}
          </div>

        </div>

        <div class="account-comment-date">
          ${new Date(
            item.created_at
          ).toLocaleDateString()}
        </div>

      </div>

      <div class="account-comment-text">
        ${item.comment || ""}
      </div>

    </div>
  `;

}).join("");

// ============================================================
// COMMENT CLICK
// ============================================================

container
  .querySelectorAll(
    ".account-comment-item"
  )
  .forEach((item) => {

    item.addEventListener(
      "click",
      () => {

        const storeId =
          item.dataset.storeId;

        if (!storeId) return;

        openModal({
          id: Number(storeId),
          source: "account"
        });

      }
    );

  });

}

// ============================================================
// LOAD RATINGS
// ============================================================

async function loadMyRatings() {

  const container =
    document.querySelector(
      ".account-ratings-list"
    );

  if (!container) return;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } =
    await supabase
      .from("ratings")
      .select(`
        id,
        rating,
        created_at,
        store_id,
        stores (
          name,
          country,
          city
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    container.innerHTML = `
      <div class="account-empty">
        Failed to load ratings
      </div>
    `;

    return;
  }

  if (!data?.length) {

    container.innerHTML = `
      <div class="account-empty">
        No ratings yet
      </div>
    `;

    return;
  }

  container.innerHTML = data.map((item) => {

    const store =
      item.stores || {};

    return `
      <div
        class="account-rating-item"
        data-store-id="${item.store_id || ""}"
      >

        <div class="account-rating-top">

          <div>

            <div class="account-rating-store">
              ${store.name || "Unknown Store"}
            </div>

            <div class="account-rating-location">
              ${[
                store.country,
                store.city
              ]
                .filter(Boolean)
                .join(", ")}
            </div>

          </div>

          <div class="account-rating-date">
            ${new Date(
              item.created_at
            ).toLocaleDateString()}
          </div>

        </div>

        <div class="account-rating-stars">
          ${"★".repeat(item.rating || 0)}
        </div>

      </div>
    `;

  }).join("");

  // ============================================================
  // RATING CLICK
  // ============================================================

  container
    .querySelectorAll(
      ".account-rating-item"
    )
    .forEach((item) => {

      item.addEventListener(
        "click",
        () => {

          const storeId =
            item.dataset.storeId;

          if (!storeId) return;

          openModal({
            id: Number(storeId),
            source: "account"
          });

        }
      );

    });

}

// ============================================================
// LOAD FAVORITES
// ============================================================

async function loadFavorites() {

  const container =
    document.querySelector(
      ".account-favorites-grid"
    );

  if (!container) return;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } =
    await supabase
      .from("store_favorites")
      .select(`
        created_at,
        store_id,
        stores (
          id,
          name,
          country,
          city
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    container.innerHTML = `
      <div class="account-empty">
        Failed to load favorites
      </div>
    `;

    return;
  }

  if (!data?.length) {

    container.innerHTML = `
      <div class="account-empty">
        No favorites yet
      </div>
    `;

    return;
  }

  container.innerHTML = data.map((item) => {

    const store =
      item.stores || {};

    return `
      <div
        class="account-comment-item"
        data-store-id="${item.store_id || ""}"
      >

        <div class="account-comment-top">

          <div>

            <div class="account-comment-store">
              ${store.name || "Unknown Store"}
            </div>

            <div class="account-comment-location">
              ${[
                store.country,
                store.city
              ]
                .filter(Boolean)
                .join(", ")}
            </div>

          </div>

          <div class="account-comment-date">
            ${new Date(
              item.created_at
            ).toLocaleDateString()}
          </div>

        </div>

      </div>
    `;

  }).join("");

  // ============================================================
  // FAVORITE CLICK
  // ============================================================

  container
    .querySelectorAll(
      ".account-comment-item"
    )
    .forEach((item) => {

      item.addEventListener(
        "click",
        () => {

          const storeId =
            item.dataset.storeId;

          if (!storeId) return;

          openModal({
            id: Number(storeId),
            source: "account"
          });

        }
      );

    });

}

// ============================================================
// EVENTS
// ============================================================

createAccountPageBtn?.addEventListener(
  "click",
  createAccountFromPage
);

signupPasswordInput?.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      createAccountFromPage();
    }
  }
);

signupDisplayNameInput?.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      createAccountFromPage();
    }
  }
);

saveDisplayBtn?.addEventListener(
  "click",
  saveDisplayName
);

changePasswordBtn?.addEventListener(
  "click",
  changePassword
);

logoutBtn?.addEventListener(
  "click",
  logout
);

deleteBtn?.addEventListener(
  "click",
  deleteAccount
);

// ============================================================
// INIT
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await initI18n();

    const user =
      await loadAccount();

    if (!user) return;

    await loadMyComments();

    await loadMyRatings();

    await loadFavorites();

  }
);


// ============================================================
// ACCOUNT NAVIGATION
// ============================================================

const navButtons =
  document.querySelectorAll(
    ".account-nav-btn"
  );

// ============================================================
// ACCOUNT SECTIONS
// ============================================================

const accountSections = [
  "accountSettings",
  "accountComments",
  "accountRatings",
  "accountFavorites",
  "accountNotifications",
  "accountLanguage",
  "accountSessions",
  "accountContributor",
  "accountAdmin"
];

// ============================================================
// HIDE ALL
// ============================================================

function hideAllSections() {

  accountSections.forEach((id) => {

    const section =
      document.getElementById(id);

    if (section) {
      section.style.display = "none";
    }

  });

}

// ============================================================
// OPEN SECTION
// ============================================================

function openSection(sectionId) {

  hideAllSections();

  navButtons.forEach((btn) => {
    btn.classList.remove("active");
  });

  const target =
    document.getElementById(
      sectionId
    );

  if (target) {
    target.style.display = "block";
  }

  resetAccountScroll();

  navButtons.forEach((btn) => {

    if (
      btn.dataset.section ===
      sectionId
    ) {
      btn.classList.add("active");
    }

  });

}

// ============================================================
// CLICK NAVIGATION
// ============================================================

navButtons.forEach((btn) => {

  btn.addEventListener(
    "click",
    (e) => {

      e.preventDefault();

      e.currentTarget.blur();

      const sectionId =
        btn.dataset.section;

      if (!sectionId) return;

      openSection(sectionId);

      window.scrollTo(0, 0);

    }
  );

});

// ============================================================
// DEFAULT
// ============================================================

openSection("accountSettings");


// ============================================================
// RESET SCROLL ON SECTION CHANGE
// ============================================================

function resetAccountScroll() {

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });

}

// ============================================================
// LOCAL SEARCH — COMMENTS
// ============================================================

const commentsSearchInput =
  document.getElementById(
    "commentsSearchInput"
  );

commentsSearchInput?.addEventListener(
  "input",
  () => {

    const value =
      commentsSearchInput.value
        .trim()
        .toLowerCase();

    const rows =
      document.querySelectorAll(
        ".account-comment-item"
      );

    rows.forEach((row) => {

      const text =
        row.textContent.toLowerCase();

      row.style.display =
        text.includes(value)
          ? "block"
          : "none";

    });

  }
);

// ============================================================
// LOCAL SEARCH — RATINGS
// ============================================================

const ratingsSearchInput =
  document.getElementById(
    "ratingsSearchInput"
  );

ratingsSearchInput?.addEventListener(
  "input",
  () => {

    const value =
      ratingsSearchInput.value
        .trim()
        .toLowerCase();

    const rows =
      document.querySelectorAll(
        ".account-rating-item"
      );

    rows.forEach((row) => {

      const text =
        row.textContent.toLowerCase();

      row.style.display =
        text.includes(value)
          ? "block"
          : "none";

    });

  }
);


// ============================================================
// LANGUAGE SWITCHER
// ============================================================

const languageButtons =
  document.querySelectorAll(
    ".account-language-btn"
  );

languageButtons.forEach((btn) => {

  btn.addEventListener(
    "click",
    async () => {

      const lang =
        btn.dataset.lang;

      if (!lang) return;

      try {

        /* ================= LOCK UI ================= */

        document.body.style.pointerEvents =
          "none";

        /* ================= LOCAL ================= */

        localStorage.setItem(
          "wcl_language",
          lang
        );

        /* ================= PROFILE ================= */

        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (user?.id) {

          await supabase
            .from("profiles")
            .update({
              language: lang
            })
            .eq("id", user.id);

        }

      } catch (err) {

        console.error(
          "LANGUAGE SWITCH ERROR",
          err
        );

      }

      window.location.reload();

    }
  );

});
