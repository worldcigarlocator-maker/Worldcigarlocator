import { supabase } from "./globals.js";

async function guardFrontend() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Not logged in → hide entire frontend
    document.querySelector(".container").style.display = "none";

    // Show login popup
    showLoginPopup();
  } else {
    // Logged in → show everything
    document.querySelector(".container").style.display = "flex";
  }
}

export function showLoginPopup() {
  const box = document.getElementById("loginPopup");
  if (box) box.classList.remove("hidden");

  document.getElementById("loginSubmit").onclick = async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("Login failed");
    } else {
      location.reload();
    }
  };
}


guardFrontend();
supabase.auth.onAuthStateChange(() => guardFrontend());

import "./globals.js";
import "./cards.js";
import "./sidebar.js";
import "./start.js";
