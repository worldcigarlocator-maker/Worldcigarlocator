// ============================================================
// CARDS-EXPANDED.JS — MAIN OVERLAY + LAZY RATING
// ============================================================

import { supabase } from "./globals.js";

const dom = (sel) => document.querySelector(sel);

let ACTIVE_CARD = null;
let ACTIVE_STORE_ID = null;
let OVERLAY = null;

function ensureOverlay() {
  if (OVERLAY) return OVERLAY;

  OVERLAY = document.createElement("div");
  OVERLAY.className = "wcl-overlay";

  OVERLAY.addEventListener("click", (e) => {
    if (e.target === OVERLAY) closeExpanded();
  });

  document.body.appendChild(OVERLAY);
  return OVERLAY;
}

function toggleExpanded(card, storeId) {
  if (ACTIVE_CARD === card) {
    closeExpanded();
    return;
  }

  closeExpanded();

  const overlay = ensureOverlay();
  overlay.appendChild(card);
  card.classList.add("expanded");

  ACTIVE_CARD = card;
  ACTIVE_STORE_ID = storeId;

  loadComments(card);
}

function closeExpanded() {
  if (!ACTIVE_CARD) return;

  const grid = dom("#storeGrid");

  ACTIVE_CARD.classList.remove("expanded");

  if (OVERLAY?.contains(ACTIVE_CARD)) {
    OVERLAY.removeChild(ACTIVE_CARD);
    grid.appendChild(ACTIVE_CARD);
  }

  ACTIVE_CARD = null;
  ACTIVE_STORE_ID = null;
}

async function loadComments(card) {
  const box = document.createElement("div");
  box.className = "wcl-expanded-panel";
  box.innerHTML = `<p>Loading comments…</p>`;
  card.querySelector(".store-body").appendChild(box);

  const { data } = await supabase
    .from("store_comments")
    .select("*")
    .eq("store_id", ACTIVE_STORE_ID)
    .order("created_at", { ascending: false });

  if (!data?.length) {
    box.innerHTML = "<p>No comments yet.</p>";
    return;
  }

  box.innerHTML = data
    .map(
      (c) => `
      <div class="comment">
        <p>${c.text}</p>
        <small>${new Date(c.created_at).toLocaleString()}</small>
      </div>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".store-card");
    if (!card) return;

    if (e.target.closest("a, button, textarea")) return;

    const storeId = Number(card.dataset.storeId);
    toggleExpanded(card, storeId);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeExpanded();
  });
});
