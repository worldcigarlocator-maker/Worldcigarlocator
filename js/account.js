// ============================================================
// ACCOUNT.JS — WCL ACCOUNT SYSTEM
// ============================================================

import { supabase } from "/js/globals.js";

// ============================================================
// DOM
// ============================================================

const accountModal = document.getElementById("accountModal");

const manageBtn =
  document.getElementById("manageAccountBtn");

const closeBtn =
  document.getElementById("accountModalClose");

const backdrop =
  accountModal?.querySelector("[data-account-close]");

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

function openAccountModal() {
  accountModal?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAccountModal() {
  accountModal?.classList.add("hidden");
  document.body.style.overflow = "";
}

async function loadAccount() {

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  if (emailInput) {
    emailInput.value = user.email || "";
  }

  if (displayNameInput) {
    displayNameInput.value =
      user.user_metadata?.display_name || "";
  }

  setMessage("");
}

// ============================================================
// DISPLAY NAME
// ============================================================

async function saveDisplayName() {

  const value =
    displayNameInput?.value?.trim() || "";

  const { error } =
    await supabase.auth.updateUser({
      data: {
        display_name: value
      }
    });

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

  window.location.reload();
}

// ============================================================
// DELETE ACCOUNT
// ============================================================

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

    window.location.reload();

  } catch (err) {

    setMessage(
      err.message || "Delete failed",
      true
    );
  }
}

// ============================================================
// EVENTS
// ============================================================

manageBtn?.addEventListener("click", async (e) => {
  e.preventDefault();

  await loadAccount();

  openAccountModal();
});

closeBtn?.addEventListener("click", closeAccountModal);

backdrop?.addEventListener("click", closeAccountModal);

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

document.addEventListener("keydown", (e) => {

  if (
    e.key === "Escape" &&
    !accountModal?.classList.contains("hidden")
  ) {
    closeAccountModal();
  }
});
