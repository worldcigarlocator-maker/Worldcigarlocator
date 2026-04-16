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
  level: "store",   // store | traffic
  storeId: null,
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

function bindStoreClicks(days) {
  const tbody = getBody();
  if (!tbody) return;

  tbody.querySelectorAll("tr[data-store-id]").forEach((row) => {
    row.onclick = async () => {
      const raw = row.dataset.storeId;
      const storeId = Number(raw);
      if (!storeId) return;

      STORES_STATE.level = "traffic";
      STORES_STATE.storeId = storeId;
      STORES_STATE.days = days;

      await renderStoresV2(days);
    };
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ============================================================
   PUBLIC API
   ============================================================ */

export function resetStoresV2() {
  STORES_STATE.level = "store";
  STORES_STATE.storeId = null;
}

export async function renderStoresV2(days = 30) {
  STORES_STATE.days = days;

  ensureStoresSurface();

  if (STORES_STATE.level === "store") {
    const { data, error } = await sb.rpc("analytics_top_stores", {
      p_days: days,
      p_limit: 50
    });

    console.log("🔥 STORES V2 TOP STORES:", data, error);

    if (error) {
      console.error("❌ stores v2 top stores error", error);
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

  if (STORES_STATE.level === "traffic") {
    const { data, error } = await sb.rpc("analytics_store_traffic_by_city", {
      p_store_id: STORES_STATE.storeId,
      p_days: days
    });

    console.log("🔥 STORES V2 TRAFFIC:", data, error);

    const marketPanel = getMarketPanel();
    const head = marketPanel?.querySelector(".panelhead h2");
    if (head) head.textContent = "Store Traffic Origin";

    if (error) {
      console.error("❌ stores v2 traffic error", error);
      renderEmpty("Failed to load traffic origin");
      return;
    }

    if (!data?.length) {
      renderEmpty("No traffic data yet");
      return;
    }

    renderTraffic(data);
    return;
  }
}

window.renderStoresV2 = renderStoresV2;
window.resetStoresV2 = resetStoresV2;
