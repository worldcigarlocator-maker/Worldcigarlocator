/* ============================================================
   Backoffice — Moderation + Hierarki + Edit + Proxy + ISO Flags
   ============================================================ */

console.log(" Backoffice loaded ");

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
let CURRENT_TAB = "approved";   // approved | pending | flagged | deleted | duplicates | reports
let CURRENT_VIEW = "cards";     // cards | list
let HIER_SEL = { continent: null, country: null, state: null, city: null };

// ============================================================
// RENDER LIMIT (Backoffice performance)
// ============================================================

let RENDER_LIMIT = 100;
let RENDER_STEP = 100;


/* ======================== HELPERS ======================== */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const safe = (v) => (v ?? "").toString();

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

      console.log("Store viewed:", storeId);

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
            <button class="btn small blue" onclick="editStore(${s.id})">Edit</button>
            <button class="btn small green" onclick="approveStore(${s.id})">Approve</button>
            ${
              !hasPhoto
                ? `<button class="btn small orange"
onclick="repairPhoto(${s.id}, '${(s.place_id || "").replace(/'/g, "\\'")}', null, event)">
                   Repair
                 </button>`
                : ""
            }
            <button class="btn small danger" onclick="toggleDeleteById(${s.id})">Delete</button>
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

function buildPhotoProxyUrl(photo_reference, maxwidth = 800) {
  if (!photo_reference) {
    return `${WCL.PHOTO_PROXY_URL}?fallback=1`;
  }
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(photo_reference)}&maxwidth=${maxwidth}`;
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

    let badge = p.querySelector(".badge-count");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "badge-count";
      badge.style.marginLeft = "6px";
      badge.style.fontSize = ".85rem";
      badge.style.opacity = "0.7";
      p.appendChild(badge);
    }
    badge.textContent = `(${n})`;
  });

  console.log(" Region counts (RPC):", counts);
}

/* ============================================================
   RENDER SWITCH — Cards vs List (CANONICAL)
   ============================================================ */
function render() {

  const term = ($("#searchInput")?.value || "").trim().toLowerCase();

  let list = STORES;

  // ============================================================
  // SEARCH
  // ============================================================

  if (/^\d+$/.test(term)) {
    const id = Number(term);
    list = list.filter(s => s.id === id);
  }
  else if (term) {
    list = list.filter(s =>
      [s.name, s.city, s.country]
        .some(v => safe(v).toLowerCase().includes(term))
    );
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

  if (tab !== CURRENT_TAB) {
    RENDER_LIMIT = 100;
  }

  CURRENT_TAB = tab;

  /* =========================
     UI: active tab
     ========================= */
  $$(".filters .pill").forEach((p) =>
    p.classList.toggle("active", p.dataset.tab === CURRENT_TAB)
  );

  /* =========================
     HARD STOP — PENDING (egen tabell)
     ========================= */
  if (CURRENT_TAB === "pending") {

    try {

      const { data, error } = await WCL.supabase
        .from("store_pending")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      STORES = data || [];

      render();
      updateRegionCounts();

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
  const SELECT_FIELDS =
    "id,name,city,country,continent,type,types,address,phone,access,rating," +
    "approved,flagged,deleted,status,photo_reference,place_id,website," +
    "created_at,flag_reason,country_iso2";

  let base = WCL.supabase
    .from("stores")
    .select(SELECT_FIELDS);

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

  /* =========================
     Återställ scroll
     ========================= */
  window.scrollTo(0, scrollY);

  console.log(
    `reloadData(): tab=${CURRENT_TAB}, shown=${STORES.length}`
  );
}

/* ===================== CARDS ===================== */
function renderCards(list) {
  const grid = $("#cards");
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
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* ----------- Body ----------- */
    const body = document.createElement("div");
    body.className = "body";

/* ----------- Store ID (admin only) ----------- */
const idRow = document.createElement("div");
idRow.className = "store-id";
idRow.textContent = `ID: ${s.id}`;
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
    const reviewsLink = document.createElement("div");
    reviewsLink.className = "reviewslink";
    reviewsLink.innerHTML = `
      <button class="btn small ghost" onclick="editStore(${s.id})">
         View Comments / Reviews
      </button>
    `;
    body.appendChild(reviewsLink);

     if (s._is_reported) {
  const reportInfo = document.createElement("div");
  reportInfo.className = "report-info";
  reportInfo.innerHTML = `
    <div class="report-line">
      ⚠ Reported issue:
      <strong>${safe(s._report_type)}</strong>
    </div>
  `;
  body.appendChild(reportInfo);
}

   /* ----------- Status badges ---------- */
const status = document.createElement("div");
status.className = "badges";

let reportBadges = "";

if (s._is_reported) {
  reportBadges += `
    <span class="badge orange">
      REPORT x${s._report_count}
    </span>
    <span class="badge orange ghost">
      ${s._report_status?.toUpperCase()}
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

  const reviewedBtn = makeBtn("Set Reviewed", async () => {
    await moderateReport(s._report_id, "set_reviewed");
  }, "small orange");

  const resolveBtn = makeBtn("Resolve", async () => {
    await moderateReport(s._report_id, "resolve");
  }, "small green");

  const rejectBtn = makeBtn("Reject", async () => {
    await moderateReport(s._report_id, "reject");
  }, "small danger");

  actions.append(reviewedBtn, resolveBtn, rejectBtn);
}

/* 🔹 STORE ACTIONS (som vanligt) */
const approveBtn = makeBtn("Approve", () => approveStore(s.id), "green");
const deleteBtn  = makeBtn(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "danger");
const editBtn    = makeBtn("Edit", () => editStore(s.id), "blue");
const repairBtn  = makeBtn("Repair Photo", (ev) => repairPhoto(s.id, s.place_id, img, ev), "orange");

actions.append(approveBtn, deleteBtn, editBtn, repairBtn);

card.appendChild(body);
card.appendChild(actions);
grid.appendChild(card);

  }); // stänger forEach
}     // stänger renderCards

/* ==================== EDIT MODAL ================= */
async function editStore(id) {
  closeEdit();

  //  Hämta store + kommentarer parallellt
  const [storeResp, commentsResp] = await Promise.all([
    WCL.supabase.from("stores").select("*").eq("id", id).single(),
    WCL.supabase.from("store_comments").select("*").eq("store_id", id).order("created_at", { ascending: false })
  ]);

  const store = storeResp?.data;
  const error = storeResp?.error;
  const comments = commentsResp?.data || [];

  if (error || !store) {
    toast("Failed to load store", "error");
    console.error(error);
    return;
  }

  //  Bygg modal
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
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
}
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

  if (!data || !data.length) {
    STORES = [];
    render();
    return;
  }

  // 🔁 Transform reports → store-like objects
  STORES = data.map(r => ({
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

    // 🔶 Report metadata
    _is_reported: true,
    _report_id: r.id,
    _report_type: r.report_type,
    _report_count: r.report_count,
    _report_status: r.status
  }));

  render();
}
/* ===================== UI WIRING ========================= */
document.addEventListener("DOMContentLoaded", () => {
  console.log(" DOM fully loaded — Backoffice ready");

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

  //  Sökfält
$("#searchInput")?.addEventListener("input", async (e) => {

  const term = e.target.value.trim();

  // Tomt → normal render
  if (!term) {
    render();
    return;
  }

  console.log("🔎 Searching DB:", term);

  const { data, error } = await WCL.supabase
    .from("stores")
    .select("*")
    .ilike("name", `%${term}%`)
    .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  STORES = data || [];

  render();
});
   });


/* ===================== BUTTON ===================== */
function makeBtn(label, onclick, cls = "") {
  const b = document.createElement("button");
  b.className = `btn ${cls}`.trim();
  b.textContent = label;
  if (typeof onclick === "function") b.onclick = onclick;
  return b;
}

/* ==================== MOD ACTIONS ================= */

/*  APPROVE — pending → stores */
async function approveStore(id) {

  const { error } = await WCL.supabase
    .rpc("approve_store_pending", { p_id: id });

  if (error) {
    console.error("Approve failed:", error);
    toast("Error approving", "error");
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

     
async function moderateReport(reportId, action) {

  const { error } = await WCL.supabase.rpc(
    "bo_moderate_store_report_v1",
    {
      p_report_id: reportId,
      p_action: action,
      p_note: null
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
