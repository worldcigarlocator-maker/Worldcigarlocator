/* ============================================================
   Backoffice — Moderation + Hierarki + Edit + Proxy + ISO Flags
   ============================================================ */

const DEBUG_BACKOFFICE = window.WCL_DEBUG_BACKOFFICE === true || window.WCL_DEBUG === true;
const debugLog = (...args) => {
  if (DEBUG_BACKOFFICE) console.log(...args);
};

debugLog("Backoffice loaded");

/* ======================== CONFIG ======================== */
const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",
  PHOTO_PROXY_URL: "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  PHOTO_REFS_URL:  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs",
  FALLBACK_IMG:   "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",

  FLAGS_BASE: "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags"
};

/* Supabase */
WCL.supabase = window.supabase.createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);


/* ============================================================
   AUTH GUARD — ADMIN LOCK (STABLE VERSION)
   ============================================================ */

async function showApp() {
  document.getElementById("login-screen")?.style.setProperty("display", "none");
  document.querySelector(".wrap")?.style.setProperty("display", "block");
  await reloadData("approved");
}

async function showLogin() {
  document.querySelector(".wrap")?.style.setProperty("display", "none");
  document.getElementById("login-screen")?.style.setProperty("display", "flex");
}

async function checkAuth(user) {

  if (!user) {
    return showLogin();
  }

  const { data: isAdmin, error } =
    await WCL.supabase.rpc("bo_is_admin_v1", { p_uid: user.id });

  if (error) {
    console.warn("Admin RPC error:", error);
    await WCL.supabase.auth.signOut();
    return showLogin();
  }

  if (!isAdmin) {
    console.warn("Access denied: not admin");
    await WCL.supabase.auth.signOut();
    return showLogin();
  }

  return showApp();
}

document.addEventListener("DOMContentLoaded", async () => {

  // Login button
  document.getElementById("login-btn")?.addEventListener("click", async () => {

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    const { data, error } =
      await WCL.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const el = document.getElementById("login-error");
      if (el) el.textContent = "Wrong email or password";
      return;
    }

    await checkAuth(data.user);
  });

  // Check existing session on load
  const { data: { session } } = await WCL.supabase.auth.getSession();
  await checkAuth(session?.user);

  // Listen for auth state changes
  WCL.supabase.auth.onAuthStateChange(async (event, session) => {
    await checkAuth(session?.user);
  });

});

// Optional logout
window.logout = async () => {
  await WCL.supabase.auth.signOut();
  await showLogin();
};

/* ======================== STATE ========================= */
let STORES = [];
let REPORTS = [];               // separat state för store_reports
let PHOTO_STORES = [];
let PHOTO_FILTER = "google";
let PHOTO_RENDER_LIMIT = 120;
let PHOTO_URL_COLUMN_AVAILABLE = true;
let CURRENT_TAB = "approved";   // approved | pending | flagged | deleted | duplicates | reports | photos
let CURRENT_VIEW = "cards";     // cards | list
let HIER_SEL = { continent: null, country: null, state: null, city: null };

const STORE_SELECT_FIELDS =
  "id,name,city,country,continent,type,types,address,phone,access,rating," +
  "approved,flagged,deleted,status,photo_reference,place_id,website," +
  "created_at,flag_reason,country_iso2";

const PHOTO_SELECT_FIELDS = `${STORE_SELECT_FIELDS},photo_url`;

const REPORT_TYPE_LABELS = {
  no_longer_sells: "Store type is wrong",
  no_smoking_allowed: "Lounge type is wrong",
  membership_policy_wrong: "Phone or website is wrong",
  wrong_address: "Wrong address",
  permanently_closed: "Does not exist any longer",
  duplicate: "Duplicate",
  other: "Other"
};

const DEFAULT_REPORT_GUIDANCE = {
  summary: "Review the listing details and any reporter note before closing the case.",
  steps: [
    "Open Edit and verify the listing data.",
    "Update the listing if needed.",
    "Resolve only after the issue has been checked."
  ]
};

const REPORT_TYPE_GUIDANCE = {
  no_longer_sells: {
    summary: "The listing may be tagged as the wrong business type.",
    steps: [
      "Open Edit and check whether Store should be added or removed.",
      "Save the corrected type if the report is valid.",
      "Reject the report if the current type is already correct."
    ]
  },
  no_smoking_allowed: {
    summary: "The lounge tag or access setup may be wrong.",
    steps: [
      "Open Edit and check whether Lounge should be added or removed.",
      "Verify access if the listing is members only.",
      "Resolve after the type and access are correct."
    ]
  },
  membership_policy_wrong: {
    summary: "The reporter says the phone number or website is wrong.",
    steps: [
      "Open Edit and verify phone and website.",
      "Update incorrect contact details.",
      "Resolve after the contact data has been checked."
    ]
  },
  wrong_address: {
    summary: "The address or location details may be inaccurate.",
    steps: [
      "Open Edit and verify address, city, country and map data.",
      "Correct the location fields if needed.",
      "Resolve after the listing points to the right place."
    ]
  },
  permanently_closed: {
    summary: "The reporter says this place does not exist any longer.",
    steps: [
      "Verify the listing manually before changing visibility.",
      "If confirmed, move the listing to Trash.",
      "Resolve after the public listing is corrected."
    ]
  },
  duplicate: {
    summary: "The reporter says this is a duplicate listing.",
    steps: [
      "Search by name, city and ID to find the matching listing.",
      "Keep the strongest record and move the duplicate to Trash if confirmed.",
      "Resolve after the duplicate state is handled."
    ]
  },
  other: DEFAULT_REPORT_GUIDANCE
};

// ============================================================
// RENDER LIMIT (Backoffice performance)
// ============================================================

let RENDER_LIMIT = 100;
let RENDER_STEP = 100;


/* ======================== HELPERS ======================== */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const safe = (v) => (v ?? "").toString();
const escapeHtml = (v) =>
  safe(v).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
const isPendingSubmission = (s) => s?._source_table === "store_pending";
const reportTypeLabel = (type) =>
  REPORT_TYPE_LABELS[type] || type || "Reported issue";
const reportGuidance = (type) =>
  REPORT_TYPE_GUIDANCE[type] || DEFAULT_REPORT_GUIDANCE;

const SEARCH_ALIASES = {
  europa: ["europe"],
  europe: ["europa"],
  nordamerika: ["north america"],
  "north america": ["nordamerika"],
  sydamerika: ["south america"],
  "south america": ["sydamerika"],
  asien: ["asia"],
  asia: ["asien"],
  afrika: ["africa"],
  africa: ["afrika"],
  oceanien: ["oceania"],
  oceania: ["oceanien"],
  australien: ["australia"],
  australia: ["australien"],
  sverige: ["sweden"],
  sweden: ["sverige"],
  tyskland: ["germany"],
  germany: ["tyskland"],
  polen: ["poland"],
  poland: ["polen"],
  danmark: ["denmark"],
  denmark: ["danmark"],
  norge: ["norway"],
  norway: ["norge"],
  finland: ["finland"],
  frankrike: ["france"],
  france: ["frankrike"],
  spanien: ["spain"],
  spain: ["spanien"],
  italien: ["italy"],
  italy: ["italien"],
  usa: ["united states", "united states of america"],
  amerika: ["united states"],
  "united states": ["usa", "amerika"],
  storbritannien: ["united kingdom", "great britain"],
  "united kingdom": ["storbritannien"]
};

function searchTerms(term) {
  const clean = safe(term).trim().toLowerCase();
  if (!clean) return [];

  return Array.from(
    new Set([
      clean,
      ...(SEARCH_ALIASES[clean] || [])
    ])
  );
}

function storeMatchesSearch(store, rawTerm) {
  const terms = searchTerms(rawTerm);
  if (!terms.length) return true;

  const numericTerm =
    /^\d+$/.test(terms[0]) ? Number(terms[0]) : null;

  if (
    numericTerm !== null &&
    [store.id, store.pending_id, store.store_id]
      .some((id) => Number(id) === numericTerm)
  ) {
    return true;
  }

  const reportTypes =
    Array.isArray(store._report_types)
      ? store._report_types.map(reportTypeLabel)
      : [reportTypeLabel(store._report_type)];

  const haystack = [
    store.name,
    store.city,
    store.country,
    store.continent,
    store.address,
    store.phone,
    store.website,
    store.country_iso2,
    store.access,
    store.status,
    store.flag_reason,
    store._report_status,
    store._report_type,
    ...reportTypes,
    ...(Array.isArray(store.types) ? store.types : [store.type])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return terms.some((term) => haystack.includes(term));
}

function escapeSearchPattern(term) {
  return safe(term).replace(/[,%()]/g, " ").trim();
}

function buildSearchOrFilter(table, rawTerm) {
  const columns =
    table === "store_pending"
      ? [
          "name",
          "city",
          "country",
          "address",
          "phone",
          "website",
          "country_iso2"
        ]
      : [
          "name",
          "city",
          "country",
          "continent",
          "address",
          "phone",
          "website",
          "country_iso2",
          "status",
          "flag_reason"
        ];

  const parts = [];
  const terms = searchTerms(rawTerm)
    .map(escapeSearchPattern)
    .filter(Boolean);

  if (/^\d+$/.test(terms[0] || "")) {
    parts.push(`id.eq.${Number(terms[0])}`);
  }

  terms.forEach((term) => {
    columns.forEach((column) => {
      parts.push(`${column}.ilike.%${term}%`);
    });
  });

  return parts.join(",");
}

function buildReportDetails(s) {
  const reportTypes =
    Array.isArray(s._report_types) && s._report_types.length
      ? s._report_types
      : [s._report_type].filter(Boolean);
  const label = reportTypes.length
    ? reportTypes.map(reportTypeLabel).join(", ")
    : reportTypeLabel(s._report_type);
  const guidance = reportGuidance(s._report_type);
  const reportCount = Number(s._report_count) || 1;
  const status = s._report_status || "pending";
  const reporterNote = (s._report_messages || [])
    .map((message) => message?.message || "")
    .find((message) => message.trim());
  const steps = guidance.steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");
  const noteHtml = reporterNote
    ? `
      <div class="report-note">
        <div>Reporter note</div>
        <p>${escapeHtml(reporterNote)}</p>
      </div>
    `
    : "";

  return `
    <div class="report-kicker">Reported issue</div>
    <div class="report-title">${escapeHtml(label)}</div>
    <div class="report-meta">
      ${reportCount} report${reportCount === 1 ? "" : "s"} · ${escapeHtml(status)}
    </div>
    <p class="report-summary">${escapeHtml(guidance.summary)}</p>
    ${noteHtml}
    <div class="report-guidance-title">Recommended handling</div>
    <ul class="report-action-list">${steps}</ul>
  `;
}

async function fetchReportDetails(reportId) {
  try {
    const { data, error } = await WCL.supabase
      .rpc("bo_get_report_details_v2", { p_report_id: reportId });

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("Report details unavailable:", error);
    return null;
  }
}

function reportModerationNote(s, action) {
  const label = reportTypeLabel(s?._report_type);
  const actionText = {
    set_reviewed: "reviewed",
    resolve: "resolved",
    reject: "rejected"
  }[action] || action;

  return `${label} report ${actionText} from backoffice.`;
}

function normalizePendingSubmission(s) {
  return {
    id: s.id,
    pending_id: s.id,
    _source_table: "store_pending",
    name: s.name,
    city: s.city,
    country: s.country,
    continent: s.continent || null,

    types: s.types || [],
    access: s.access || null,
    rating: null,

    address: s.address || null,
    phone: s.phone || null,
    website: s.website || null,

    photo_reference: s.photo_reference || null,
    place_id: s.place_id || null,

    approved: false,
    flagged: false,
    deleted: false,

    status: "pending"
  };
}

const toast = (msg, cls = "success") => {
  const c = $("#toast-container");
  if (!c) { console.warn("[toast]", msg); return; }
  const t = document.createElement("div");
  t.className = `toast ${cls}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2500);
};

// ============================================================
// STORE VIEW OBSERVER (analytics / performance safe)
// ============================================================

let storeViewObserver = null;

function initStoreViewObserver() {

  // skapa bara en gång
  if (storeViewObserver) return;

  storeViewObserver = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

      if (!entry.isIntersecting) return;

      const el = entry.target;
      const storeId = el.dataset.storeId;

      if (!storeId) return;

      debugLog("Store viewed:", storeId);

      // logga bara en gång
      storeViewObserver.unobserve(el);

    });

  }, {
    threshold: 0.35
  });

}

/* ============================================================
   FETCH ALL STORES — Supabase pagination (no 1000 limit)
   ============================================================ */
async function fetchAllStores(query) {
  const PAGE_SIZE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all = all.concat(data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/* ============================================================
   PHOTO REPLACEMENT REVIEW
   ============================================================ */
async function loadPhotoReview() {
  CURRENT_VIEW = "cards";
  PHOTO_RENDER_LIMIT = 120;

  $$(".viewtoggle .seg").forEach((seg) =>
    seg.classList.toggle("active", seg.dataset.view === "cards")
  );

  $("#cards") && ($("#cards").style.display = "grid");
  $(".listview-wrap") && ($(".listview-wrap").style.display = "none");

  const grid = $("#cards");
  if (grid) {
    grid.classList.add("photo-review-grid");
    grid.innerHTML = "<p class='muted center'>Loading photo review...</p>";
  }

  try {
    let data = [];

    try {
      data = await fetchAllStores(
        WCL.supabase
          .from("stores")
          .select(PHOTO_SELECT_FIELDS)
          .eq("approved", true)
          .eq("deleted", false)
          .order("id", { ascending: false })
      );
      PHOTO_URL_COLUMN_AVAILABLE = true;
    } catch (error) {
      if (!isMissingPhotoUrlColumnError(error)) throw error;

      PHOTO_URL_COLUMN_AVAILABLE = false;
      data = await fetchAllStores(
        WCL.supabase
          .from("stores")
          .select(STORE_SELECT_FIELDS)
          .eq("approved", true)
          .eq("deleted", false)
          .order("id", { ascending: false })
      );
    }

    PHOTO_STORES = data || [];
    STORES = PHOTO_STORES;
    renderPhotoReview();
    updatePhotoPillCount();
    updateRegionCounts();
    void refreshReportPillCount();
  } catch (error) {
    console.error("Photo review load failed:", error);
    if (grid) {
      grid.innerHTML = "<p class='error center'>Error loading photo review</p>";
    }
  }
}

function photoStats(rows) {
  return rows.reduce((acc, store) => {
    acc.total += 1;
    acc[photoSource(store)] += 1;
    return acc;
  }, {
    total: 0,
    google: 0,
    custom: 0,
    fallback: 0
  });
}

function updatePhotoPillCount() {
  const stats = photoStats(PHOTO_STORES);
  setPillCount("photos", stats.google);
}

function renderPhotoReview() {
  const grid = $("#cards");
  if (!grid) return;

  grid.classList.add("photo-review-grid");
  grid.innerHTML = "";

  const searchTerm = ($("#searchInput")?.value || "").trim();
  const stats = photoStats(PHOTO_STORES);

  const list = PHOTO_STORES.filter((store) => {
    const source = photoSource(store);
    const sourceMatch = PHOTO_FILTER === "all" || source === PHOTO_FILTER;
    return sourceMatch && storeMatchesSearch(store, searchTerm);
  });
  const visibleList = list.slice(0, PHOTO_RENDER_LIMIT);

  const panel = document.createElement("section");
  panel.className = "photo-review-panel";

  const header = document.createElement("div");
  header.className = "photo-review-header";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = "Photo Replacement";

  const subtitle = document.createElement("p");
  subtitle.textContent =
    "Review listings that still use Google Places photos and replace them one by one with WCL-controlled images.";

  titleWrap.append(title, subtitle);
  header.appendChild(titleWrap);

  const summary = document.createElement("div");
  summary.className = "photo-review-summary";

  [
    ["Google", stats.google],
    ["Custom", stats.custom],
    ["No image", stats.fallback],
    ["Total", stats.total]
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "photo-review-stat";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const valueEl = document.createElement("strong");
    valueEl.textContent = Number(value).toLocaleString("sv-SE");

    item.append(labelEl, valueEl);
    summary.appendChild(item);
  });

  header.appendChild(summary);
  panel.appendChild(header);

  if (!PHOTO_URL_COLUMN_AVAILABLE) {
    const warning = document.createElement("div");
    warning.className = "photo-review-warning";
    warning.textContent =
      "Supabase saknar fortfarande kolumnen photo_url. Du kan inventera bilder här, men sparning av egna bild-URL:er aktiveras först när SQL-steget i dokumentationen är kört.";
    panel.appendChild(warning);
  }

  const controls = document.createElement("div");
  controls.className = "photo-review-controls";

  [
    ["google", "Google to replace", stats.google],
    ["custom", "Custom", stats.custom],
    ["fallback", "No image", stats.fallback],
    ["all", "All", stats.total]
  ].forEach(([key, label, count]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `photo-filter-btn ${PHOTO_FILTER === key ? "active" : ""}`;
    button.textContent = `${label} (${Number(count).toLocaleString("sv-SE")})`;
    button.onclick = () => {
      PHOTO_FILTER = key;
      PHOTO_RENDER_LIMIT = 120;
      renderPhotoReview();
    };
    controls.appendChild(button);
  });

  panel.appendChild(controls);

  const countLine = document.createElement("p");
  countLine.className = "muted photo-review-count";
  countLine.textContent = `Showing ${list.length.toLocaleString("sv-SE")} listings`;
  panel.appendChild(countLine);

  const cards = document.createElement("div");
  cards.className = "photo-review-cards";

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "muted center";
    empty.textContent = "No listings match this view.";
    cards.appendChild(empty);
  } else {
    visibleList.forEach((store) => cards.appendChild(renderPhotoReviewCard(store)));
  }

  if (list.length > visibleList.length) {
    const loadMore = document.createElement("div");
    loadMore.className = "photo-review-load-more";

    const info = document.createElement("span");
    info.textContent = `Showing ${visibleList.length.toLocaleString("sv-SE")} / ${list.length.toLocaleString("sv-SE")}`;

    const button = makeBtn("Load More", () => {
      PHOTO_RENDER_LIMIT += 120;
      renderPhotoReview();
    }, "small blue");

    loadMore.append(info, button);
    cards.appendChild(loadMore);
  }

  panel.appendChild(cards);
  grid.appendChild(panel);
}

function renderPhotoReviewCard(store) {
  const source = photoSource(store);
  const customUrl = customPhotoUrl(store);

  const card = document.createElement("article");
  card.className = `photo-review-card source-${source}`;

  const preview = document.createElement("div");
  preview.className = "photo-review-preview";

  const img = document.createElement("img");
  img.alt = safe(store.name || "Store photo");
  img.src = customUrl || WCL.FALLBACK_IMG;
  img.onerror = () => (img.src = WCL.FALLBACK_IMG);

  const sourceBadge = document.createElement("span");
  sourceBadge.className = `photo-source-badge ${source}`;
  sourceBadge.textContent = photoSourceLabel(source);

  preview.append(img, sourceBadge);
  card.appendChild(preview);

  const body = document.createElement("div");
  body.className = "photo-review-body";

  const meta = document.createElement("div");
  meta.className = "photo-review-meta";
  meta.textContent = `ID ${store.id} · ${safe(store.country || "Unknown")}, ${safe(store.city || "Unknown")}`;

  const name = document.createElement("h3");
  name.textContent = safe(store.name || "Unnamed listing");

  const details = document.createElement("p");
  details.textContent = safe(store.address || "No address saved");

  body.append(meta, name, details);

  const form = document.createElement("div");
  form.className = "photo-review-form";

  const input = document.createElement("input");
  input.type = "url";
  input.placeholder = PHOTO_URL_COLUMN_AVAILABLE
    ? "https://example.com/wcl-image.jpg"
    : "Run the photo_url SQL step before saving";
  input.value = safe(store.photo_url || "");
  input.disabled = !PHOTO_URL_COLUMN_AVAILABLE;

  const helper = document.createElement("small");
  helper.textContent = source === "google"
    ? "Google preview is intentionally not loaded until you click Preview Google."
    : "Use a WCL-approved image URL. Google photos should not be copied into this field.";

  form.append(input, helper);
  body.appendChild(form);

  const actions = document.createElement("div");
  actions.className = "photo-review-actions";

  if (store.photo_reference) {
    const previewBtn = makeBtn("Preview Google", () => {
      img.src = buildPhotoProxyUrl(store.photo_reference, 800);
      helper.textContent = "Google preview loaded for this listing only.";
    }, "small orange");
    actions.appendChild(previewBtn);
  }

  const saveBtn = makeBtn("Save Image URL", () => savePhotoReplacement(store.id, input), "small green");
  saveBtn.disabled = !PHOTO_URL_COLUMN_AVAILABLE;
  actions.appendChild(saveBtn);

  if (customUrl && PHOTO_URL_COLUMN_AVAILABLE) {
    const clearBtn = makeBtn("Clear Custom", async () => {
      input.value = "";
      await savePhotoReplacement(store.id, input);
    }, "small danger");
    actions.appendChild(clearBtn);
  }

  const editBtn = makeBtn("Open Edit", () => editStore(store.id), "small blue");
  actions.appendChild(editBtn);

  body.appendChild(actions);
  card.appendChild(body);

  return card;
}

async function savePhotoReplacement(storeId, input) {
  if (!PHOTO_URL_COLUMN_AVAILABLE) {
    toast("Run the photo_url SQL step before saving image URLs", "error");
    return;
  }

  const value = safe(input?.value || "").trim();

  if (!isValidReplacementPhotoUrl(value)) {
    toast("Use a full https image URL", "error");
    return;
  }

  const { error } = await WCL.supabase
    .from("stores")
    .update({ photo_url: value || null })
    .eq("id", storeId);

  if (error) {
    console.error("Photo URL save failed:", error);
    toast("Photo URL could not be saved", "error");
    return;
  }

  const store = PHOTO_STORES.find((item) => Number(item.id) === Number(storeId));
  if (store) store.photo_url = value || null;

  toast(value ? "Photo URL saved" : "Custom photo cleared");
  renderPhotoReview();
  updatePhotoPillCount();
}


/* ============================================================
   HELPER: groupBy
   ============================================================ */
function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item) || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}


function sortAlpha(arr, keyFn) {
  return [...arr].sort((a, b) =>
    safe(keyFn(a)).localeCompare(safe(keyFn(b)), undefined, {
      sensitivity: "base"
    })
  );
}


/* ============================================================
   INLINE LISTVIEW — Expandable Continent → Country → City → Store
   ============================================================ */
function renderListView(list) {

  // 🔹 Försortera listan en gång (snabbare hierarki)
  list = [...list].sort((a, b) =>
    `${safe(a.continent)}${safe(a.country)}${safe(a.city)}`
      .localeCompare(`${safe(b.continent)}${safe(b.country)}${safe(b.city)}`)
  );

  const wrap = $(".listview-wrap");
  if (!wrap) return;

  wrap.innerHTML = `
  <table id="listTable">
    <thead>
      <tr>
        <th></th>
        <th>Continent</th>
        <th>Country</th>
        <th>State</th>
        <th>City</th>
        <th>Name</th>
        <th>Type</th>
        <th>Access</th>
        <th>Rating</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="listBody"></tbody>
  </table>
`;

  const tbody = $("#listBody");
  tbody.innerHTML = "";

  // Grupp efter kontinent
  const byContinent = groupBy(list, s => s.continent || "Other");

  Object.entries(byContinent)
    .sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    )
    .forEach(([continent, contStores]) => {
      const row = makeExpandableRow(continent, contStores, "continent");
      tbody.appendChild(row);
    });

}

/* ============================================================
   HELPER — Skapar expanderbar rad
   Continent → Country → City → Store
   (State visas på store-nivå)
   ============================================================ */
function makeExpandableRow(label, items, level) {
  const tr = document.createElement("tr");
  tr.className = `expandable ${level}`;

  tr.innerHTML = `
    <td class="arrow-cell">▶</td>
    <td colspan="10" class="line-label">
      <strong>${label}</strong>
      <span class="muted">(${items.length})</span>
    </td>
  `;

  let expanded = false;
  const subRows = [];

  tr.addEventListener("click", (e) => {
    e.stopPropagation();

    /* COLLAPSE */
    if (expanded) {
      subRows.forEach(r => r.remove());
      subRows.length = 0;
      tr.querySelector(".arrow-cell").textContent = "▶";
      expanded = false;
      return;
    }

    /* EXPAND */
    tr.querySelector(".arrow-cell").textContent = "▼";
    expanded = true;

    /* =========================
       CONTINENT → COUNTRY
       ========================= */
    if (level === "continent") {

      const byCountry = groupBy(items, s => s.country || "Unknown");
      let anchor = tr.nextSibling;

      Object.entries(byCountry)
        .sort(([a], [b]) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        )
        .forEach(([country, countryStores]) => {

          const sub = makeExpandableRow(country, countryStores, "country");

          subRows.push(sub);
          tr.parentNode.insertBefore(sub, anchor);
          anchor = sub.nextSibling;

        });

    }

    /* =========================
       COUNTRY → CITY
       ========================= */
    else if (level === "country") {

      const byCity = groupBy(items, s => s.city || "Unknown");
      let anchor = tr.nextSibling;

      Object.entries(byCity)
        .sort(([a], [b]) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        )
        .forEach(([city, cityStores]) => {

          const sub = makeExpandableRow(city, cityStores, "city");

          subRows.push(sub);
          tr.parentNode.insertBefore(sub, anchor);
          anchor = sub.nextSibling;

        });

    }

    /* =========================
       CITY → STORES
       ========================= */
    else if (level === "city") {

      let anchor = tr.nextSibling;

      items.forEach(s => {

        const row = document.createElement("tr");
        row.className = "store-row";

        const hasPhoto = Boolean(s.photo_reference);

        row.innerHTML = `
          <td></td>
          <td>${safe(s.continent)}</td>
          <td>${safe(s.country) || "—"}</td>
          <td>${safe(s.state) || "—"}</td>
          <td>${safe(s.city) || "—"}</td>
          <td>${safe(s.name)}</td>
          <td>${
            Array.isArray(s.types) && s.types.length
              ? s.types.join(" + ")
              : safe(s.type) || "–"
          }</td>
          <td>${safe(s.access) || "–"}</td>
          <td>${s.rating ?? "–"}</td>
          <td>
            ${s.approved ? `<span class="badge green">APPROVED</span>` : ""}
            ${s.flagged ? `<span class="badge red">FLAGGED</span>` : ""}
            ${s.deleted ? `<span class="badge gray">DELETED</span>` : ""}
            ${
              !s.approved && !s.flagged && !s.deleted
                ? `<span class="badge gold">PENDING</span>`
                : ""
            }
          </td>
          <td class="action-td">
            ${
              isPendingSubmission(s)
                ? `<button class="btn small green" onclick="approveStore(${s.id})">Approve</button>
                   <button class="btn small danger" onclick="rejectPendingSubmission(${s.id})">Reject Pending</button>`
                : `<button class="btn small blue" type="button" data-edit-store-id="${s.id}">Edit</button>
                   ${
                     !hasPhoto
                       ? `<button class="btn small orange"
onclick="repairPhoto(${s.id}, '${(s.place_id || "").replace(/'/g, "\\'")}', null, event)">
                          Repair
                        </button>`
                       : ""
                   }
                   <button class="btn small danger" onclick="toggleDeleteById(${s.id})">Delete</button>`
            }
          </td>
        `;

        subRows.push(row);
        tr.parentNode.insertBefore(row, anchor);
        anchor = row.nextSibling;

      });

    }

  });

  return tr;
}

/* ========================= FLAGS =========================
   Global ISO2 Engine — robust mapping med alias & normalisering
   ============================================================ */

/* 1) ISO2 → namn (baslista) */
const ISO2_BASE = {
  "al":"albania","ad":"andorra","am":"armenia","at":"austria","az":"azerbaijan",
  "by":"belarus","be":"belgium","ba":"bosnia and herzegovina","bg":"bulgaria",
  "hr":"croatia","cy":"cyprus","cz":"czechia","dk":"denmark","ee":"estonia",
  "fi":"finland","fr":"france","ge":"georgia","de":"germany","gr":"greece",
  "hu":"hungary","is":"iceland","ie":"ireland","it":"italy","kz":"kazakhstan",
  "xk":"kosovo","lv":"latvia","lt":"lithuania","lu":"luxembourg","mt":"malta",
  "md":"moldova","mc":"monaco","me":"montenegro","nl":"netherlands",
  "mk":"north macedonia","no":"norway","pl":"poland","pt":"portugal",
  "ro":"romania","rs":"serbia","sk":"slovakia","si":"slovenia","es":"spain",
  "se":"sweden","ch":"switzerland","tr":"turkey","ua":"ukraine","gb":"united kingdom",

  "ca":"canada","us":"united states","mx":"mexico","bz":"belize","cr":"costa rica",
  "sv":"el salvador","gt":"guatemala","hn":"honduras","ni":"nicaragua","pa":"panama",
  "ag":"antigua and barbuda","bs":"bahamas","bb":"barbados","cu":"cuba",
  "dm":"dominica","do":"dominican republic","gd":"grenada","ht":"haiti","jm":"jamaica",
  "pr":"puerto rico","lc":"saint lucia","kn":"saint kitts and nevis",
  "vc":"saint vincent and the grenadines","tt":"trinidad and tobago",

  "ar":"argentina","bo":"bolivia","br":"brazil","cl":"chile","co":"colombia",
  "ec":"ecuador","gy":"guyana","py":"paraguay","pe":"peru","sr":"suriname",
  "uy":"uruguay","ve":"venezuela",

  "dz":"algeria","ao":"angola","bj":"benin","bw":"botswana","bf":"burkina faso",
  "bi":"burundi","cm":"cameroon","cv":"cabo verde","cf":"central african republic",
  "td":"chad","km":"comoros","cg":"congo","cd":"democratic republic of the congo",
  "dj":"djibouti","eg":"egypt","gq":"equatorial guinea","er":"eritrea","et":"ethiopia",
  "ga":"gabon","gm":"gambia","gh":"ghana","gn":"guinea","gw":"guinea-bissau",
  "ci":"cote d'ivoire","ke":"kenya","ls":"lesotho","lr":"liberia","ly":"libya",
  "mg":"madagascar","mw":"malawi","ml":"mali","mr":"mauritania","mu":"mauritius",
  "ma":"morocco","mz":"mozambique","na":"namibia","ne":"niger","ng":"nigeria",
  "rw":"rwanda","sn":"senegal","sc":"seychelles","sl":"sierra leone","so":"somalia",
  "za":"south africa","sd":"sudan","tz":"tanzania","tg":"togo","tn":"tunisia",
  "ug":"uganda","zm":"zambia","zw":"zimbabwe",

  "af":"afghanistan","bh":"bahrain","bd":"bangladesh","bt":"bhutan","bn":"brunei",
  "kh":"cambodia","cn":"china","in":"india","id":"indonesia","ir":"iran","iq":"iraq",
  "il":"israel","jp":"japan","jo":"jordan","kw":"kuwait","kg":"kyrgyzstan",
  "la":"laos","lb":"lebanon","my":"malaysia","mv":"maldives","mn":"mongolia",
  "mm":"myanmar","np":"nepal","kp":"north korea","om":"oman","pk":"pakistan",
  "ph":"philippines","qa":"qatar","sa":"saudi arabia","sg":"singapore",
  "kr":"south korea","lk":"sri lanka","sy":"syria","tw":"taiwan","tj":"tajikistan",
  "th":"thailand","tl":"timor-leste","tm":"turkmenistan","ae":"united arab emirates",
  "uz":"uzbekistan","vn":"vietnam","ye":"yemen","hk": "hong kong",
  "mo": "macao",

  "au":"australia","fj":"fiji","nz":"new zealand","pg":"papua new guinea",
  "ws":"samoa","to":"tonga","vu":"vanuatu"
};

/* 2) Bygg reverse lookup: namn/alias → iso2 */
const COUNTRY_TO_ISO2 = {};
for (const [iso, name] of Object.entries(ISO2_BASE)) {
  COUNTRY_TO_ISO2[name] = iso;
  COUNTRY_TO_ISO2[name.replace(" and ", " & ")] = iso;
}

/* 3) Extra alias (svenska + vanliga språk) */
Object.assign(COUNTRY_TO_ISO2, {
  "sverige":"se","norge":"no","danmark":"dk","finland":"fi",
  "storbritannien":"gb","england":"gb","skottland":"gb","wales":"gb","nordirland":"gb",
  "usa":"us","united states of america":"us",
  "españa":"es","méxico":"mx","deutschland":"de","schweiz":"ch","italia":"it",
  "brasil":"br","japón":"jp","россия":"ru","rossiya":"ru"
});

/* 4) Normalisering */
function normalizeCountryKey(name){
  return (name||"").toLowerCase()
    .trim()
    .replace(/’/g,"'")
    .replace(/\./g,"")
    .replace(/,/g,"")
    .replace(/-/g," ")
    .replace(/\s+/g," ");
}

/* 5) Global flag resolver */
function flagURL(country, isoOverride = null){
  if (!country && !isoOverride) return null;

  // A) Om redan iso-override (supabase future-proof)
  if (isoOverride && ISO2_BASE[isoOverride]) {
    return `${WCL.FLAGS_BASE}/${isoOverride}.svg`;
  }

  const key = normalizeCountryKey(country);

  // B) Country är redan iso2
  if (ISO2_BASE[key]) {
    return `${WCL.FLAGS_BASE}/${key}.svg`;
  }

  // C) Vanliga namn/alias
  const iso = COUNTRY_TO_ISO2[key];
  return iso ? `${WCL.FLAGS_BASE}/${iso}.svg` : null;
}

/* ---------- Images ---------- */
const photoURL = (ref, w = 800) =>
  ref ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}` : WCL.FALLBACK_IMG;

function customPhotoUrl(store) {
  return safe(store?.photo_url || store?.photo_cdn_url || "").trim();
}

function storePhotoURL(store, w = 800) {
  return customPhotoUrl(store) || photoURL(store?.photo_reference, w);
}

function buildPhotoProxyUrl(photo_reference, maxwidth = 800) {
  if (!photo_reference) {
    return `${WCL.PHOTO_PROXY_URL}?fallback=1`;
  }
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(photo_reference)}&maxwidth=${maxwidth}`;
}

function photoSource(store) {
  if (customPhotoUrl(store)) return "custom";
  if (store?.photo_reference) return "google";
  return "fallback";
}

function photoSourceLabel(source) {
  return {
    custom: "Custom image",
    google: "Google Places",
    fallback: "No image"
  }[source] || "Unknown";
}

function isValidReplacementPhotoUrl(value) {
  if (!value) return true;
  return /^https:\/\/[^\s]+$/i.test(value);
}

function isMissingPhotoUrlColumnError(error) {
  const text = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("photo_url") && (
    text.includes("does not exist") ||
    text.includes("could not find") ||
    text.includes("schema cache") ||
    text.includes("column")
  );
}


/* ---------- Google photo refs ---------- */
async function fetchPhotoRefs(placeId) {
  if (!placeId) return [];
  try {
    const url = `${WCL.PHOTO_REFS_URL}?place_id=${encodeURIComponent(placeId)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return [];
    const json = await res.json();  // { refs: [...] }
    return Array.isArray(json?.refs) ? json.refs : [];
  } catch (e) {
    console.warn("fetchPhotoRefs failed:", e);
    return [];
  }
}

/* ============================================================
   COUNTRY HELPERS
   ============================================================ */

// Normaliserar namn (så "Germany", "germany", "GERMANY" blir samma)
function normalizeCountry(name) {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replaceAll("å", "a")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("é", "e")
    .replaceAll("è", "e");
}

//  Mappning från land → kontinent (för flaggor & hierarki)
const countryContinentMap = {
  germany: "Europe",
  sweden: "Europe",
  norway: "Europe",
  denmark: "Europe",
  france: "Europe",
  spain: "Europe",
  italy: "Europe",
  united_kingdom: "Europe",
  usa: "North America",
  united_states: "North America",
  canada: "North America",
  mexico: "North America",
  brazil: "South America",
  argentina: "South America",
  south_africa: "Africa",
  egypt: "Africa",
  morocco: "Africa",
  china: "Asia",
  japan: "Asia",
  thailand: "Asia",
  singapore: "Asia",
  australia: "Oceania",
  new_zealand: "Oceania",
};

//  Omvandla land → kontinent
function countryToContinent(country) {
  if (!country) return "Unknown";
  const c = normalizeCountry(country).replaceAll(" ", "_");
  return countryContinentMap[c] || "Unknown";
}

function setPillCount(tab, count) {
  const pill = $(`.filters .pill[data-tab="${tab}"]`);
  if (!pill) return;

  let badge = pill.querySelector(".badge-count");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "badge-count";
    pill.appendChild(badge);
  }

  badge.textContent = `(${Number(count) || 0})`;
}

async function refreshReportPillCount() {
  try {
    const { data, error } = await WCL.supabase
      .rpc("bo_list_store_reports_v1", { p_status: "pending" });

    if (error) throw error;

    setPillCount("reports", Array.isArray(data) ? data.length : 0);
  } catch (error) {
    console.error("Report count failed:", error);
  }
}


/* ============================================================
   REGION COUNTS — använder RPC (ingen 1000-limit)
   ============================================================ */
function updateRegionCounts() {
  const c = window.STORE_COUNTS;
  if (!c) {
    console.warn(" STORE_COUNTS saknas");
    return;
  }

  const counts = {
    all: c.all_count,
    approved: c.approved_count,
     duplicates: c.duplicates_count,
    pending: c.pending_count,
    flagged: c.flagged_count,
    deleted: c.deleted_count,
    repair: c.repair_count,
  };

  $$(".filters .pill").forEach(p => {
    const tab = p.dataset.tab;
    const n = counts[tab];
    if (n === undefined) return;

    setPillCount(tab, n);
  });

  debugLog("Region counts (RPC):", counts);
}

/* ============================================================
   RENDER SWITCH — Cards vs List (CANONICAL)
   ============================================================ */
function render() {

  if (CURRENT_TAB === "photos") {
    renderPhotoReview();
    return;
  }

  const term = ($("#searchInput")?.value || "").trim().toLowerCase();

  let list = STORES;

  // ============================================================
  // SEARCH
  // ============================================================

  if (term) {
    list = list.filter((s) => storeMatchesSearch(s, term));
  }


  // ============================================================
  // RENDER VIEW
  // ============================================================

  if (CURRENT_VIEW === "cards") {
    renderCards(list);
  } else {
    renderListView(list);
  }

  // ============================================================
  // LOAD MORE BUTTON
  // ============================================================

  if (CURRENT_TAB === "approved" && CURRENT_VIEW === "cards" && STORES.length > RENDER_LIMIT) {

    const grid = $("#cards");
    if (!grid) return;

    const info = document.createElement("div");
    info.className = "load-more-wrap";

    info.innerHTML = `
      <div class="muted center">
        Showing ${Math.min(RENDER_LIMIT, STORES.length)} / ${STORES.length} stores
      </div>
      <button class="btn blue load-more-btn">
        Load More
      </button>
    `;

    info.querySelector("button").onclick = () => {
      RENDER_LIMIT += RENDER_STEP;
      render();
    };

    grid.appendChild(info);
  }

}

/* ============================================================
   DATA LOADING — STABIL, FÖRUTSÄGBAR & UX-SÄKER
   ============================================================ */
async function reloadData(tab = CURRENT_TAB) {
debugLog("RELOAD CALLED WITH:", tab);
debugLog("CURRENT_TAB BEFORE SET:", CURRENT_TAB);
   
  const prevTab = CURRENT_TAB;

  if (tab !== prevTab) {
    RENDER_LIMIT = 100;
  }

  CURRENT_TAB = tab;
debugLog("CURRENT_TAB AFTER SET:", CURRENT_TAB);
  /* =========================
     UI: active tab
     ========================= */
  $$(".filters .pill").forEach((p) =>
    p.classList.toggle("active", p.dataset.tab === CURRENT_TAB)
  );

  if (CURRENT_TAB === "photos") {
    return loadPhotoReview();
  }

  /* =========================
   HARD STOP — PENDING (CANONICAL FIX)
   ========================= */
if (CURRENT_TAB === "pending") {

  try {

    const { data, error } = await WCL.supabase
      .from("store_pending")
      .select("*")
      .order("id", { ascending: true });
     debugLog("PENDING RAW DATA:", data);

    if (error) throw error;

    // Pending has its own ID space. Never treat pending IDs as store IDs.
    STORES = (data || []).map(normalizePendingSubmission);

    render();
    updateRegionCounts();
    void refreshReportPillCount();

    return;

  } catch (error) {

    console.error("Fetch pending failed:", error);

    const grid = document.getElementById("cards");
    if (grid) {
      grid.innerHTML = "<p class='error center'>Error loading pending</p>";
    }

    return;
  }
}
  /* =========================
     Bevara scroll-position
     ========================= */
  const scrollY = window.scrollY;

  /* =========================
     Cards/List toggle
     ========================= */
  if (CURRENT_VIEW === "cards") {
    $("#cards") && ($("#cards").style.display = "grid");
    $(".listview-wrap") && ($(".listview-wrap").style.display = "none");
  } else {
    $("#cards") && ($("#cards").style.display = "none");
    $(".listview-wrap") && ($(".listview-wrap").style.display = "flex");
  }

  const grid = $("#cards");
  if (grid) grid.innerHTML = "<p class='muted center'>Loading...</p>";

  /* =========================
     1) HÄMTA COUNTS
     ========================= */
  let countsData = null;

  try {

    const res = await WCL.supabase.rpc("stores_counts");

    countsData = res.data;

    if (res.error) {
      console.error("Count RPC error:", res.error);
    }

  } catch (e) {

    console.error("Count RPC network error:", e);

  }

  window.STORE_COUNTS = countsData?.[0] || {
    all: 0,
    approved: 0,
    pending: 0,
    flagged: 0,
    deleted: 0,
    repair: 0,
  };

  /* =========================
     2) Bas-query (stores)
     ========================= */
  let base = WCL.supabase
    .from("stores")
    .select(STORE_SELECT_FIELDS);

  /* ============================================================
     TAB LOGIC
     ============================================================ */

  if (tab === "approved") {

    base = base
      .eq("approved", true)
      .eq("deleted", false)
      .order("id", { ascending: false });

  } else if (tab === "flagged") {

    base = base
      .eq("flagged", true)
      .eq("deleted", false)
      .order("id", { ascending: false });

  } else if (tab === "duplicates") {

    base = base
      .eq("flagged", true)
      .eq("deleted", false)
      .eq("flag_reason", "possible_duplicate")
      .order("id", { ascending: false });

  } else if (tab === "deleted") {

    base = base
      .eq("deleted", true)
      .order("id", { ascending: false });

  } else if (tab === "reports") {

    return loadStoreReports();

  } else {

    base = base
      .eq("deleted", false)
      .order("id", { ascending: false });

  }

  /* =========================
     3) Fetch rows
     ========================= */
  let data;

  try {

    if (CURRENT_TAB === "approved" && CURRENT_VIEW === "cards") {

      const { data: rows, error } = await base.limit(RENDER_LIMIT);

      if (error) throw error;

      data = rows;

    } else {

      data = await fetchAllStores(base);

    }

    STORES = data;

  } catch (error) {

    console.error("Fetch stores failed:", error);

    if (grid) {
      grid.innerHTML = "<p class='error center'>Error loading stores</p>";
    }

    return;
  }

  /* =========================
     4) Render + counts
     ========================= */
  render();
  updateRegionCounts();
  void refreshReportPillCount();

  /* =========================
     Återställ scroll
     ========================= */
  window.scrollTo(0, scrollY);

  debugLog(
    `reloadData(): tab=${CURRENT_TAB}, shown=${STORES.length}`
  );
}

/* ===================== CARDS ===================== */
function renderCards(list) {
  const grid = $("#cards");
  grid.classList.remove("photo-review-grid");
  grid.innerHTML = "";

  list.forEach((s) => {
 const borderClass =
  s._is_reported
    ? "border-orange"
    : s.flag_reason === "possible_duplicate"
    ? "border-turquoise"
    : s.deleted
    ? "border-gray"
    : s.flagged
    ? "border-red"
    : s.approved
    ? "border-green"
    : "border-gold";

const card = document.createElement("div");
card.className = `card ${borderClass}`;

// ============================================================
// DATASET FOR ANALYTICS
// ============================================================

card.dataset.storeId = s.id;
card.dataset.city = s.city;
card.dataset.country = s.country;

// ============================================================
// STORE VIEW OBSERVER
// ============================================================

initStoreViewObserver();
storeViewObserver.observe(card);

    /* ----------- Photo ----------- */
    const img = document.createElement("img");
    img.className = "photo";
    img.src = storePhotoURL(s, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* ----------- Body ----------- */
    const body = document.createElement("div");
    body.className = "body";

/* ----------- Store ID (admin only) ----------- */
const idRow = document.createElement("div");
idRow.className = "store-id";
idRow.textContent = isPendingSubmission(s) ? `Pending ID: ${s.id}` : `ID: ${s.id}`;
body.appendChild(idRow);

/* ----------- Name (2 lines) ----------- */
const h3 = document.createElement("h3");
h3.className = "twoline";
h3.textContent = safe(s.name);
body.appendChild(h3);


    /* ----------- Type Badges (inline under name) ----------- */
const types = Array.isArray(s.types) ? s.types : (s.type ? [s.type] : []);
     const typeBadges = types.map(t => {
  const color =
    t === "store" ? "blue" :
    t === "lounge" ? "gold" : "gray";
  let html = `<span class="badge ${color}">${t}</span>`;

  //  Lägg till access-badge direkt efter LOUNGE
  if (t === "lounge" && s.access) {
    const accessColor =
      s.access === "public" ? "green" :
      s.access === "members" ? "purple" :
      "gray";
    html += `<span class="badge access ${accessColor}">${s.access.toUpperCase()}</span>`;
  }

  return html;
}).join(" ");

    const badgeWrap = document.createElement("div");
    badgeWrap.className = "badge-wrap";
    badgeWrap.innerHTML = typeBadges || `<span class="badge gray">–</span>`;
    body.appendChild(badgeWrap);

/* ----------- Flag + Country/City + Continent ----------- */
const loc = document.createElement("div");
loc.className = "locrow";

/* -- Översta raden: flagga + land + stad -- */
const locTop = document.createElement("div");
locTop.className = "loc-top";

const flagSrc = flagURL(s.country, s.country_iso2);
if (flagSrc) {
  const flag = document.createElement("img");
  flag.className = "flag";
  flag.src = flagSrc;
  flag.alt = safe(s.country);
  flag.onerror = () => (flag.style.display = "none");
  locTop.appendChild(flag);
}

const geo = document.createElement("span");
geo.className = "loc-text";
geo.textContent = `${safe(s.country)}, ${safe(s.city)}`;
locTop.appendChild(geo);
loc.appendChild(locTop);

/* -- Ny rad under: kontinent -- */
if (s.continent) {
  const cont = document.createElement("div");
  cont.className = "continent-line";
  cont.textContent = safe(s.continent);
  loc.appendChild(cont);
}

body.appendChild(loc);

    /* ----------- Info Block ----------- */
    const info = document.createElement("div");
    info.className = "infoblock";

    info.innerHTML = `
      <p class="truncate"><strong>Address:</strong> ${safe(s.address || "–")}</p>
      <p class="truncate"><strong>Phone:</strong> ${safe(s.phone || "–")}</p>
      <p class="truncate"><strong>Website:</strong> ${
        s.website
          ? `<a href="${safe(s.website)}" target="_blank" rel="noopener">Visit</a>`
          : "–"
      }</p>
    `;
    body.appendChild(info);

    /* ----------- Reviews Link ----------- */
    if (!isPendingSubmission(s)) {
      const reviewsLink = document.createElement("div");
      reviewsLink.className = "reviewslink";
      reviewsLink.innerHTML = `
        <button class="btn small ghost" type="button" data-edit-store-id="${s.id}">
           View Comments / Reviews
        </button>
      `;
      body.appendChild(reviewsLink);
    }

     if (s._is_reported) {
  const reportInfo = document.createElement("div");
  reportInfo.className = "report-info";
  reportInfo.innerHTML = buildReportDetails(s);
  body.appendChild(reportInfo);
}

   /* ----------- Status badges ---------- */
const status = document.createElement("div");
status.className = "badges";

let reportBadges = "";

if (s._is_reported) {
  const reportCount = Number(s._report_count) || 1;
  const reportStatus = s._report_status || "pending";

  reportBadges += `
    <span class="badge orange">
      REPORT x${reportCount}
    </span>
    <span class="badge orange ghost">
      ${safe(reportStatus).toUpperCase()}
    </span>
  `;
}

status.innerHTML = `
  ${reportBadges}
  ${s.approved ? `<span class='badge green'>APPROVED</span>` : ""}
  ${s.flagged ? `<span class='badge red'>FLAGGED</span>` : ""}
  ${s.deleted ? `<span class='badge gray'>DELETED</span>` : ""}
  ${!s.approved && !s.flagged && !s.deleted ? `<span class='badge gold'>PENDING</span>` : ""}
  <span style="margin-left:6px;color:var(--muted)"> ${s.rating ?? "–"}</span>
`;

body.appendChild(status);

     /* ----------- Actions ----------- */
const actions = document.createElement("div");
actions.className = "actions";

/* 🔶 REPORT MODERATION (om report) */
if (s._is_reported) {

  const reviewedBtn = makeBtn("Mark Reviewed", async () => {
    await moderateReport(
      s._report_id,
      "set_reviewed",
      reportModerationNote(s, "set_reviewed")
    );
  }, "small orange");

  const resolveBtn = makeBtn("Resolve", async () => {
    await moderateReport(
      s._report_id,
      "resolve",
      reportModerationNote(s, "resolve")
    );
  }, "small green");

  const rejectBtn = makeBtn("Reject", async () => {
    await moderateReport(
      s._report_id,
      "reject",
      reportModerationNote(s, "reject")
    );
  }, "small danger");

  actions.append(reviewedBtn, resolveBtn, rejectBtn);
}

if (isPendingSubmission(s)) {
  const approveBtn = makeBtn("Approve", () => approveStore(s.id), "green");
  const rejectBtn = makeBtn("Reject Pending", () => rejectPendingSubmission(s.id), "danger");

  actions.append(approveBtn, rejectBtn);
} else {
  const deleteBtn  = makeBtn(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "danger");
  const editBtn    = makeBtn("Edit", null, "blue");
  const repairBtn  = makeBtn("Repair Photo", (ev) => repairPhoto(s.id, s.place_id, img, ev), "orange");

  editBtn.dataset.editStoreId = s.id;

  actions.append(deleteBtn, editBtn, repairBtn);
}

card.appendChild(body);
card.appendChild(actions);
grid.appendChild(card);

  }); // stänger forEach
}     // stänger renderCards

/* ==================== EDIT MODAL ================= */
async function editStore(id) {
  closeEdit();

  let storeResp;
  let commentsResp;

  try {
    //  Hämta store + kommentarer parallellt
    [storeResp, commentsResp] = await Promise.all([
      WCL.supabase.from("stores").select("*").eq("id", id).single(),
      WCL.supabase.from("store_comments").select("*").eq("store_id", id).order("created_at", { ascending: false })
    ]);
  } catch (err) {
    console.error("Edit load crashed:", err);
    toast("Edit could not open", "error");
    return;
  }

  const store = storeResp?.data;
  const error = storeResp?.error;
  const comments = commentsResp?.data || [];

  if (error || !store) {
    toast("Edit could not load this store", "error");
    console.error("Edit load failed:", error);
    return;
  }

  //  Bygg modal
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="modal">
      <h3>Edit Store</h3>
      <div class="edit-grid">

        <label>Name</label>
        <input id="edit-name" value="${safe(store.name)}" />

        <label>Address</label>
        <input id="edit-address" value="${safe(store.address || '')}" />

        <label>Phone</label>
        <input id="edit-phone" value="${safe(store.phone || '')}" />

        <label>City</label>
        <input id="edit-city" value="${safe(store.city)}" />

        <label>Country</label>
        <input id="edit-country" value="${safe(store.country)}" />

        <label>Continent</label>
        <select id="edit-continent">
          <option value="">(Auto)</option>
          <option>Europe</option>
          <option>North America</option>
          <option>South America</option>
          <option>Asia</option>
          <option>Africa</option>
          <option>Oceania</option>
          <option>Other</option>
        </select>

        <label>Website</label>
        <input id="edit-website" value="${safe(store.website)}" />

        <label>Type</label>
        <div class="type-group">
          <label class="type-btn"><input type="checkbox" value="store"> Store</label>
          <label class="type-btn"><input type="checkbox" value="lounge"> Lounge</label>
        </div>

        <label>Access</label>
        <div class="access-group">
          <label class="access-pill"><input type="radio" name="access" value="public"><span>Public</span></label>
          <label class="access-pill"><input type="radio" name="access" value="members"><span>Members Only</span></label>
        </div>

        <label>Photo</label>
        <div class="photo-picker">
          <button id="edit-prev" class="photo-nav">◀</button>
          <img id="edit-photo" class="preview-photo"
            src="${store.photo_reference ? buildPhotoProxyUrl(store.photo_reference) : WCL.FALLBACK_IMG}" />
          <button id="edit-next" class="photo-nav">▶</button>
        </div>

        <div id="photo-meta" class="muted center">
          ${store.photo_reference ? "Loaded from proxy" : "No photo loaded"}
        </div>

        ${
          comments.length
            ? `<label>Comments (${comments.length})</label>
               <div class="comment-list">
                 ${comments.map((c) => `
                   <div class="comment-item">
                     <p><strong>${safe(c.user_name || "Anon")}:</strong> ${safe(c.comment)}</p>
                     <span class="muted">${new Date(c.created_at).toLocaleString()}</span>
                     <button class="btn small ghost del-comment" data-id="${c.id}">🗑️</button>
                   </div>`).join("")}
               </div>`
            : `<label>Comments</label><p class="muted">No comments yet.</p>`
        }

      </div>

      <div class="row">
        <button class="btn ghost" id="edit-cancel">Cancel</button>
        <button class="btn blue" id="edit-save">Save</button>
        <button class="btn orange" id="repair-photo">Repair Photo</button>
        ${store.flagged ? `<button class="btn yellow" id="edit-unflag">Unflag</button>` : ""}
        <button class="btn danger" id="edit-delete">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.classList.add("modal-open");
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeEdit();
  });

  //  Fyll kontinent
  const contSel = $("#edit-continent");
  const defaultCont = store.continent || countryToContinent(store.country);
  if (defaultCont) contSel.value = defaultCont;

  //  Typval – återställ
  modal.querySelectorAll(".type-btn input").forEach(cb => {
    cb.checked = (store.types || []).includes(cb.value);
  });

  //  Access
  modal.querySelectorAll(".access-pill input").forEach(radio => {
    radio.checked = store.access === radio.value;
  });

 // ==================== FOTO-NAVIGATION (LOCKED START) ====================

// 1) Hämta refs från Google
let refs = await fetchPhotoRefs(store.place_id);

// 2) 🔒 LÅS: säkerställ att sparad bild alltid ligger först
if (store.photo_reference) {
  refs = [
    store.photo_reference,
    ...refs.filter(r => r !== store.photo_reference)
  ];
}

// 3) Starta ALLTID på låst bild
let currentIndex = 0;

// 4) DOM
const imgEl = modal.querySelector("#edit-photo");
imgEl.setAttribute("crossorigin", "anonymous");
const metaEl = modal.querySelector("#photo-meta");

// 5) Render-funktion
function showCurrent() {
  if (!refs.length) {
    imgEl.src = buildPhotoProxyUrl(null);
    metaEl.textContent = "No photo loaded";
    return;
  }

  // Safari-fix: reset src först
  imgEl.src = "";
  imgEl.src = buildPhotoProxyUrl(refs[currentIndex]);

  metaEl.textContent = `Photo ${currentIndex + 1} / ${refs.length} (locked start)`;
}

// 6) Init
showCurrent();

// 7) Navigation
$("#edit-prev").onclick = () => {
  if (!refs.length) return;
  currentIndex = (currentIndex - 1 + refs.length) % refs.length;
  showCurrent();
};

$("#edit-next").onclick = () => {
  if (!refs.length) return;
  currentIndex = (currentIndex + 1) % refs.length;
  showCurrent();
};


  //  Delete comment
  modal.querySelectorAll(".del-comment").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this comment?")) return;
      const cid = btn.dataset.id;
      const { error } = await WCL.supabase.from("store_comments").delete().eq("id", cid);
      if (error) return toast("Error deleting comment", "error");
      toast("Comment deleted ");
      closeEdit();
      editStore(id);
    });
  });

  //  Save button
  $("#edit-save").onclick = async () => {
    const selectedTypes = Array.from(modal.querySelectorAll(".type-btn input:checked")).map(cb => cb.value);
    const selectedAccess = modal.querySelector("input[name='access']:checked")?.value || null;

    const payload = {
      name: $("#edit-name").value.trim(),
      address: $("#edit-address").value.trim(),
      phone: $("#edit-phone").value.trim(),
      city: $("#edit-city").value.trim(),
      country: $("#edit-country").value.trim(),
      continent: $("#edit-continent").value || null,
      website: $("#edit-website").value.trim(),
      types: selectedTypes, //  array
      access: selectedAccess,
      photo_reference: refs.length ? refs[currentIndex] : null,
    };

    const { error } = await WCL.supabase.from("stores").update(payload).eq("id", id);
    if (error) {
      console.error(" Supabase update failed:", error);
      return toast("Error saving", "error");
    }

    toast(" Store updated!");
    closeEdit();
    reloadData(CURRENT_TAB);
  };

  $("#edit-cancel").onclick = closeEdit;
}

/* ==================== CLOSE MODAL ================= */
function closeEdit() {
  document.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());
  document.body.classList.remove("modal-open");
}

window.editStore = editStore;
window.rejectPendingSubmission = rejectPendingSubmission;
/* ============================================================
   STORE REPORTS — STORE-CENTRIC MODERATION (PENDING ONLY)
   ============================================================ */

async function loadStoreReports() {

  const grid = $("#cards");
  const listWrap = $(".listview-wrap");

  if (grid) grid.innerHTML = "<p class='muted center'>Loading reports...</p>";
  if (listWrap) listWrap.style.display = "none";

  // 🔒 Only pending reports (active moderation queue)
  const { data, error } = await WCL.supabase
    .rpc("bo_list_store_reports_v1", { p_status: "pending" });

  if (error) {
    console.error(error);
    if (grid) grid.innerHTML = "<p class='error center'>Error loading reports</p>";
    return;
  }

  setPillCount("reports", Array.isArray(data) ? data.length : 0);

  if (!data || !data.length) {
    STORES = [];
    render();
    return;
  }

  const reportDetails = await Promise.all(
    data.map((r) => fetchReportDetails(r.id))
  );

  // 🔁 Transform reports → store-like objects
  STORES = data.map((r, index) => {
    const detailReport = reportDetails[index]?.report || {};
    const reportTypes =
      Array.isArray(detailReport.report_types)
        ? detailReport.report_types
        : null;

    return {
      id: r.store_id,
      name: r.store_name,
      city: r.city,
      country: r.country,
      continent: r.continent,
      types: r.types,
      access: r.access,
      rating: r.rating,
      address: r.address,
      phone: r.phone,
      website: r.website,
      photo_reference: r.photo_reference,
      country_iso2: r.country_iso2,

      // Report metadata
      _is_reported: true,
      _report_id: r.id,
      _report_type: detailReport.report_type || r.report_type,
      _report_types: reportTypes,
      _report_count: detailReport.report_count || r.report_count,
      _report_status: detailReport.status || r.status,
      _report_messages: detailReport.messages || []
    };
  });

  render();
}

/* ===================== UI WIRING ========================= */
document.addEventListener("DOMContentLoaded", () => {
  debugLog("DOM fully loaded — Backoffice ready");

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-store-id]");
    if (!editButton) return;

    event.preventDefault();
    event.stopPropagation();

    const storeId = Number(editButton.dataset.editStoreId);
    if (!Number.isFinite(storeId)) return;

    editStore(storeId);
  });

  //  Filterknappar
  $$(".filters .pill").forEach((p) =>
    p.addEventListener("click", () => {
      CURRENT_TAB = p.dataset.tab;
      reloadData(CURRENT_TAB);
    })
  );

  //  Växla vy (kort / lista)
  $$(".viewtoggle .seg").forEach((seg) =>
    seg.addEventListener("click", () => {
      $$(".viewtoggle .seg").forEach((x) => x.classList.remove("active"));
      seg.classList.add("active");
      CURRENT_VIEW = seg.dataset.view;

      if (CURRENT_VIEW === "cards") {
        $("#cards").style.display = "grid";
        $(".listview-wrap").style.display = "none";
      } else {
        $("#cards").style.display = "none";
        $(".listview-wrap").style.display = "flex";
      }

      reloadData(CURRENT_TAB);
    })
  );

  // ============================================================
  // SEARCH — TAB-AWARE (FIX)
  // ============================================================

  $("#searchInput")?.addEventListener("input", async (e) => {

    const term = e.target.value.trim();

    if (CURRENT_TAB === "photos") {
      PHOTO_RENDER_LIMIT = 120;
      renderPhotoReview();
      return;
    }

    // Tomt → tillbaka till normal state
    if (!term) {
      await reloadData(CURRENT_TAB);
      return;
    }

    debugLog("Searching DB:", term, "TAB:", CURRENT_TAB);

    if (CURRENT_TAB === "reports") {
      render();
      return;
    }

    let table = "stores";

    if (CURRENT_TAB === "pending") {
      table = "store_pending";
    }

    const searchFilter = buildSearchOrFilter(table, term);
    if (!searchFilter) {
      render();
      return;
    }

    let query = WCL.supabase
      .from(table)
      .select(table === "stores" ? STORE_SELECT_FIELDS : "*")
      .or(searchFilter)
      .limit(150);

    if (table === "stores") {
      if (CURRENT_TAB === "approved") {
        query = query
          .eq("approved", true)
          .eq("deleted", false);
      } else if (CURRENT_TAB === "flagged") {
        query = query
          .eq("flagged", true)
          .eq("deleted", false);
      } else if (CURRENT_TAB === "duplicates") {
        query = query
          .eq("flagged", true)
          .eq("deleted", false)
          .eq("flag_reason", "possible_duplicate");
      } else if (CURRENT_TAB === "deleted") {
        query = query.eq("deleted", true);
      } else {
        query = query.eq("deleted", false);
      }

      query = query.order("id", { ascending: false });
    } else {
      query = query.order("id", { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return;
    }

    STORES = CURRENT_TAB === "pending"
      ? (data || []).map(normalizePendingSubmission)
      : (data || []);

    render();
  });

});
/* ===================== BUTTON ===================== */
function makeBtn(label, onclick, cls = "") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn ${cls}`.trim();
  b.textContent = label;
  if (typeof onclick === "function") b.onclick = onclick;
  return b;
}

/* ==================== MOD ACTIONS ================= */

/*  APPROVE — pending → stores */
async function approveStore(id) {

  debugLog("APPROVE CLICK ID:", id);

  const { data, error } = await WCL.supabase
    .rpc("approve_store_pending", { p_id: id });

  debugLog("RPC RESPONSE:", data, error);

  if (error) {
    console.error("Approve failed:", error);

    const isConflict =
      error.code === "23505" ||
      error.status === 409 ||
      /duplicate|conflict|unique/i.test(
        `${error.message || ""} ${error.details || ""}`
      );

    toast(
      isConflict
        ? "Approve blocked: possible duplicate listing"
        : `Approve failed: ${error.message || "database rejected it"}`,
      "error"
    );

    return;
  }

  toast("Approved ");
  await reloadData(CURRENT_TAB);
}

/*  UNFLAG */
async function unflagStore(id) {
  const { error } = await WCL.supabase
    .from("stores")
    .update({
      flagged: false,
      flag_reason: null
    })
    .eq("id", id);

  if (error) {
    console.error("Unflag failed:", error);
    toast("Error unflagging", "error");
    return;
  }

  toast("Unflagged ");
  await reloadData(CURRENT_TAB);
}


/* 🗑️ DELETE / RESTORE */
async function toggleDelete(s) {
  if (isPendingSubmission(s)) {
    toast("Pending items use Reject Pending, not store Delete", "error");
    return;
  }

  const next = !s.deleted;

  const { error } = await WCL.supabase
    .from("stores")
    .update({ deleted: next })
    .eq("id", s.id);

  if (error) {
    console.error("Delete toggle failed:", error);
    toast("Error updating delete", "error");
    return;
  }

  toast(next ? "Moved to Trash " : "Restored ");
  await reloadData(CURRENT_TAB);
}

async function toggleDeleteById(id) {
  const s = STORES.find(x => x.id === id);
  if (!s) {
    toast("Store not found in memory, reloading…", "error");
    await reloadData(CURRENT_TAB);
    return;
  }
  return toggleDelete(s);
}

async function rejectPendingSubmission(id) {
  if (!confirm("Reject this pending listing? This removes it from the pending queue.")) return;

  const { error } = await WCL.supabase
    .from("store_pending")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Reject pending failed:", error);
    toast("Pending reject needs admin DB permission", "error");
    return;
  }

  toast("Pending listing rejected");
  await reloadData("pending");
}
     /* ==================== REPAIR PHOTO ================= */
async function repairPhoto(id, place_id, imgEl, ev) {
  const row = ev?.target?.closest?.("tr") || null;
  if (row) row.style.transition = "background-color 0.4s ease";

  if (!place_id) {
    toast("No place_id found for this store", "error");
    return;
  }

  //  Markera raden under arbete
  if (row) row.style.backgroundColor = "rgba(255,165,0,0.25)";
  toast("Repairing photo...", "info");

  try {
    const refs = await fetchPhotoRefs(place_id);
    if (!refs.length) {
      toast("No photos found from Google", "error");
      if (row) row.style.backgroundColor = "";
      return;
    }

    const newRef = refs[0];
    const { error } = await WCL.supabase
      .from("stores")
      .update({ photo_reference: newRef })
      .eq("id", id);

    if (error) {
      console.error(error);
      toast("Error updating photo", "error");
      if (row) row.style.backgroundColor = "";
      return;
    }

    //  Lyckades — grön blink!
    toast("Photo repaired ");
    if (imgEl) imgEl.src = buildPhotoProxyUrl(newRef);
    if (row) {
      row.style.backgroundColor = "rgba(144,238,144,0.4)"; // ljusgrön
      setTimeout(() => (row.style.backgroundColor = ""), 800);
    }

  } catch (e) {
    console.error(e);
    toast("Repair failed", "error");
    if (row) row.style.backgroundColor = "";
  }
}

     
async function moderateReport(reportId, action, note = null) {

  const { error } = await WCL.supabase.rpc(
    "bo_moderate_store_report_v1",
    {
      p_report_id: reportId,
      p_action: action,
      p_note: note
    }
  );

  if (error) {
    console.error("Report moderation failed:", error);
    toast("Moderation failed", "error");
    return;
  }

  toast("Report updated");
  await reloadData("reports");
}
