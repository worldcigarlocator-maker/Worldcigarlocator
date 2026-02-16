// ============================================================
// CARDS-CORE.JS — WCL Frontend (CANONICAL CORE)
// ============================================================

import { supabase } from "./globals.js";

/* ============================================================
   SAFE ANALYTICS
============================================================ */
const VIEW_OBSERVER =
  window?.WCL_ANALYTICS?.VIEW_OBSERVER ?? { observe() {}, unobserve() {} };

const dom = (sel) => document.querySelector(sel);

const FALLBACK_IMAGE = "images/store.jpg";
const PHOTO_PROXY_BASE =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co";

/* ============================================================
   STATE / MASTER
============================================================ */

export const MASTER = {
  IDLE: "idle",
  SEARCH: "search",
  LOCATION: "location",
};

let MASTER_MODE = MASTER.IDLE;

const STATE = {
  location: { continent: null, country: null, state: null, city: null },
  search: { text: "" },
  chips: { type: null, access: null },
};

let RUN_SEQ = 0;
let ACTIVE_REQUEST = 0;

/* ============================================================
   HELPERS
============================================================ */

function getPhotoUrl(store) {
  if (store.photo_cdn_url) return store.photo_cdn_url;
  if (store.photo_url) return store.photo_url;

  if (store.photo_reference) {
    return `${PHOTO_PROXY_BASE}/photo-proxy?photo_reference=${encodeURIComponent(
      store.photo_reference
    )}&maxwidth=800`;
  }

  return FALLBACK_IMAGE;
}

function getFlagUrl(store) {
  const iso = store.country_iso2?.toLowerCase();
  if (!iso) return null;
  return `assets/flags/${iso}.svg`;
}

function buildBadges(store) {
  const badges = [];
  const arr = Array.isArray(store.types)
    ? store.types.map((t) => String(t).toLowerCase())
    : [];

  if (arr.includes("store"))
    badges.push(`<span class="badge badge-store">Store</span>`);
  if (arr.includes("lounge"))
    badges.push(`<span class="badge badge-lounge">Lounge</span>`);

  return badges.join(" ");
}

function buildStars(avg, count) {
  const v = Number(avg) || 0;
  const f = "★".repeat(Math.round(v));
  const e = "☆".repeat(5 - Math.round(v));
  return `
    <div class="stars-row">
      <span class="stars">${f}${e}</span>
      <span class="rating-count">(${count || 0})</span>
    </div>`;
}

/* ============================================================
   CARD HTML
============================================================ */

function cardHTML(s) {
  const img = getPhotoUrl(s);
  const flag = getFlagUrl(s);

  return `
  <article class="store-card" data-store-id="${s.id}">
    <img src="${img}" class="store-img" alt="${s.name}" />
    <div class="store-body">
      <h3 class="store-title">${s.name}</h3>
      <div class="badge-row">${buildBadges(s)}</div>
      ${buildStars(s.rating_avg, s.rating_count)}

      <div class="locrow">
        <div class="loc-top">
          ${flag ? `<img src="${flag}" class="flag" />` : ""}
          <span>${s.country || ""}</span>
        </div>
        <p class="city-label">${s.city || ""}</p>
      </div>

      <div class="infoblock">
        <p><strong>Address:</strong> ${s.address || "—"}</p>
        <p><strong>Phone:</strong> ${s.phone || "—"}</p>
      </div>

      <button class="reviews-btn" type="button">Comments</button>
    </div>
  </article>`;
}

/* ============================================================
   RENDER
============================================================ */

export function renderStores(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.innerHTML = (list || []).map(cardHTML).join("");

  grid.querySelectorAll(".store-card").forEach((card) => {
    VIEW_OBSERVER.observe(card);
  });
}

/* ============================================================
   RPC SEARCH
============================================================ */

export async function loadStores(filters = {}) {
  ACTIVE_REQUEST++;
  const reqId = ACTIVE_REQUEST;

  const { data, error } = await supabase.rpc("search_stores_v1", {
    p_q: STATE.search.text || null,
    p_continent: filters?.continent || null,
    p_country: filters?.country || null,
    p_state: filters?.state || null,
    p_city: filters?.city || null,
  });

  if (reqId !== ACTIVE_REQUEST) return null;

  if (error) return { error };
  return { data: data || [] };
}
