// ============================================================
// MODAL.JS — WCL CLEAN MODAL SYSTEM
// Canonical · Standalone · No Global Leaks
// ============================================================

import { supabase } from "./globals.js";
import { getLastRenderedStores } from "./cards.js";
import { getPhotoUrl, getFlagUrl, buildBadges } from "./store-ui.js";

// ============================================================
// STATE
// ============================================================

let MODAL_ACTIVE_STORE_ID = null;
let MODAL_LOAD_SEQ = 0;
let MODAL_USER_TEMP_RATING = 0;

let MODAL_EVENTS_BOUND = false;

// Admin (optional) — add your email(s) here
const ADMIN_EMAILS = new Set([
  // "you@worldcigarlocator.com",
]);

// ============================================================
// DOM HELPERS
// ============================================================

const el = (id) => document.getElementById(id);

const modalEl           = () => el("storeModal");
const modalImg          = () => el("modalImg");
const modalName         = () => el("modalName");
const modalFlag         = () => el("modalFlag");
const modalLocation     = () => el("modalLocation");
const modalBadges       = () => el("modalBadges");
const modalAddress      = () => el("modalAddress");
const modalPhone        = () => el("modalPhone");
const modalWebsite      = () => el("modalWebsite");
const modalStarPicker   = () => el("modalStarPicker");
const modalSendRating   = () => el("modalSendRating");
const modalComments     = () => el("modalComments");
const modalCommentInput = () => el("modalCommentInput");
const modalSendComment  = () => el("modalSendComment");
const modalCommentCount = () => el("modalCommentCount");

// ============================================================
// UTIL
// ============================================================

function findStore(storeId) {
  const list = getLastRenderedStores() || [];
  const id = Number(storeId);
  if (!id) return null;
  return list.find((s) => Number(s?.id) === id) || null;
}

function lockScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
}

function highlightStars(count) {
  const picker = modalStarPicker();
  if (!picker) return;

  const n = Number(count) || 0;
  picker.querySelectorAll("span").forEach((s, i) => {
    const active = i < n;
    s.textContent = active ? "★" : "☆";
    s.classList.toggle("active", active);
  });
}

function resetModal() {
  if (modalImg()) modalImg().src = "";
  if (modalName()) modalName().textContent = "";
  if (modalLocation()) modalLocation().textContent = "";
  if (modalBadges()) modalBadges().innerHTML = "";
  if (modalAddress()) modalAddress().textContent = "";
  if (modalPhone()) modalPhone().textContent = "";

  const web = modalWebsite();
  if (web) {
    web.href = "#";
    web.style.display = "none";
  }

  const flag = modalFlag();
  if (flag) {
    flag.removeAttribute("src");
    flag.style.display = "none";
  }

  if (modalComments()) modalComments().innerHTML = "";
  if (modalCommentInput()) modalCommentInput().value = "";

  MODAL_USER_TEMP_RATING = 0;
  highlightStars(0);

  if (modalCommentCount()) modalCommentCount().textContent = "Comments 0";
}

// ============================================================
// OPEN / CLOSE
// ============================================================

export async function openModal(storeId) {
  const store = findStore(storeId);
  if (!store) return;

  MODAL_ACTIVE_STORE_ID = Number(storeId);
  MODAL_LOAD_SEQ++;
  const seq = MODAL_LOAD_SEQ;

  const m = modalEl();
  if (!m) return;

  resetModal();

  m.classList.remove("hidden");
  lockScroll(true);

  // Fill from rendered store (canonical)
  const nameEl = modalName();
  if (nameEl) nameEl.textContent = store.name || "Unnamed";

  const imgEl = modalImg();
  if (imgEl) imgEl.src = getPhotoUrl(store);

  const flagUrl = getFlagUrl(store);
  const flagEl = modalFlag();
  if (flagEl && flagUrl) {
    flagEl.src = flagUrl;
    flagEl.style.display = "";
  }

  const locEl = modalLocation();
  if (locEl) {
    locEl.textContent = [store.continent, store.country, store.city]
      .filter(Boolean)
      .join(", ");
  }

  const badgesEl = modalBadges();
  if (badgesEl) badgesEl.innerHTML = buildBadges(store);

  const addrEl = modalAddress();
  if (addrEl) addrEl.textContent = store.address || "—";

  const phoneEl = modalPhone();
  if (phoneEl) phoneEl.textContent = store.phone || "—";

  const web = modalWebsite();
  if (web && store.website) {
    web.href = store.website;
    web.style.display = "inline";
  }

  await Promise.all([
    loadUserRating(MODAL_ACTIVE_STORE_ID, seq),
    loadComments(MODAL_ACTIVE_STORE_ID, seq),
  ]);
}

export function closeModal() {
  const m = modalEl();
  if (!m) return;

  m.classList.add("hidden");
  lockScroll(false);

  MODAL_ACTIVE_STORE_ID = null;
  MODAL_USER_TEMP_RATING = 0;
}

// ============================================================
// RATING
// ============================================================

async function loadUserRating(storeId, seq) {
  try {
    const { data, error } = await supabase.rpc("modal_load_comments_v1", {
      p_store_id: storeId,
    });

    if (seq !== MODAL_LOAD_SEQ) return;
    if (error) {
      console.error("loadUserRating error:", error);
      highlightStars(0);
      return;
    }

    // rating is not returned here anymore
    // ratings are handled separately via save RPC
    highlightStars(0);

  } catch (err) {
    console.error("loadUserRating fatal:", err);
  }
}

async function saveRating() {
  if (!MODAL_ACTIVE_STORE_ID) return;

  const { error } = await supabase.rpc("modal_save_rating_v1", {
    p_store_id: MODAL_ACTIVE_STORE_ID,
    p_rating: Number(MODAL_USER_TEMP_RATING) || 0,
  });

  if (error) {
    console.error("save rating error:", error);
  }
}

// ============================================================
// COMMENTS
// ============================================================

async function loadComments(storeId, seq) {
  const box = modalComments();
  if (!box) return;

  box.innerHTML = "";

  const { data, error } = await supabase.rpc("modal_load_comments_v1", {
    p_store_id: storeId,
  });

  if (seq !== MODAL_LOAD_SEQ) return;

  if (error) {
    console.error("loadComments error:", error);
    if (modalCommentCount()) modalCommentCount().textContent = "Comments 0";
    return;
  }

  const comments = data || [];

  if (modalCommentCount()) {
    modalCommentCount().textContent = `Comments ${comments.length}`;
  }

  if (!comments.length) return;

  box.innerHTML = comments
    .map((c) => {
      return `
        <div class="modal-comment">
          <div class="modal-comment-header">
            <div class="modal-comment-meta">
              <span class="modal-comment-date">
                ${new Date(c.created_at).toLocaleDateString()}
              </span>
              ${
                c.is_owner
                  ? `<button class="modal-comment-delete" data-id="${c.id}">Delete</button>`
                  : ""
              }
            </div>
          </div>

          <div class="modal-comment-text">${c.comment || ""}</div>
        </div>
      `;
    })
    .join("");
}

async function submitComment() {
  if (!MODAL_ACTIVE_STORE_ID) return;

  const input = modalCommentInput();
  const text = input?.value?.trim() || "";
  if (!text) return;

  const { error } = await supabase.rpc("modal_add_comment_v1", {
    p_store_id: MODAL_ACTIVE_STORE_ID,
    p_comment: text,
  });

  if (error) {
    console.error("submitComment error:", error);
    alert("Could not post comment.");
    return;
  }

  if (input) input.value = "";

  MODAL_LOAD_SEQ++;
  loadComments(MODAL_ACTIVE_STORE_ID, MODAL_LOAD_SEQ);
}


// ============================================================
// EVENTS (bound once)
// ============================================================

function bindEvents() {
  if (MODAL_EVENTS_BOUND) return;
  MODAL_EVENTS_BOUND = true;

  document.addEventListener("click", async (e) => {
    // Close
    if (e.target.closest(".modal-close") || e.target.classList.contains("modal-backdrop")) {
      closeModal();
      return;
    }

    // Submit rating
    if (e.target.closest("#modalSendRating")) {
      await saveRating();
      return;
    }

    // Submit comment
    if (e.target.closest("#modalSendComment")) {
      await submitComment();
      return;
    }

    // Delete comment
   const del = e.target.closest(".modal-comment-delete");
if (del && del.dataset.id) {
  const { error } = await supabase.rpc("modal_delete_comment_v1", {
    p_comment_id: Number(del.dataset.id),
  });

      if (error) {
        console.error("delete comment error:", error);
        return;
      }

      MODAL_LOAD_SEQ++;
      loadComments(MODAL_ACTIVE_STORE_ID, MODAL_LOAD_SEQ);
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Stars
  const picker = modalStarPicker();
  if (picker) {
    picker.querySelectorAll("span").forEach((star) => {
      star.addEventListener("click", () => {
        const val = Number(star.dataset.val) || 0;
        MODAL_USER_TEMP_RATING = MODAL_USER_TEMP_RATING === val ? 0 : val;
        highlightStars(MODAL_USER_TEMP_RATING);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", bindEvents);
