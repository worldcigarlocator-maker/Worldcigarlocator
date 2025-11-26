// ============================================================
// START.JS — AGE GATE + FAKE ONLINE
// ============================================================

// 18+ age gate
export function initAgeGate() {
  const modal = document.getElementById("ageGate");
  const enter = document.getElementById("enterBtn");
  const leave = document.getElementById("leaveBtn");

  if (!modal) return;

  // Redan verifierad tidigare
  if (localStorage.getItem("ageVerified") === "yes") {
    modal.classList.add("hidden");
    return;
  }

  // Visa modalen
  modal.classList.remove("hidden");

  if (enter) {
    enter.onclick = () => {
      localStorage.setItem("ageVerified", "yes");
      modal.classList.add("hidden");
    };
  }

  if (leave) {
    leave.onclick = () => {
      window.location.href = "https://google.com";
    };
  }
}

// Fake online counter
export function initFakeOnline() {
  const el = document.getElementById("onlineText");
  if (!el) return;

  const base = 28 + Math.floor(Math.random() * 23);
  el.textContent = base + " online";
}
