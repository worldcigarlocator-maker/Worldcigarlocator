// ============================================================
// MODAL.JS — WCL CLEAN MODAL SYSTEM
// Canonical · Standalone · No Global Leaks
// ============================================================

import { supabase } from "./globals.js";
import {
  LAST_RENDERED_STORES,
  getPhotoUrl,
  getFlagUrl,
  buildBadges
} from "./cards.js";

// ============================================================
// STATE
// ============================================================

let MODAL_ACTIVE_STORE_ID = null;
let MODAL_LOAD_SEQ = 0;
let MODAL_USER_TEMP_RATING = 0;
let MODAL_EVENTS_BOUND = false;

// ============================================================
// DOM HELPERS
// ============================================================

const modalEl            = () => document.getElementById("storeModal");
const modalImg           = () => document.getElementById("modalImg");
const modalName          = () => document.getElementById("modalName");
const modalFlag          = () => document.getElementById("modalFlag");
const modalLocation      = () => document.getElementById("modalLocation");
const modalBadges        = () => document.getElementById("modalBadges");
const modalAddress       = () => document.getElementById("modalAddress");
const modalPhone         = () => document.getElementById("modalPhone");
const modalWebsite       = () => document.getElementById("modalWebsite");
const modalStarPicker    = () => document.getElementById("modalStarPicker");
const modalSendRating    = () => document.getElementById("modalSendRating");
const modalComments      = () => document.getElementById("modalComments");
const modalCommentInput  = () => document.getElementById("modalCommentInput");
const modalSendComment   = () => document.getElementById("modalSendComment");
const modalCommentCount  = () => document.getElementById("modalCommentCount");

// ============================================================
// UTIL
// ============================================================

function findStore(storeId) {
  return (LAST_RENDERED_STORES || []).find(
    s => Number(s.id) === Number(storeId)
  ) || null;
}

function lockScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
}

function highlightStars(count) {
  const picker = modalStarPicker();
  if (!picker) return;

  picker.querySelectorAll("span").forEach((s, i) => {
    const active = i < count;
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
  if (modalWebsite()) modalWebsite().style.display = "none";
  if (modalComments()) modalComments().innerHTML = "";
  if (modalCommentInput()) modalCommentInput().value = "";

  const flag = modalFlag();
  if (flag) flag.style.display = "none";

  MODAL_USER_TEMP_RATING = 0;
  highlightStars(0);
}

// ============================================================
// OPEN / CLOSE
// ============================================================

export async function openModal(storeId) {
  const store = findStore(storeId);
  if (!store) return;

  MODAL_ACTIVE_STORE_ID = storeId;
  MODAL_LOAD_SEQ++;
  const seq = MODAL_LOAD_SEQ;

  resetModal();

  modalEl()?.classList.remove("hidden");
  lockScroll(true);

  // Fill from rendered store
  if (modalImg()) modalImg().src = getPhotoUrl(store);
  if (modalName()) modalName().textContent = store.name || "Unnamed";

  const flagUrl = getFlagUrl(store);
  if (flagUrl && modalFlag()) {
    modalFlag().src = flagUrl;
    modalFlag().style.display = "";
  }

  if (modalLocation()) {
    modalLocation().textContent =
      [store.continent, store.country, store.city]
        .filter(Boolean)
        .join(", ");
  }

  if (modalBadges()) modalBadges().innerHTML = buildBadges(store);
  if (modalAddress()) modalAddress().textContent = store.address || "—";
  if (modalPhone()) modalPhone().textContent = store.phone || "—";

  if (store.website && modalWebsite()) {
    modalWebsite().href = store.website;
    modalWebsite().style.display = "inline";
  }

  await Promise.all([
    loadUserRating(storeId, seq),
    loadComments(storeId, seq)
  ]);
}

export function closeModal() {
  modalEl()?.classList.add("hidden");
  lockScroll(false);
  MODAL_ACTIVE_STORE_ID = null;
}

// ============================================================
// RATING
// ============================================================

async function loadUserRating(storeId, seq) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return;

  const { data } = await supabase
    .from("ratings")
    .select("rating")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (seq !== MODAL_LOAD_SEQ) return;

  MODAL_USER_TEMP_RATING = Number(data?.rating) || 0;
  highlightStars(MODAL_USER_TEMP_RATING);
}

async function saveRating() {
  if (!MODAL_ACTIVE_STORE_ID) return;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return alert("Login required.");

  await supabase.from("ratings").upsert({
    store_id: MODAL_ACTIVE_STORE_ID,
    user_id: user.id,
    rating: MODAL_USER_TEMP_RATING
  });
}

// ============================================================
// COMMENTS
// ============================================================

async function loadComments(storeId, seq) {
  const { data } = await supabase
    .from("store_comments")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (seq !== MODAL_LOAD_SEQ) return;

  const comments = data || [];

  if (modalCommentCount()) {
    modalCommentCount().textContent =
      `Comments ${comments.length}`;
  }

  if (!comments.length) return;

  const { data: auth } = await supabase.auth.getUser();
  const currentUser = auth?.user;

  modalComments().innerHTML = comments.map(c => {

    const isOwner =
      currentUser && c.user_id === currentUser.id;

    return `
      <div class="modal-comment">
        <div class="modal-comment-header">
          <span class="modal-comment-author">
            ${c.user_name || "Anonymous"}
          </span>
          <div class="modal-comment-meta">
            <span class="modal-comment-date">
              ${new Date(c.created_at).toLocaleDateString()}
            </span>
            ${
              isOwner
                ? `<button class="modal-comment-delete" data-id="${c.id}">
                    Delete
                   </button>`
                : ""
            }
          </div>
        </div>
        <div class="modal-comment-text">
          ${c.comment || ""}
        </div>
      </div>
    `;
  }).join("");
}

async function submitComment() {
  if (!MODAL_ACTIVE_STORE_ID) return;

  const text = modalCommentInput()?.value.trim();
  if (!text) return;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return alert("Login required.");

  await supabase.from("store_comments").insert({
    store_id: MODAL_ACTIVE_STORE_ID,
    user_id: user.id,
    user_name: user.email,
    comment: text
  });

  modalCommentInput().value = "";

  MODAL_LOAD_SEQ++;
  loadComments(MODAL_ACTIVE_STORE_ID, MODAL_LOAD_SEQ);
}

// ============================================================
// EVENTS
// ============================================================

function bindEvents() {
  if (MODAL_EVENTS_BOUND) return;
  MODAL_EVENTS_BOUND = true;

  document.addEventListener("click", async (e) => {

    if (e.target.closest(".modal-close") ||
        e.target.classList.contains("modal-backdrop")) {
      closeModal();
    }

    if (e.target.closest("#modalSendRating")) {
      await saveRating();
    }

    if (e.target.closest("#modalSendComment")) {
      await submitComment();
    }

    const del = e.target.closest(".modal-comment-delete");
    if (del) {
      await supabase
        .from("store_comments")
        .delete()
        .eq("id", del.dataset.id);

      MODAL_LOAD_SEQ++;
      loadComments(MODAL_ACTIVE_STORE_ID, MODAL_LOAD_SEQ);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  modalStarPicker()?.querySelectorAll("span").forEach(star => {
    star.addEventListener("click", () => {
      const val = Number(star.dataset.val) || 0;
      MODAL_USER_TEMP_RATING =
        MODAL_USER_TEMP_RATING === val ? 0 : val;
      highlightStars(MODAL_USER_TEMP_RATING);
    });
  });
}

document.addEventListener("DOMContentLoaded", bindEvents);
