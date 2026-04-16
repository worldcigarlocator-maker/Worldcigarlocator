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
  level: "store",   // store | traffic | city
  storeId: null,
  city: null,
  country: null,
  days: 30
};

/* ============================================================
   DOM
   ============================================================ */

function getBody() {
  return document.getElementById("marketDemandBody");
}

function getViewMarket() {
  return document.getElementById("view-market");
}

function getHeatmapPanel() {
  return document.querySelector("#view-market .panel:first-of-type");
}

function getMarketPanel() {
  return document.querySelector("#view-market .panel:nth-of-type(2)");
}

function ensureStoresSurface() {
  const marketView = getViewMarket();
  if (marketView) marketView.classList.remove("hidden");

  const heatmapPanel = getHeatmapPanel();
  if (heatmapPanel) heatmapPanel.style.display = "none";

  const marketPanel = getMarketPanel();
  if (marketPanel) {
    marketPanel.style.display = "block";

    const head = marketPanel.querySelector(".panelhead h2");
    if (head) head.textContent = "Top Stores";

    const table = marketPanel.querySelector("table");
    const thead = table?.querySelector("thead");

    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Store</th>
          <th class="num">Views</th>
          <th class="num">Clicks</th>
          <th class="num">CTR</th>
        </tr>
      `;
    }
  }
}

/* ============================================================
   HELPERS
   ============================================================ */

function renderEmpty(message, colspan = 4) {
  const tbody = getBody();
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="muted center">${message}</td>
    </tr>
  `;
}

function renderStores(rows) {
  const tbody = getBody();
  if (!tbody) return;

  tbody.innerHTML = rows.map((row) => {
    const views = Number(row.views || 0);
    const clicks = Number(row.clicks || 0);
    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) + "%" : "0%";

    return `
      <tr data-store-id="${row.store_id}">
        <td>${escapeHtml(row.name || "—")}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;
  }).join("");
}

function renderTraffic(rows) {
  const tbody = getBody();
  if (!tbody) return;

  tbody.innerHTML = rows.map((row) => {
    const views = Number(row.views || 0);
    const clicks = Number(row.clicks || 0);
    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) + "%" : "0%";
    const label = [row.city, row.country].filter(Boolean).join(", ") || "—";

    return `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;
  }).join("");
}

function renderCityDetail(rows) {
  const tbody = getBody();
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.session_hash)}</td>
      <td class="num">${r.events || 0}</td>
      <td>${escapeHtml(r.source || "-")}</td>
    </tr>
  `).join("");
}

}
/* ============================================================
   CLICK HANDLER
   ============================================================ */

function bindStoreClicks(days) {

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

        if (!city) return;

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
   PUBLIC API
   ============================================================ */

export function resetStoresV2() {
  STORES_STATE.level = "store";
  STORES_STATE.storeId = null;
  STORES_STATE.city = null;
  STORES_STATE.country = null;
}

/* ============================================================
   MAIN RENDER
   ============================================================ */

export async function renderStoresV2(days = 30) {

  STORES_STATE.days = days;

  ensureStoresSurface();

  const marketPanel = getMarketPanel();
  const head = marketPanel?.querySelector(".panelhead h2");

  /* ============================================================
     STORE LEVEL
     ============================================================ */

  if (STORES_STATE.level === "store") {

    if (head) head.textContent = "Top Stores";

    const { data, error } = await sb.rpc("analytics_top_stores", {
      p_days: days,
      p_limit: 50
    });

    console.log("🔥 TOP STORES:", data, error);

    if (error) {
      console.error(error);
      renderEmpty("Failed to load stores");
      return;
    }

    if (!data?.length) {
      renderEmpty("No store data yet");
      return;
    }

    renderStores(data);
    bindStoreClicks(days);
    return;
  }

  /* ============================================================
   CITY (WHERE DEMAND COMES FROM)
   ============================================================ */

if (STORES_STATE.level === "city") {

  if (head) head.textContent = "Traffic by City";

  const { data, error } = await sb.rpc(
    "analytics_store_traffic_by_city",
    {
      p_store_id: STORES_STATE.storeId,
      p_days: days
    }
  );

  console.log("🔥 CITY:", data, error);

  if (error) {
    console.error(error);
    renderEmpty("Failed to load city data");
    return;
  }

  if (!data?.length) {
    renderEmpty("No city data");
    return;
  }

  const tbody = getBody();

  tbody.innerHTML = data.map(c => {

    const views = Number(c.views || 0);
    const clicks = Number(c.clicks || 0);

    const ctr =
      views > 0
        ? ((clicks / views) * 100).toFixed(1) + "%"
        : "0%";

    return `
      <tr data-city="${c.city}" data-country="${c.country}">
        <td>${escapeHtml(c.city)}, ${escapeHtml(c.country)}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;

  }).join("");

  bindStoreClicks(days);
  return;
}


/* ============================================================
   SOURCE (HOW USERS ARRIVED)
   ============================================================ */

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

  console.log("🔥 SOURCE:", data, error);

  if (error) {
    console.error(error);
    renderEmpty("Failed to load source data");
    return;
  }

  if (!data?.length) {
    renderEmpty("No source data");
    return;
  }

  const tbody = getBody();

  tbody.innerHTML = data.map(r => {

    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);

    const ctr =
      views > 0
        ? ((clicks / views) * 100).toFixed(1) + "%"
        : "0%";

    return `
      <tr>
        <td>${escapeHtml(r.source || "unknown")}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;

  }).join("");

  return;
}
}
   
/* ============================================================
   UTILS
   ============================================================ */

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ============================================================
   DEBUG
   ============================================================ */

window.renderStoresV2 = renderStoresV2;
window.resetStoresV2 = resetStoresV2;
