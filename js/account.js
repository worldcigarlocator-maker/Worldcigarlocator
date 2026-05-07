
// ============================================================
// ACCOUNT.JS — WCL ACCOUNT PAGE
// ============================================================

import { supabase } from "/js/globals.js";

// ============================================================
// DOM
// ============================================================

const emailInput =
  document.getElementById("accountEmail");

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

function setMessage(text, isError = false) {

  if (!messageBox) return;

  messageBox.textContent = text;

  messageBox.style.color =
    isError
      ? "#ff8c8c"
      : "rgba(255,255,255,0.78)";
}

// ============================================================
// LOAD ACCOUNT
// ============================================================

async function loadAccount() {

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "/";
    return;
  }

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

  container.innerHTML = data.map((item) => {
const store =
  item.stores || {};

const store =
  item.stores || {};

return `
  <div class="account-comment-item">

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
        store_id
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

    return `
      <div class="account-rating-item">

        <div class="account-rating-top">

          <div class="account-rating-date">
            ${new Date(
              item.created_at
            ).toLocaleDateString()}
          </div>

          <div class="account-rating-stars">
            ${"★".repeat(item.rating || 0)}
          </div>

        </div>

      </div>
    `;

  }).join("");
}

// ============================================================
// EVENTS
// ============================================================

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

    await loadAccount();

    await loadMyComments();

    await loadMyRatings();

  }
);

