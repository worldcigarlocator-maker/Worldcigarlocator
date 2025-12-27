/* ============================================================
   start.js — Age Gate + small boot helpers (NO MODULES)
   ============================================================ */
(function () {
  "use strict";

  function showAgeGate() {
    const gate = qs("#ageGate");
    gate?.classList.remove("hidden");
  }

  function hideAgeGate() {
    const gate = qs("#ageGate");
    gate?.classList.add("hidden");
  }

  function initAgeGate() {
    const entered = localStorage.getItem("wcl_age_ok") === "1";
    if (!entered) showAgeGate();

    qs("#enterBtn")?.addEventListener("click", () => {
      localStorage.setItem("wcl_age_ok", "1");
      hideAgeGate();
    });

    qs("#leaveBtn")?.addEventListener("click", () => {
      // simple safe behavior
      window.location.href = "https://www.google.com";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initAgeGate();
  });

  console.log("✅ start.js loaded");
})();
