// ============================================================
// favorites.js — WCL FAVORITES SYSTEM
// Canonical · Synced Cards + Modal + Account
// ============================================================

import { supabase } from "/js/globals.js";

// ============================================================
// STATE
// ============================================================

const FAVORITES = new Set();

let FAVORITES_READY = false;

// ============================================================
// HELPERS
// ============================================================

function normalizeId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function isFavorite(storeId) {
  const id = normalizeId(storeId);
  if (!id) return false;

  return FAVORITES.has(id);
}

// ============================================================
// LOAD FAVORITES
// ============================================================

export async function loadFavorites() {

  FAVORITES.clear();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    FAVORITES_READY = true;
    syncFavoriteUI();
    return;
  }

  const { data, error } =
    await supabase
      .from("store_favorites")
      .select("store_id")
      .eq("user_id", user.id);

  if (error) {
    console.error(
      "loadFavorites error:",
      error
    );

    FAVORITES_READY = true;
    syncFavoriteUI();

    return;
  }

  (data || []).forEach((row) => {

    const id = normalizeId(row.store_id);

    if (id) {
      FAVORITES.add(id);
    }

  });

  FAVORITES_READY = true;

  syncFavoriteUI();
}

// ============================================================
// TOGGLE FAVORITE
// ============================================================

export async function toggleFavorite(storeId) {

  const id = normalizeId(storeId);

  if (!id) return false;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Please login first");
    return false;
  }

  // ============================================================
  // REMOVE
  // ============================================================

  if (FAVORITES.has(id)) {

    const { error } =
      await supabase
        .from("store_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("store_id", id);

    if (error) {
      console.error(
        "remove favorite error:",
        error
      );

      return false;
    }

    FAVORITES.delete(id);

    syncFavoriteUI(id);

    return false;
  }

  // ============================================================
  // ADD
  // ============================================================

  const { error } =
    await supabase
      .from("store_favorites")
      .insert({
        user_id: user.id,
        store_id: id
      });

  if (error) {

    console.error(
      "add favorite error:",
      error
    );

    return false;
  }

  FAVORITES.add(id);

  syncFavoriteUI(id);

  return true;
}

// ============================================================
// SYNC UI
// ============================================================

export function syncFavoriteUI(activeStoreId = null) {

  if (!FAVORITES_READY) return;

  // ============================================================
  // CARD HEARTS
  // ============================================================

  document
    .querySelectorAll(".favorite-btn")
    .forEach((btn) => {

      const id =
        normalizeId(btn.dataset.storeId);

      if (!id) return;

      btn.classList.toggle(
        "active",
        FAVORITES.has(id)
      );
    });

  // ============================================================
  // MODAL HEART
  // ============================================================

  const modalBtn =
    document.getElementById(
      "modalFavoriteBtn"
    );

  if (!modalBtn) return;

  const modalStoreId =
    normalizeId(
      activeStoreId ||
      modalBtn.dataset.storeId
    );

  if (!modalStoreId) {
    modalBtn.classList.remove("active");
    return;
  }

  modalBtn.classList.toggle(
    "active",
    FAVORITES.has(modalStoreId)
  );
}

// ============================================================
// CARD HEART EVENTS
// ============================================================

function bindCardFavorites() {

  document.addEventListener(
    "click",
    async (e) => {

      const btn =
        e.target.closest(".favorite-btn");

      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const storeId =
        btn.dataset.storeId;

      await toggleFavorite(storeId);
    }
  );
}

// ============================================================
// MODAL HEART EVENTS
// ============================================================

function bindModalFavorites() {

  document.addEventListener(
    "click",
    async (e) => {

      const btn =
        e.target.closest(
          "#modalFavoriteBtn"
        );

      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const storeId =
        btn.dataset.storeId;

      if (!storeId) return;

      await toggleFavorite(storeId);
    }
  );
}

// ============================================================
// INIT
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    bindCardFavorites();

    bindModalFavorites();

    await loadFavorites();
  }
);
