/* ============================================================
   WCL — STORES V2 (STORE PERFORMANCE ENGINE)
   ============================================================ */
import { supabase } from "/js/globals.js";
const sb = supabase;

console.log("🔥 STORES V2 LOADED");
/* ============================================================
   STATE
   ============================================================ */

const STORES_STATE = {
  level: "store",   // store → city → traffic
  storeId: null,
  city: null,
  country: null,
  days: 30
   sort: "views"
};

/* ============================================================
   DOM
   ============================================================ */

function getBody() {
  return document.getElementById("marketDemandBody");
}

function getMarketPanel() {
  return document.querySelector("#view-market .panel");
}

function ensureStoresSurface() {
  const marketView = document.getElementById("view-market");
  if (marketView) marketView.classList.remove("hidden");

  const heatmap = document.querySelector("#view-market .panel:first-of-type");
  if (heatmap) heatmap.style.display = "none";

  const panel = getMarketPanel();
  if (panel) {
    panel.style.display = "block";

    const head = panel.querySelector(".panelhead h2");
    if (head) head.textContent = "Top Stores";

    const thead = panel.querySelector("thead");
    if (thead) {
  thead.innerHTML = `
    <tr>

  <th data-sort="name">
    Store
  </th>

  <th class="num" data-sort="views">
    Views
  </th>

  <th class="num" data-sort="clicks">
    Clicks
  </th>

  <th class="num" data-sort="ctr">
    CTR
  </th>

  <th class="num" data-sort="favorites">
    Favorites
  </th>

  <th class="num" data-sort="avg_rating">
    Rating
  </th>

  <th class="num" data-sort="ratings_count">
    Ratings
  </th>

  <th class="num" data-sort="comments_count">
    Comments
  </th>

</tr>
  `;
}
  }
}

/* ============================================================
   HELPERS
   ============================================================ */

function renderEmpty(msg, colspan = 4) {
  const tbody = getBody();
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="muted center">${msg}</td>
    </tr>
  `;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ============================================================
   CLICK HANDLER
   ============================================================ */

function bindClicks(days) {
  const tbody = getBody();
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(row => {

    row.onclick = async () => {

      // STORE → CITY
      if (STORES_STATE.level === "store") {
        const id = Number(row.dataset.storeId);
        if (!id) return;

        STORES_STATE.level = "city";
        STORES_STATE.storeId = id;

        await renderStoresV2(days);
        return;
      }

      // CITY → SOURCE
      if (STORES_STATE.level === "city") {
        const raw = row.children[0]?.textContent || "";
        const [city, country] = raw.split(",").map(s => s.trim());

        STORES_STATE.level = "traffic";
        STORES_STATE.city = city;
        STORES_STATE.country = country;

        await renderStoresV2(days);
        return;
      }

    };

  });
}

/* ============================================================
   MAIN RENDER
   ============================================================ */

export async function renderStoresV2(days = 30) {

  STORES_STATE.days = days;
  ensureStoresSurface();

  const panel = getMarketPanel();
  const head = panel?.querySelector(".panelhead h2");
  const tbody = getBody();

  // ============================================================
  // STORE
  // ============================================================

  if (STORES_STATE.level === "store") {

    if (head) head.textContent = "Top Stores";

    const { data, error } = await sb.rpc("analytics_store_intelligence_v1", {
      p_days: days,
      p_limit: 50
    });

    if (error) {
      console.error(error);
      renderEmpty("Failed to load stores");
      return;
    }

    if (!data?.length) {
      renderEmpty("No store data");
      return;
    }

   tbody.innerHTML = data.map(r => {

  const ctr =
    Number(r.ctr || 0).toFixed(1) + "%";

  const rating =
    Number(r.avg_rating || 0).toFixed(1);

  return `
    <tr data-store-id="${r.store_id}">

      <td>${escapeHtml(r.name)}</td>

      <td class="num">${r.views || 0}</td>
      <td class="num">${r.clicks || 0}</td>
      <td class="num">${ctr}</td>

      <td class="num">${r.favorites || 0}</td>

      <td class="num">${rating}</td>
      <td class="num">${r.ratings_count || 0}</td>

      <td class="num">${r.comments_count || 0}</td>

    </tr>
  `;

}).join("");

    bindClicks(days);
    return;
  }

  // ============================================================
  // CITY
  // ============================================================

  if (STORES_STATE.level === "city") {

    if (head) head.textContent = "Traffic by City";

    const { data, error } = await sb.rpc(
      "analytics_store_traffic_by_city",
      {
        p_store_id: STORES_STATE.storeId,
        p_days: days
      }
    );

    if (error) {
      console.error(error);
      renderEmpty("Failed to load city data");
      return;
    }

    if (!data?.length) {
      renderEmpty("No city data");
      return;
    }

    tbody.innerHTML = data.map(c => {
      const ctr = c.views ? ((c.clicks / c.views) * 100).toFixed(1) + "%" : "0%";
      return `
        <tr>
          <td>${escapeHtml(c.city)}, ${escapeHtml(c.country)}</td>
          <td class="num">${c.views}</td>
          <td class="num">${c.clicks}</td>
          <td class="num">${ctr}</td>
        </tr>
      `;
    }).join("");

    bindClicks(days);
    return;
  }

  // ============================================================
  // SOURCE
  // ============================================================

  if (STORES_STATE.level === "traffic") {

    if (head) head.textContent = "Traffic Source";

    const { data, error } = await sb.rpc(
      "analytics_store_traffic_by_source",
      {
        p_store_id: STORES_STATE.storeId,
        p_days: days,
        p_city: STORES_STATE.city,
        p_country: STORES_STATE.country
      }
    );

    if (error) {
      console.error(error);
      renderEmpty("Failed to load source");
      return;
    }

    if (!data?.length) {
      renderEmpty("No source data");
      return;
    }

    tbody.innerHTML = data.map(r => {
      const ctr = r.views ? ((r.clicks / r.views) * 100).toFixed(1) + "%" : "0%";
      return `
        <tr>
          <td>${escapeHtml(r.source || "unknown")}</td>
          <td class="num">${r.views}</td>
          <td class="num">${r.clicks}</td>
          <td class="num">${ctr}</td>
        </tr>
      `;
    }).join("");

    return;
  }
}

/* ============================================================
   RESET
   ============================================================ */

export function resetStoresV2() {
  STORES_STATE.level = "store";
  STORES_STATE.storeId = null;
  STORES_STATE.city = null;
  STORES_STATE.country = null;
}

/* ============================================================
   DEBUG
   ============================================================ */

window.renderStoresV2 = renderStoresV2;
window.resetStoresV2 = resetStoresV2;
