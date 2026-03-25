```javascript
// ============================================================
// START.JS — CLEAN VERSION (NO SYNTAX ERRORS)
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
// FAKE ONLINE COUNTER
// ============================================================

export function fakeOnline() {

  const el = qs("onlineText");
  if (!el) return;

  const count = 28 + Math.round(Math.random() * 14);

  el.textContent = count + " online";

}

// ============================================================
// ACCESS GATE (NO TEMPLATE STRINGS)
// ============================================================

function initAccessGate() {

  const ACCESS_KEY = "wcl_access";
  const VALID_USER = "jockefylla";
  const VALID_PASS = "jockefylla";

  if (localStorage.getItem(ACCESS_KEY) === "granted") return false;

  const gate = document.createElement("div");

  // overlay
  gate.style.position = "fixed";
  gate.style.top = "0";
  gate.style.left = "0";
  gate.style.width = "100%";
  gate.style.height = "100%";
  gate.style.zIndex = "9999";
  gate.style.background = "rgba(5,5,5,0.8)";
  gate.style.display = "flex";
  gate.style.alignItems = "center";
  gate.style.justifyContent = "center";

  // container
  const box = document.createElement("div");
  box.style.background = "#0a0a0a";
  box.style.padding = "40px";
  box.style.borderRadius = "16px";
  box.style.border = "1px solid rgba(255,255,255,0.1)";
  box.style.width = "320px";
  box.style.textAlign = "center";
  box.style.boxShadow = "0 20px 60px rgba(0,0,0,0.6)";

  const title = document.createElement("h2");
  title.textContent = "World Cigar Locator coming soon...";
  title.style.marginBottom = "20px";

  const userInput = document.createElement("input");
  userInput.placeholder = "Username";
  userInput.id = "wcl-user";
  styleInput(userInput);

  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = "Password";
  passInput.id = "wcl-pass";
  styleInput(passInput);

  const btn = document.createElement("button");
  btn.textContent = "Enter";
  btn.style.width = "100%";
  btn.style.padding = "10px";
  btn.style.background = "rgb(115,98,75)";
  btn.style.border = "none";
  btn.style.color = "#fff";
  btn.style.cursor = "pointer";

  btn.onclick = () => {

    if (
      userInput.value === VALID_USER &&
      passInput.value === VALID_PASS
    ) {
      localStorage.setItem(ACCESS_KEY, "granted");
      location.reload();
    } else {
      alert("Wrong credentials");
    }

  };

  box.appendChild(title);
  box.appendChild(userInput);
  box.appendChild(passInput);
  box.appendChild(btn);

  gate.appendChild(box);
  document.body.appendChild(gate);

  return true;
}

// helper
function styleInput(el) {
  el.style.width = "100%";
  el.style.marginBottom = "10px";
  el.style.padding = "10px";
  el.style.background = "#111";
  el.style.border = "1px solid #222";
  el.style.color = "#fff";
}

// ============================================================
// BOOT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  // 🔒 ACCESS GATE FIRST
  const blocked = initAccessGate();
  if (blocked) return;

  // NORMAL FLOW
  initAgeGate();

  fakeOnline();
  setInterval(fakeOnline, 8000);

});
```
