
// ============================================================
// START.JS — FIXED (MINIMAL CHANGE)
// ============================================================

import { qs } from "./globals.js";

// ============================================================
// AGE GATE
// ============================================================

export function initAgeGate() {

  const modal = qs("ageGate");
  const login = qs("loginPopup");

  if (!modal) return;

  if (localStorage.getItem("ageVerified") === "yes") {
    modal.classList.add("hidden");
    if (login) login.style.display = "flex";
    return;
  }

  modal.classList.remove("hidden");
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
// FAKE ONLINE
// ============================================================

export function fakeOnline() {

  const el = qs("onlineText");
  if (!el) return;

  const count = 28 + Math.round(Math.random() * 14);

  el.textContent = count + " online"; // ← safe version
}

// ============================================================
// BOOT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  const ACCESS_KEY = "wcl_access";
  const VALID_USER = "jockefylla";
  const VALID_PASS = "jockefylla";

  const hasAccess = localStorage.getItem(ACCESS_KEY) === "granted";

  if (!hasAccess) {

    const gate = document.createElement("div");

    gate.style.position = "fixed";
    gate.style.inset = "0";
    gate.style.zIndex = "9999";
    gate.style.background = "rgba(5,5,5,0.75)";
    gate.style.display = "flex";
    gate.style.alignItems = "center";
    gate.style.justifyContent = "center";

    // 🔥 FIXED TEMPLATE STRING (THIS WAS THE BUG)
    gate.innerHTML = `
      <div style="
        background:#0a0a0a;
        padding:40px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.1);
        width:320px;
        text-align:center;
      ">
        <h2 style="margin-bottom:20px;">World Cigar Locator coming soon...</h2>

        <input id="wcl-user" placeholder="Username" style="width:100%;margin-bottom:10px;padding:10px;background:#111;border:1px solid #222;color:#fff;" />

        <input id="wcl-pass" type="password" placeholder="Password" style="width:100%;margin-bottom:20px;padding:10px;background:#111;border:1px solid #222;color:#fff;" />

        <button id="wcl-enter" style="width:100%;padding:10px;background:rgb(115,98,75);border:none;color:#fff;cursor:pointer;">
          Enter
        </button>
      </div>
    `;

    document.body.appendChild(gate);

    const btn = document.getElementById("wcl-enter");

    if (btn) {
      btn.onclick = () => {

        const user = document.getElementById("wcl-user").value;
        const pass = document.getElementById("wcl-pass").value;

        if (user === VALID_USER && pass === VALID_PASS) {
          localStorage.setItem(ACCESS_KEY, "granted");
          location.reload();
        } else {
          alert("Wrong credentials");
        }

      };
    }

    return;
  }

  initAgeGate();
  fakeOnline();
  setInterval(fakeOnline, 8000);

});
```
