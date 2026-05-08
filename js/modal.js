// ============================================================
// MODAL.JS — WCL CLEAN MODAL SYSTEM (ENTERPRISE LOCKED)
// Canonical · RPC-Only · Backend Authority · No Table Access
// ============================================================

import { supabase } from "/js/globals.js";
import { getLastRenderedStores } from "./cards.js";
import { getPhotoUrl, getFlagUrl, buildBadges } from "./store-ui.js";
import { trackEvent } from "./analytics-tracker.js";


// ============================================================
// STATE
// ============================================================

let MODAL_ACTIVE_STORE_ID = null;
let MODAL_LOAD_SEQ = 0;
let MODAL_USER_TEMP_RATING = 0;
let MODAL_EVENTS_BOUND = false;
let MODAL_REPLY_TO = null;

// ============================================================
// REPORT UI STATE
// ============================================================

let REPORT_SELECTED = new Set();

const reportSection = () => document.getElementById("modalReportSection");
const reportChips = () => document.querySelectorAll(".report-chip");
const reportTextarea = () => document.getElementById("modalReportMessage");
const reportSubmit = () => document.getElementById("modalSubmitReport");

function resetReportUI() {
  REPORT_SELECTED.clear();

  reportChips().forEach((chip) =>
    chip.classList.remove("active")
  );

  if (reportTextarea()) {
    reportTextarea().classList.add("hidden");
    reportTextarea().value = "";
  }

  if (reportSubmit()) {
    reportSubmit().disabled = true;
  }
}

function updateReportUI() {
  const hasSelection = REPORT_SELECTED.size > 0;

  if (reportSubmit()) {
    reportSubmit().disabled = !hasSelection;
  }

  if (reportTextarea()) {
    if (REPORT_SELECTED.has("other")) {
      reportTextarea().classList.remove("hidden");
    } else {
      reportTextarea().classList.add("hidden");
      reportTextarea().value = "";
    }
  }
}
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
const modalDirections   = () => el("modalDirections");
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

  const dir = modalDirections();
  if (dir) {
    dir.href = "#";
    dir.style.display = "none";
  }

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
  if (modalCommentCount()) modalCommentCount().textContent = "Comments 0";

  MODAL_USER_TEMP_RATING = 0;
  highlightStars(0);
}

// ============================================================
// OPEN / CLOSE
// ============================================================

export async function openModal(storeInput) {
  console.log("OPEN MODAL CALLED", storeInput);

  const inputId =
    typeof storeInput === "object" && storeInput !== null
      ? Number(storeInput.id)
      : Number(storeInput);

  if (!inputId) return;

  const inputSource =
    typeof storeInput === "object" && storeInput !== null
      ? storeInput.source || null
      : null;

  let store = findStore(inputId);

  // ============================================================
  // RPC FALLBACK / AUTHORITATIVE LOAD
  // ============================================================

  if (!store) {

    const { data, error } = await supabase.rpc(
      "modal_store_card_v1",
      { p_store_id: inputId }
    );

    if (error) {
      console.error(
        "modal_store_card_v1 error:",
        error
      );

      return;
    }

    if (!data || !data.length) return;

    store = data[0];
  }

  if (!store) return;

  const storeId = Number(store.id);

  if (!storeId) return;

  // ============================================================
  // SOURCE LOCK
  // ============================================================

  const MODAL_SOURCE =
    inputSource ||
    store.source ||
    window.CURRENT_SOURCE ||
    window.MODAL_SOURCE ||
    "direct";

  window.MODAL_SOURCE = MODAL_SOURCE;

  // ============================================================
  // ANALYTICS
  // ============================================================

 window.WCL_ANALYTICS?.send?.(
    "store_opened",
    {
      store_id: storeId,
      country: store.country || null,
      city: store.city || null,
      source: MODAL_SOURCE
    }
  );

  trackEvent("store_view", {
    store_id: storeId,
    country: store.country || null,
    city: store.city || null,
    source: MODAL_SOURCE,
    session_hash:
      localStorage.getItem("wcl_session")
  });

  // ============================================================
  // MODAL STATE
  // ============================================================

  MODAL_ACTIVE_STORE_ID = storeId;

  MODAL_LOAD_SEQ++;

  const seq = MODAL_LOAD_SEQ;

  const m = modalEl();

  if (!m) return;

  resetModal();

  m.classList.remove("hidden");

  lockScroll(true);

  // ============================================================
  // FAVORITE BUTTON
  // ============================================================

  const favoriteBtn =
    document.getElementById(
      "modalFavoriteBtn"
    );

  if (favoriteBtn) {
    favoriteBtn.dataset.storeId = storeId;
  }

  if (window.syncFavoriteUI) {
    window.syncFavoriteUI(storeId);
  }

  // ============================================================
  // STATIC DATA
  // ============================================================

  if (modalName()) {
    modalName().textContent =
      store.name || "Unnamed";
  }

  if (modalImg()) {
    modalImg().src = getPhotoUrl(store);
  }

  const flagUrl = getFlagUrl(store);

  if (modalFlag() && flagUrl) {

    modalFlag().src = flagUrl;

    modalFlag().style.display = "";
  }

  if (modalLocation()) {

    modalLocation().textContent =
      [
        store.continent,
        store.country,
        store.city
      ]
        .filter(Boolean)
        .join(", ");
  }

  if (modalBadges()) {
    modalBadges().innerHTML =
      buildBadges(store);
  }

  if (modalAddress()) {
    modalAddress().textContent =
      store.address || "—";
  }

  if (modalPhone()) {
    modalPhone().textContent =
      store.phone || "—";
  }

  // ============================================================
  // WEBSITE
  // ============================================================

  if (modalWebsite() && store.website) {

    const link = modalWebsite();

    link.href =
      `https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/visit-store?store_id=${store.id}`;

    link.style.display = "inline";

    link.onclick = (e) => {

      e.preventDefault();

      trackEvent(
        "website_clicked",
        {
          store_id: Number(store.id),
          country: store.country || null,
          city: store.city || null,
          source: window.MODAL_SOURCE
        }
      );

      setTimeout(() => {

        window.open(
          link.href,
          "_blank"
        );

      }, 120);
    };
  }

  // ============================================================
  // DIRECTIONS
  // ============================================================

  const dir = modalDirections();

  if (dir && store.place_id) {

    const name =
      encodeURIComponent(
        store.name || "Destination"
      );

    dir.href =
      `https://www.google.com/maps/dir/?api=1&destination=${name}&destination_place_id=${store.place_id}`;

    dir.style.display = "inline";
  }

  // ============================================================
  // META
  // ============================================================

  const { data: meta, error } =
    await supabase.rpc(
      "modal_store_meta_v1",
      {
        p_store_id:
          MODAL_ACTIVE_STORE_ID
      }
    );

  if (seq !== MODAL_LOAD_SEQ) return;

  if (!error && meta && meta.length) {

    const row = meta[0];

    if (modalCommentCount()) {

      modalCommentCount().textContent =
        `Comments ${row.comment_count || 0}`;
    }

    MODAL_USER_TEMP_RATING =
      row.user_rating || 0;

    highlightStars(
      MODAL_USER_TEMP_RATING
    );
  }

  await loadComments(
    MODAL_ACTIVE_STORE_ID,
    seq
  );
}

export function closeModal() {

  const m = modalEl();

  if (!m) return;

  m.classList.add("hidden");

  lockScroll(false);

  resetReportUI();

  reportSection()?.classList.add(
    "hidden"
  );

  const favoriteBtn =
    document.getElementById(
      "modalFavoriteBtn"
    );

  if (favoriteBtn) {
    favoriteBtn.removeAttribute(
      "data-store-id"
    );
  }

  MODAL_ACTIVE_STORE_ID = null;

  MODAL_USER_TEMP_RATING = 0;
}

// ============================================================
// RATING (RPC ONLY)
// ============================================================

async function saveRating() {
  if (!MODAL_ACTIVE_STORE_ID) return;

  const { error } = await supabase.rpc("modal_save_rating_v1", {
    p_store_id: MODAL_ACTIVE_STORE_ID,
    p_rating: Number(MODAL_USER_TEMP_RATING) || 0,
  });

  if (error) {
    console.error("modal_save_rating_v1 error:", error);
  }
}

// ============================================================
// COMMENTS (RPC ONLY)
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
    console.error("modal_load_comments_v1 error:", error);
    if (modalCommentCount()) {
      modalCommentCount().textContent = "Comments 0";
    }
    return;
  }

  const comments = data || [];

  if (modalCommentCount()) {
    modalCommentCount().textContent = `Comments ${comments.length}`;
  }

  if (!comments.length) return;

  // ============================================================
  // BUILD TREE
  // ============================================================

  const map = {};
  const roots = [];

  comments.forEach((c) => {
    c.children = [];
    map[c.id] = c;
  });

  comments.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(c);
    } else {
      roots.push(c);
    }
  });

  // sort roots (newest first)
  roots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // sort replies (oldest first)
  Object.values(map).forEach((c) => {
    if (c.children?.length) {
      c.children.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    }
  });

  // ============================================================
  // RENDER
  // ============================================================

  function renderComment(c, isReply = false) {
    const name = c.display_name || "Anonymous";

    return `
      <div class="modal-comment ${isReply ? "reply" : ""}">

        <div class="modal-comment-header">
          <div class="modal-comment-user">
            ${name}
          </div>

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

        <div class="modal-comment-text" data-id="${c.id}">
          ${c.comment || ""}
        </div>

        <div class="modal-comment-actions">
          <button class="modal-comment-reply" data-id="${c.id}">
            Reply
          </button>

          <button class="modal-comment-translate" data-id="${c.id}">
            Translate
          </button>
        </div>

      </div>
    `;
  }

  let html = "";

  roots.forEach((root) => {
    html += renderComment(root, false);

    if (root.children?.length) {
      root.children.forEach((child) => {
        html += renderComment(child, true);
      });
    }
  });

  box.innerHTML = html;
}
// ============================================================
// SUBMIT COMMENT
// ============================================================

async function submitComment() {
  if (!MODAL_ACTIVE_STORE_ID) return;

  const input = modalCommentInput();
  const text = input?.value?.trim() || "";
  if (!text) return;

  const { error } = await supabase.rpc("modal_add_comment_v1", {
    p_store_id: MODAL_ACTIVE_STORE_ID,
    p_comment: text,
    p_parent_id: MODAL_REPLY_TO,
  });

  if (error) {
    console.error("modal_add_comment_v1 error:", error);
    return;
  }

  if (input) input.value = "";

  // reset reply state
  MODAL_REPLY_TO = null;

  if (modalCommentInput()) {
    modalCommentInput().placeholder = "Write a comment...";
  }

  MODAL_LOAD_SEQ++;
  loadComments(MODAL_ACTIVE_STORE_ID, MODAL_LOAD_SEQ);
}
// ============================================================
// REPORT ISSUE (EDGE ARRAY VERSION)
// ============================================================

async function submitReportIssue() {
  if (!MODAL_ACTIVE_STORE_ID) return;
  if (REPORT_SELECTED.size === 0) return;

  const types = Array.from(REPORT_SELECTED);

  const message =
    REPORT_SELECTED.has("other") && reportTextarea()
      ? reportTextarea().value.trim()
      : null;

  try {
    const { error } = await supabase.functions.invoke(
      "submit_store_report_v1",
      {
        body: {
          store_id: MODAL_ACTIVE_STORE_ID,
          report_types: types,
          message: message || null,
        },
      }
    );

    if (error) {
      console.error("submit_store_report_v1 error:", error);
      return;
    }

    resetReportUI();
    reportSection()?.classList.add("hidden");

const btn = reportSubmit();
if (btn) {
  btn.classList.add("success");
  btn.textContent = "Report submitted ✓";
  btn.disabled = true;

  setTimeout(() => {
    btn.classList.remove("success");
    btn.textContent = "Submit report";
    btn.disabled = true;
    reportSection()?.classList.add("hidden");
    resetReportUI();
  }, 1800);
}

  } catch (err) {
    console.error("submit_store_report_v1 exception:", err);
  }
}

// ============================================================
// EVENTS (BOUND ONCE)
// ============================================================

function bindEvents() {
  if (MODAL_EVENTS_BOUND) return;
  MODAL_EVENTS_BOUND = true;

  document.addEventListener("click", async (e) => {

    // ============================================================
    // CLOSE
    // ============================================================

    if (e.target.closest(".modal-close") ||
        e.target.classList.contains("modal-backdrop")) {
      closeModal();
      return;
    }

    // ============================================================
    // RATING
    // ============================================================

    if (e.target.closest("#modalSendRating")) {
      await saveRating();
      return;
    }

    // ============================================================
    // COMMENT SUBMIT
    // ============================================================

    if (e.target.closest("#modalSendComment")) {
      await submitComment();
      return;
    }

   // ============================================================
// COLLAPSE THREAD
// ============================================================

const header =
  e.target.closest(".modal-comment-header");

const isActionButton =
  e.target.closest(".modal-comment-actions");

if (
  header &&
  !isActionButton &&
  !e.target.closest(".modal-comment-delete")
) {

  const parent =
    header.closest(".modal-comment");

  if (!parent) return;

  const next = parent.nextElementSibling;

  if (next && next.classList.contains("reply")) {

    parent.classList.toggle("collapsed");

    let el = parent.nextElementSibling;

    while (el && el.classList.contains("reply")) {

      el.style.display =
        parent.classList.contains("collapsed")
          ? "none"
          : "";

      el = el.nextElementSibling;
    }
  }

  return;
}

    // ============================================================
    // FAVORITE TOGGLE
    // ============================================================

    if (e.target.closest("#modalFavoriteBtn")) {

      const btn =
        document.getElementById(
          "modalFavoriteBtn"
        );

      const storeId =
        Number(btn?.dataset.storeId);

      if (!storeId) return;

      const isActive =
        btn.classList.contains("active");

      if (isActive) {

        const { error } =
          await supabase.rpc(
            "remove_store_favorite_v1",
            {
              p_store_id: storeId
            }
          );

        if (error) {
          console.error(
            "remove_store_favorite_v1 error:",
            error
          );

          return;
        }

      } else {

        const { error } =
          await supabase.rpc(
            "save_store_favorite_v1",
            {
              p_store_id: storeId
            }
          );

        if (error) {
          console.error(
            "save_store_favorite_v1 error:",
            error
          );

          return;
        }
      }

      if (window.syncFavoriteUI) {
        window.syncFavoriteUI(storeId);
      }

      return;
    }

    // ============================================================
    // REPORT TOGGLE
    // ============================================================

    if (e.target.closest("#modalReportIssue")) {
      const section = reportSection();
      if (!section) return;

      section.classList.toggle("hidden");
      resetReportUI();
      return;
    }

    // ============================================================
    // REPORT CHIPS
    // ============================================================

    const chip = e.target.closest(".report-chip");
    if (chip) {
      const type = chip.dataset.type;
      if (!type) return;

      if (REPORT_SELECTED.has(type)) {
        REPORT_SELECTED.delete(type);
        chip.classList.remove("active");
      } else {
        REPORT_SELECTED.add(type);
        chip.classList.add("active");
      }

      updateReportUI();
      return;
    }

    // ============================================================
    // REPORT SUBMIT
    // ============================================================

    if (e.target.closest("#modalSubmitReport")) {
      await submitReportIssue();
      return;
    }

    // ============================================================
    // DELETE COMMENT
    // ============================================================

    const del = e.target.closest(".modal-comment-delete");
    if (del && del.dataset.id) {
      const { error } = await supabase.rpc("modal_delete_comment_v1", {
        p_comment_id: Number(del.dataset.id),
      });

      if (!error) {
        MODAL_LOAD_SEQ++;
        loadComments(MODAL_ACTIVE_STORE_ID, MODAL_LOAD_SEQ);
      }

      return;
    }

    // ============================================================
    // REPLY
    // ============================================================

    const reply = e.target.closest(".modal-comment-reply");

    if (reply && reply.dataset.id) {
      MODAL_REPLY_TO = Number(reply.dataset.id);

      const input = modalCommentInput();
      if (input) {
        input.focus();
        input.placeholder = "Reply...";
      }

      return;
    }

    // ============================================================
    // TRANSLATE
    // ============================================================

        // TRANSLATE
    const translate = e.target.closest(".modal-comment-translate");

    if (translate && translate.dataset.id) {

      const id = Number(translate.dataset.id);

      const el = modalComments()?.querySelector(
        `.modal-comment-text[data-id="${id}"]`
      );

      if (!el) return;

      // toggle back
      if (el.dataset.translated === "true") {
        el.textContent = el.dataset.original;
        el.dataset.translated = "false";
        return;
      }

      const original = el.textContent;

      el.dataset.original = original;

      el.textContent = "Translating...";

      const { data, error } = await supabase.functions.invoke(
        "translate_comment_v1",
        {
          body: {
            text: original,
          },
        }
      );

      if (error) {
        console.error(error);
        el.textContent = original;
        return;
      }

      el.textContent =
        data?.translated || original;

      el.dataset.translated = "true";

      return;
    }

  });

  // ============================================================
  // ESC CLOSE
  // ============================================================

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // ============================================================
  // STAR PICKER
  // ============================================================

  const picker = modalStarPicker();
  if (picker) {
    picker.querySelectorAll("span").forEach((star) => {
      star.addEventListener("click", () => {
        const val = Number(star.dataset.val) || 0;

        MODAL_USER_TEMP_RATING =
          MODAL_USER_TEMP_RATING === val ? 0 : val;

        highlightStars(MODAL_USER_TEMP_RATING);
      });
    });
  }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", bindEvents);
