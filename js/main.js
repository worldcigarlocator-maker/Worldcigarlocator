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

guardFrontend();
supabase.auth.onAuthStateChange(() => guardFrontend());

import "./globals.js";
import "./cards.js";
import "./sidebar.js";
import "./start.js";
