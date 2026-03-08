// ============================================================
// START.JS — Age Gate + Small UI Helpers
// ============================================================

import { qs } from "./globals.js";

// ============================================================
// AGE GATE
// ============================================================

export function initAgeGate() {

  const modal = qs("ageGate");
  const login = qs("loginPopup");

  if (!modal) return;

  // Already verified
  if (localStorage.getItem("ageVerified") === "yes") {

    modal.classList.add("hidden");

    if (login) login.style.display = "flex";

    return;
  }

  // Show age gate
  modal.classList.remove("hidden");

  // Hide login until age confirmed
  if (login) login.style.display = "none";

  const enter = qs("enterBtn");
  const leave = qs("leaveBtn");

  if (enter) {
    enter.onclick = () => {

      localStorage.setItem("ageVerified", "yes");

      modal.classList.add("hidden");

      if (login) login.style.display = "flex";

    };
  }

  if (leave) {
    leave.onclick = () => {
      window.location.href = "https://google.com";
    };
  }

}

// ============================================================
// SMALL FAKE ONLINE COUNTER (UI DETAIL)
// ============================================================

export function fakeOnline() {

  const el = qs("onlineText");
  if (!el) return;

  const count = 28 + Math.round(Math.random() * 14);

  el.textContent = `${count} online`;

}

// ============================================================
// BOOT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  // Age gate
  initAgeGate();

  // Fake online counter
  fakeOnline();
  setInterval(fakeOnline, 8000);

});
