// ============================================================
// START.JS — ONLY AGE GATE + SMALL HELPERS
// ============================================================

export function qs(id) {
  return document.getElementById(id);
}

/* ============================================================
   AGE GATE
   ============================================================ */
export function initAgeGate() {
  const modal = qs("ageGate");
  const enter = qs("enterBtn");
  const leave = qs("leaveBtn");

  if (!modal) return;

  // Already verified?
  if (localStorage.getItem("ageVerified") === "yes") {
    modal.classList.add("hidden");
    return;
  }

  // Show first time
  modal.classList.remove("hidden");

  enter.onclick = () => {
    localStorage.setItem("ageVerified", "yes");
    modal.classList.add("hidden");
  };

  leave.onclick = () => {
    window.location.href = "https://google.com";
  };
}

/* ============================================================
   FAKE ONLINE COUNTER
   ============================================================ */
export function fakeOnline() {
  const el = qs("onlineText");
  if (!el) return;

  el.textContent = Math.floor(28 + Math.random() * 23) + " online";
}
