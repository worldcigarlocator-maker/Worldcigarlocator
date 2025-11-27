import { qs } from "./globals.js";

export function initAgeGate() {
  const modal = qs("ageGate");
  if (!modal) return;

  if (localStorage.getItem("ageVerified") === "yes") {
    modal.classList.add("hidden");
    return;
  }

  modal.classList.remove("hidden");

  qs("enterBtn").onclick = () => {
    localStorage.setItem("ageVerified", "yes");
    modal.classList.add("hidden");
  };

  qs("leaveBtn").onclick = () => {
    window.location.href = "https://google.com";
  };
}

export function fakeOnline() {
  const el = qs("onlineText");
  if (!el) return;
  el.textContent = `${28 + Math.round(Math.random()*14)} online`;
}

document.addEventListener("DOMContentLoaded", () => {
  fakeOnline();
  setInterval(fakeOnline, 8000);
});
