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

  days: 30,
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

function renderEmpty(msg, colspan = 8) {
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
SORT
============================================================ */

function bindStoreSorting(days) {

  const headers =
    document.querySelectorAll(
      "#marketDemandTable th[data-sort]"
    );

  headers.forEach(th => {

     th.classList.remove("active-sort");

if (th.dataset.sort === STORES_STATE.sort) {
  th.classList.add("active-sort");
}
     
 th.onclick = async (e) => {

  e.stopPropagation();

      const sort = th.dataset.sort;
      if (!sort) return;

      STORES_STATE.sort = sort;
    headers.forEach(h =>
  h.classList.remove("active-sort")
);

th.classList.add("active-sort");

      await renderStoresV2(days);

    };

  });

}

/* ============================================================
   CLICK HANDLER
   ============================================================ */

function bindClicks(days) {
  const tbody = getBody();
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(row => {

    row.onclick = async () => {

      // STORE → DOSSIER

if (STORES_STATE.level === "store") {

  const id = Number(row.dataset.storeId);
  if (!id) return;

  STORES_STATE.storeId = id;

  console.log(
    "OPEN STORE DOSSIER:",
    STORES_STATE.storeId
  );

   await renderStoreDossier();
   
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

   const { data, error } = await sb.rpc(
  "analytics_store_intelligence_v1",
  {
    p_days: days
  }
);

    if (error) {
      console.error(error);
      renderEmpty("Failed to load stores");
      return;
    }

    if (!data?.length) {
      renderEmpty("No store data");
      return;
    }

data.sort((a, b) => {

  switch (STORES_STATE.sort) {

        case "name":
  return String(a.name || "")
    .localeCompare(String(b.name || ""));

    case "views":
      return (b.views || 0) - (a.views || 0);

    case "clicks":
      return (b.clicks || 0) - (a.clicks || 0);

    case "ctr":
      return Number(b.ctr || 0) - Number(a.ctr || 0);

    case "favorites":
      return (b.favorites || 0) - (a.favorites || 0);

    case "avg_rating":
      return Number(b.avg_rating || 0) -
             Number(a.avg_rating || 0);

    case "ratings_count":
      return (b.ratings_count || 0) -
             (a.ratings_count || 0);

    case "comments_count":
      return (b.comments_count || 0) -
             (a.comments_count || 0);

    default:
      return (b.views || 0) - (a.views || 0);
  }

});
     
   tbody.innerHTML = data.map(r => {

  const ctr =
    Number(r.ctr || 0).toFixed(1) + "%";

  const rating =
    Number(r.avg_rating || 0).toFixed(1);

      const favoriteBadge =
  Number(r.favorites || 0) > 0
    ? "❤️"
    : "";

const ratingBadge =
  Number(r.avg_rating || 0) >= 4.5
    ? "⭐"
    : "";

const commentsBadge =
  Number(r.comments_count || 0) >= 5
    ? "💬"
    : "";

  return `
    <tr data-store-id="${r.store_id}">

<td class="store-name-cell">

  <span class="store-name">
    ${escapeHtml(r.name)}
  </span>

  <span class="store-badges">

    ${favoriteBadge}
    ${ratingBadge}
    ${commentsBadge}

  </span>

</td>

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
     bindStoreSorting(days);
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
      renderEmpty("No city data", 4);
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
      renderEmpty("No source data", 4);
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
   STORE DOSSIER
   ============================================================ */

async function renderStoreDossier() {

  const tbody = getBody();
  if (!tbody) return;

  const panel = getMarketPanel();
  const head = panel?.querySelector(".panelhead h2");

  if (head) {
    head.textContent = "Store Intelligence";
  }

  const { data, error } = await sb.rpc(
    "analytics_store_intelligence_v1",
    {
      p_days: STORES_STATE.days
    }
  );

  if (error) {
    console.error(error);
    renderEmpty("Failed to load dossier");
    return;
  }

  const store =
    (data || []).find(
      s =>
        Number(s.store_id) ===
        Number(STORES_STATE.storeId)
    );

  if (!store) {
    renderEmpty("Store not found");
    return;
  }

  /* ============================================================
     SOURCE INTELLIGENCE
     ============================================================ */

  const {
    data: sourceData,
    error: sourceError
  } = await sb.rpc(
    "analytics_store_traffic_by_source",
    {
      p_store_id: STORES_STATE.storeId,
      p_days: STORES_STATE.days,
      p_city: null,
      p_country: null
    }
  );

  if (sourceError) {
    console.error(sourceError);
  }

  const sourceMap = {};

  (sourceData || []).forEach(row => {

    const key =
      String(row.source || "unknown")
        .toLowerCase();

    sourceMap[key] = {
      views: row.views || 0,
      clicks: row.clicks || 0
    };

  });

/* ============================================================
   TREND INTELLIGENCE
   ============================================================ */

const {
  data: trendData,
  error: trendError
} = await sb.rpc(
  "analytics_store_daily",
  {
    p_store_id: STORES_STATE.storeId,
    p_days: STORES_STATE.days
  }
);

if (trendError) {
  console.error(trendError);
}

const trendPoints =
  Array.isArray(trendData)
    ? trendData
    : [];

const trendViews =
  trendPoints.reduce(
    (sum, row) =>
      sum + Number(row.views || 0),
    0
  );

const trendClicks =
  trendPoints.reduce(
    (sum, row) =>
      sum + Number(row.clicks || 0),
    0
  );

const trendDays =
  trendPoints.length || 1;

const avgViewsPerDay =
  Math.round(trendViews / trendDays);

const avgClicksPerDay =
  Math.round(trendClicks / trendDays);

const momentumLabel =
  avgViewsPerDay >= 20
    ? "Hot"
    : avgViewsPerDay >= 5
      ? "Growing"
      : "Slow";
      

  /* ============================================================
     SOURCE HELPERS
     ============================================================ */

  function getSourceViews(source) {

    return (
      sourceMap[
        String(source).toLowerCase()
      ]?.views || 0
    );

  }

  function getSourceClicks(source) {

    return (
      sourceMap[
        String(source).toLowerCase()
      ]?.clicks || 0
    );

  }

/* ============================================================
   PERFORMANCE HELPERS
   ============================================================ */

const totalViews =
  Number(store.views || 0);

const totalClicks =
  Number(store.clicks || 0);

const totalFavorites =
  Number(store.favorites || 0);

const totalComments =
  Number(store.comments_count || 0);

const totalRatings =
  Number(store.ratings_count || 0);

const avgRating =
  Number(store.avg_rating || 0);


/* ============================================================
   INTELLIGENCE HELPERS
   ============================================================ */

function getPrestigeLabel(score) {

  if (score >= 500) {
    return "Elite";
  }

  if (score >= 250) {
    return "Premium";
  }

  if (score >= 100) {
    return "Growing";
  }

  return "Developing";

}

function getMarketPosition(score) {

  if (score >= 500) {
    return "Top Tier";
  }

  if (score >= 250) {
    return "High Performer";
  }

  if (score >= 100) {
    return "Competitive";
  }

  return "Emerging";

}

function getDiscoveryBehavior(source) {

  switch (source) {

    case "Search":
      return "Intent Driven";

    case "Map":
      return "Exploration Driven";

    case "Sidebar":
      return "Navigation Driven";

    case "Modal":
      return "Engagement Driven";

    default:
      return "Balanced";

  }

}

function getEngagementQuality({
  favorites,
  comments,
  rating
}) {

  if (
    favorites >= 10 &&
    comments >= 10 &&
    rating >= 4.5
  ) {
    return "Exceptional";
  }

  if (
    favorites >= 5 ||
    comments >= 5
  ) {
    return "Strong";
  }

  return "Low";

}


/* ============================================================
   PERFORMANCE SCORE
   ============================================================ */

let performanceScore = 0;

performanceScore += totalViews * 0.2;
performanceScore += totalClicks * 2;
performanceScore += totalFavorites * 8;
performanceScore += totalComments * 5;
performanceScore += totalRatings * 4;
performanceScore += avgRating * 20;

performanceScore =
  Math.round(performanceScore);



/* ============================================================
   PRESTIGE
   ============================================================ */

const prestigeLabel =
  getPrestigeLabel(
    performanceScore
  );

/* ============================================================
   HIDDEN GEM
   ============================================================ */

const hiddenGem =
  avgRating >= 4.5 &&
  totalViews < 50;

/* ============================================================
   BEHAVIORAL INTELLIGENCE
   ============================================================ */

const sidebarViews =
  getSourceViews("sidebar");

const searchViews =
  getSourceViews("search");

const mapViews =
  getSourceViews("map");

const modalViews =
  getSourceViews("modal");

const directViews =
  getSourceViews("direct");

const sourceRanking = [
  {
    label: "Sidebar",
    views: sidebarViews
  },
  {
    label: "Search",
    views: searchViews
  },
  {
    label: "Map",
    views: mapViews
  },
  {
    label: "Modal",
    views: modalViews
  },
  {
    label: "Direct",
    views: directViews
  }
];

sourceRanking.sort(
  (a, b) => b.views - a.views
);

const dominantSource =
  sourceRanking[0]?.label ||
  "Unknown";

const discoveryBehavior =
  getDiscoveryBehavior(
    dominantSource
  );
   
/* ============================================================
   COMMERCIAL INTELLIGENCE
   ============================================================ */

const premiumCandidate =
  avgRating >= 4.5 &&
  totalFavorites >= 5;

const tourismCandidate =
  mapViews >= searchViews;

const partnershipCandidate =
  performanceScore >= 250;

const expansionCandidate =
  totalViews >= 100 &&
  avgRating >= 4;

/* ============================================================
   MARKET POSITION
   ============================================================ */

const marketPosition =
  getMarketPosition(
    performanceScore
  );

/* ============================================================
   ENGAGEMENT QUALITY
   ============================================================ */

const engagementQuality =
  getEngagementQuality({
    favorites: totalFavorites,
    comments: totalComments,
    rating: avgRating
  });

/* ============================================================
   RENDER HELPERS
   ============================================================ */

function renderOverviewCards({
  totalViews,
  totalClicks,
  totalFavorites,
  totalComments,
  avgRating,
  ctr
}) {

  return `

    <div class="dossier-grid">

      <div class="dossier-card">
        <span>Views</span>
        <strong>${totalViews}</strong>
      </div>

      <div class="dossier-card">
        <span>Clicks</span>
        <strong>${totalClicks}</strong>
      </div>

      <div class="dossier-card">
        <span>CTR</span>
        <strong>
          ${Number(ctr || 0).toFixed(1)}%
        </strong>
      </div>

      <div class="dossier-card">
        <span>Favorites</span>
        <strong>${totalFavorites}</strong>
      </div>

      <div class="dossier-card">
        <span>Rating</span>
        <strong>
          ${avgRating.toFixed(1)}
        </strong>
      </div>

      <div class="dossier-card">
        <span>Comments</span>
        <strong>${totalComments}</strong>
      </div>

    </div>

  `;

}

   /* ============================================================
   SOURCE SECTION
   ============================================================ */

function renderSourceSection({
  getSourceViews
}) {

  return `

    <div class="dossier-section">

      <h3>
        Top Traffic Sources
      </h3>

      <div class="dossier-sources">

        <div class="dossier-source-row">

  <div class="dossier-source-head">

    <span>
      Sidebar
    </span>

    <strong>
      ${getSourceViews("sidebar")}
    </strong>

  </div>

  <div class="source-bar">

    <div
      class="source-bar-fill sidebar"
      style="
        width:
        ${
          totalViews > 0
            ? (
                getSourceViews("sidebar")
                / totalViews
              ) * 100
            : 0
        }%;
      "
    ></div>

  </div>

</div>

     <div class="dossier-source-row">

  <div class="dossier-source-head">

    <span>
      Search
    </span>

    <strong>
      ${getSourceViews("search")}
    </strong>

  </div>

  <div class="source-bar">

    <div
      class="source-bar-fill search"
      style="
        width:
        ${
          totalViews > 0
            ? (
                getSourceViews("search")
                / totalViews
              ) * 100
            : 0
        }%;
      "
    ></div>

  </div>

</div>

<div class="dossier-source-row">

  <div class="dossier-source-head">

    <span>
      Map
    </span>

    <strong>
      ${getSourceViews("map")}
    </strong>

  </div>

  <div class="source-bar">

    <div
      class="source-bar-fill map"
      style="
        width:
        ${
          totalViews > 0
            ? (
                getSourceViews("map")
                / totalViews
              ) * 100
            : 0
        }%;
      "
    ></div>

  </div>

</div>

<div class="dossier-source-row">

  <div class="dossier-source-head">

    <span>
      Modal
    </span>

    <strong>
      ${getSourceViews("modal")}
    </strong>

  </div>

  <div class="source-bar">

    <div
      class="source-bar-fill modal"
      style="
        width:
        ${
          totalViews > 0
            ? (
                getSourceViews("modal")
                / totalViews
              ) * 100
            : 0
        }%;
      "
    ></div>

  </div>

</div>

<div class="dossier-source-row">

  <div class="dossier-source-head">

    <span>
      Direct
    </span>

    <strong>
      ${getSourceViews("direct")}
    </strong>

  </div>

  <div class="source-bar">

    <div
      class="source-bar-fill direct"
      style="
        width:
        ${
          totalViews > 0
            ? (
                getSourceViews("direct")
                / totalViews
              ) * 100
            : 0
        }%;
      "
    ></div>

  </div>

</div>

  `;

}

/* ============================================================
   ENGAGEMENT SECTION
   ============================================================ */

function renderEngagementSection({
  totalFavorites,
  totalComments,
  avgRating
}) {

  return `

    <div class="dossier-section">

      <h3>
        Engagement Signals
      </h3>

      <div class="dossier-grid">

        <div class="dossier-card">
          <span>Loyalty</span>
          <strong>
            ${totalFavorites > 0
              ? "Strong"
              : "Low"
            }
          </strong>
        </div>

        <div class="dossier-card">
          <span>Reputation</span>
          <strong>
            ${avgRating >= 4.5
              ? "Excellent"
              : avgRating >= 3.5
                ? "Good"
                : "Developing"
            }
          </strong>
        </div>

        <div class="dossier-card">
          <span>Community</span>
          <strong>
            ${totalComments >= 5
              ? "Active"
              : "Quiet"
            }
          </strong>
        </div>

      </div>

    </div>

  `;

}

   /* ============================================================
   TREND SECTION
   ============================================================ */

function renderTrendSection({
  momentumLabel,
  avgViewsPerDay,
  avgClicksPerDay,
  trendPoints
}) {

  const trendBars =
    trendPoints
      .slice(-20)
      .map(point => {

        const value =
          Number(point.views || 0);

        const max =
          Math.max(
            ...trendPoints.map(
              p => Number(p.views || 0)
            ),
            1
          );

        const height =
          (value / max) * 100;

        return `
          <div
            class="trend-bar"
            style="
              height:${height}%;
            "
          ></div>
        `;

      })
      .join("");

  return `

    <div class="dossier-section">

      <h3>
        Trend Intelligence
      </h3>

      <div class="trend-chart">

        ${trendBars}

      </div>

      <div class="dossier-grid">

        <div class="dossier-card">

          <span>
            Momentum
          </span>

          <strong>
            ${momentumLabel}
          </strong>

          <div class="trend-meter">

            <div
              class="
                trend-meter-fill
                ${
                  momentumLabel === "Hot"
                    ? "hot"
                    : momentumLabel === "Growing"
                      ? "growing"
                      : "slow"
                }
              "
              style="
                width:
                ${
                  momentumLabel === "Hot"
                    ? "100%"
                    : momentumLabel === "Growing"
                      ? "65%"
                      : "35%"
                };
              "
            ></div>

          </div>

        </div>

        <div class="dossier-card">

          <span>
            Avg Views / Day
          </span>

          <strong>
            ${avgViewsPerDay}
          </strong>

        </div>

        <div class="dossier-card">

          <span>
            Avg Clicks / Day
          </span>

          <strong>
            ${avgClicksPerDay}
          </strong>

        </div>

        <div class="dossier-card">

          <span>
            Trend Points
          </span>

          <strong>
            ${trendPoints.length}
          </strong>

        </div>

      </div>

    </div>

  `;

}

   /* ============================================================
   BEHAVIOR SECTION
   ============================================================ */

function renderBehaviorSection({
  dominantSource,
  discoveryBehavior,
  engagementQuality,
  marketPosition
}) {

  return `

    <div class="dossier-section">

      <h3>
        Behavioral Intelligence
      </h3>

      <div class="dossier-grid">

        <div class="dossier-card">
          <span>Dominant Source</span>
          <strong>
            ${dominantSource}
          </strong>
        </div>

        <div class="dossier-card">
          <span>User Discovery</span>
          <strong>
            ${discoveryBehavior}
          </strong>
        </div>

        <div class="dossier-card">
          <span>Engagement Quality</span>
          <strong>
            ${engagementQuality}
          </strong>
        </div>

        <div class="dossier-card">
          <span>Market Position</span>
          <strong>
            ${marketPosition}
          </strong>
        </div>

      </div>

    </div>

  `;

}

   /* ============================================================
   COMMERCIAL SECTION
   ============================================================ */

function renderCommercialSection({
  premiumCandidate,
  tourismCandidate,
  expansionCandidate,
  partnershipCandidate
}) {

  return `

    <div class="dossier-section">

      <h3>
        Commercial Intelligence
      </h3>

      <div class="dossier-grid">

        <div class="dossier-card">
          <span>Premium Candidate</span>
          <strong>
            ${premiumCandidate
              ? "Yes"
              : "No"
            }
          </strong>
        </div>

        <div class="dossier-card">
          <span>Tourism Potential</span>
          <strong>
            ${tourismCandidate
              ? "High"
              : "Normal"
            }
          </strong>
        </div>

        <div class="dossier-card">
          <span>Expansion Potential</span>
          <strong>
            ${expansionCandidate
              ? "Strong"
              : "Low"
            }
          </strong>
        </div>

        <div class="dossier-card">
          <span>Partnership Grade</span>
          <strong>
            ${partnershipCandidate
              ? "Qualified"
              : "Developing"
            }
          </strong>
        </div>

      </div>

    </div>

  `;

}

   /* ============================================================
   PREDICTIVE SECTION
   ============================================================ */

function renderPredictiveSection({
  momentumLabel,
  hiddenGem,
  avgViewsPerDay,
  avgClicksPerDay
}) {

  return `

    <div class="dossier-section">

      <h3>
        Predictive Signals
      </h3>

      <div class="dossier-grid">

        <div class="dossier-card">
          <span>Growth Outlook</span>
          <strong>
            ${momentumLabel === "Hot"
              ? "Accelerating"
              : momentumLabel === "Growing"
                ? "Positive"
                : "Stable"
            }
          </strong>
        </div>

        <div class="dossier-card">
          <span>Breakout Potential</span>
          <strong>
            ${hiddenGem
              ? "High"
              : "Normal"
            }
          </strong>
        </div>

        <div class="dossier-card">
          <span>Decay Risk</span>
          <strong>
            ${avgViewsPerDay <= 1
              ? "Elevated"
              : "Low"
            }
          </strong>
        </div>

        <div class="dossier-card">
          <span>Audience Trajectory</span>
          <strong>
            ${avgClicksPerDay >= 5
              ? "Expanding"
              : "Steady"
            }
          </strong>
        </div>

      </div>

    </div>

  `;

}
   
  /* ============================================================
     RENDER
     ============================================================ */

  tbody.innerHTML = `
    <tr>
      <td colspan="8">

        <div class="store-dossier">

          <button
            class="store-dossier-back"
            type="button">
            ← Back to rankings
          </button>

          <div class="store-dossier-header">

            <div>

              <h2>
                ${escapeHtml(store.name)}
              </h2>

              <div class="store-dossier-prestige">

                <span class="prestige-pill">
                  ${prestigeLabel}
                </span>

                ${hiddenGem
                  ? `
                    <span class="hidden-gem-pill">
                      💎 Hidden Gem
                    </span>
                  `
                  : ""
                }

              </div>

            </div>

            <div class="performance-score">

              <span>Performance Score</span>

              <strong>
                ${performanceScore}
              </strong>

            </div>

          </div>

          ${renderOverviewCards({
  totalViews,
  totalClicks,
  totalFavorites,
  totalComments,
  avgRating,
  ctr: store.ctr
})}

          ${renderSourceSection({
  getSourceViews
})}

        ${renderEngagementSection({
  totalFavorites,
  totalComments,
  avgRating
})}

${renderTrendSection({
  momentumLabel,
  avgViewsPerDay,
  avgClicksPerDay,
  trendPoints
})}

${renderBehaviorSection({
  dominantSource,
  discoveryBehavior,
  engagementQuality,
  marketPosition
})}


${renderCommercialSection({
  premiumCandidate,
  tourismCandidate,
  expansionCandidate,
  partnershipCandidate
})}

${renderPredictiveSection({
  momentumLabel,
  hiddenGem,
  avgViewsPerDay,
  avgClicksPerDay
})}

        </div>

      </td>
    </tr>
  `;

  /* ============================================================
     BACK BUTTON
     ============================================================ */

  const backBtn =
    document.querySelector(
      ".store-dossier-back"
    );

  if (backBtn) {

    backBtn.onclick = async () => {

      STORES_STATE.level = "store";

      STORES_STATE.storeId = null;

      STORES_STATE.sort = "views";

      await renderStoresV2(
        STORES_STATE.days
      );

    };

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

  STORES_STATE.sort = "views";

}

/* ============================================================
   DEBUG
   ============================================================ */

window.renderStoresV2 = renderStoresV2;
window.resetStoresV2 = resetStoresV2;

