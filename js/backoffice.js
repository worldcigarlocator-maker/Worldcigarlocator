/* ============================================================
   Backoffice V5.2.1 — Moderation + Hierarki + Edit + Proxy + ISO Flags
   ============================================================ */

console.log("🚀 Backoffice V5.2.1 loaded ✅");

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

/* ======================== STATE ========================= */
let STORES = [];
let CURRENT_TAB = "pending"; // all | approved | pending | flagged | deleted | repair
let CURRENT_VIEW = "cards";  // cards | list
let HIER_SEL = { continent: null, country: null, city: null };

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


/* ============================================================
   INLINE LISTVIEW — Expandable Continent → Country → City → Store
   ============================================================ */
function renderListView(list) {
  const wrap = $(".listview-wrap");
  if (!wrap) return;

  wrap.innerHTML = `
    <table id="listTable">
      <thead>
        <tr>
          <th></th>
          <th>Continent</th>
          <th>Country</th>
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

  Object.entries(byContinent).forEach(([continent, contStores]) => {
    const row = makeExpandableRow(continent, contStores, "continent");
    tbody.appendChild(row);
  });
}

/* ============================================================
   HELPER — Skapar expanderbar rad
   ============================================================ */
function makeExpandableRow(label, items, level) {
  const tr = document.createElement("tr");
  tr.className = `expandable ${level}`;
  tr.innerHTML = `
    <td class="arrow-cell">▶</td>
    <td colspan="9" class="line-label">
      <strong>${label}</strong> <span class="muted">(${items.length})</span>
    </td>
  `;

  let expanded = false;
  const subRows = [];

  tr.addEventListener("click", (e) => {
    e.stopPropagation();

    // Collapse existing
    if (expanded) {
      subRows.forEach(r => r.remove());
      tr.querySelector(".arrow-cell").textContent = "▶";
      expanded = false;
      return;
    }

    // Expand level
    tr.querySelector(".arrow-cell").textContent = "▼";
    expanded = true;

    // Nästa nivå
    if (level === "continent") {
      const byCountry = groupBy(items, s => s.country || "Unknown");
      Object.entries(byCountry).forEach(([country, countryStores]) => {
        const sub = makeExpandableRow(country, countryStores, "country");
        subRows.push(sub);
        tr.parentNode.insertBefore(sub, tr.nextSibling);
      });

    } else if (level === "country") {
      const byCity = groupBy(items, s => s.city || "Unknown");
      Object.entries(byCity).forEach(([city, cityStores]) => {
        const sub = makeExpandableRow(city, cityStores, "city");
        subRows.push(sub);
        tr.parentNode.insertBefore(sub, tr.nextSibling);
      });

    } else if (level === "city") {
      // Visa butiker
      items.forEach((s) => {
        const row = document.createElement("tr");
        row.className = "store-row";

        const hasPhoto = Boolean(s.photo_reference);

        row.innerHTML = `
          <td></td>
          <td>${safe(s.continent)}</td>
          <td>
            ${flagURL(s.country, s.country_iso2)
              ? `<img src="${flagURL(s.country, s.country_iso2)}" class="flag">`
              : ""}
            ${safe(s.country)}
          </td>
          <td>${safe(s.city)}</td>
          <td>${safe(s.name)}</td>
          <td>${safe(s.type)}</td>
          <td>${safe(s.access) || "–"}</td>
          <td>${s.rating ?? "–"}</td>
          <td>
            ${s.approved ? `<span class='badge green'>APPROVED</span>` : ""}
            ${s.flagged ? `<span class='badge red'>FLAGGED</span>` : ""}
            ${s.deleted ? `<span class='badge gray'>DELETED</span>` : ""}
            ${!s.approved && !s.flagged && !s.deleted ? `<span class='badge gold'>PENDING</span>` : ""}
          </td>
          <td class="action-td">
            <button class="btn small blue" onclick="editStore(${s.id})">Edit</button>
            <button class="btn small green" onclick="approveStore(${s.id})">Approve</button>
            ${!hasPhoto ? `<button class="btn small orange" onclick="repairPhoto(${s.id}, '${(s.place_id || "").replace(/'/g, "\\'")}')">Repair</button>` : ""}
            <button class="btn small danger" onclick="toggleDelete(${s.id})">Delete</button>
          </td>
        `;

        subRows.push(row);
        tr.parentNode.insertBefore(row, tr.nextSibling);
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
  "uz":"uzbekistan","vn":"vietnam","ye":"yemen",

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
  if (!photo_reference) return WCL.FALLBACK_IMG;
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

/* ---------- Country -> Continent fallback ---------- */
const countryToContinent = (country) => {
  const c = normalizeCountry(country);
  if ([
    "sweden","germany","france","italy","spain","norway","finland","denmark","netherlands","belgium","austria","switzerland","poland","czech republic","czechia","portugal","ireland","iceland","estonia","latvia","lithuania","hungary","greece","romania","bulgaria","slovenia","slovakia","croatia","ukraine"
  ].includes(c)) return "Europe";
  if (["united states","usa","canada","mexico","cuba","dominican republic"].includes(c)) return "North America";
  if (["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(c)) return "South America";
  if ([
    "china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia","philippines","south korea","taiwan","united arab emirates","uae","qatar","saudi arabia"
  ].includes(c)) return "Asia";
  if (["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(c)) return "Africa";
  if (["australia","new zealand","fiji"].includes(c)) return "Oceania";
  return "Other";
};


/* ============================================================
   REGION COUNTS — uppdaterar topbar badges
   ============================================================ */
function updateRegionCounts(list = STORES) {
  const counts = {
    all: list.length,
    approved: list.filter(s => s.approved && !s.deleted).length,
    pending: list.filter(s => !s.approved && !s.flagged && !s.deleted).length,
    flagged: list.filter(s => s.flagged && !s.deleted).length,
    deleted: list.filter(s => s.deleted).length,
    repair: list.filter(s => !s.photo_reference && !s.deleted).length
  };

  // uppdatera siffrorna i filtren (om badges finns)
  $$(".filters .pill").forEach(p => {
    const tab = p.dataset.tab;
    const n = counts[tab];
    if (n !== undefined) {
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
    }
  });

  console.log("🔢 Region counts updated:", counts);
}

/* ============================================================
   RENDER SWITCH — Cards vs List
   ============================================================ */
function render() {
  const term = ($("#searchInput")?.value || "").trim().toLowerCase();
  const matches = (s) => [s.name, s.city, s.country]
    .some((v) => safe(v).toLowerCase().includes(term));
  const list = term ? STORES.filter(matches) : STORES;

  if (CURRENT_VIEW === "cards") {
    renderCards(list);
  } else {
    renderListView(list);
  }
}


/* ============================================================
   DATA LOADING — hämtar från Supabase och växlar vy
   ============================================================ */
async function reloadData(tab = CURRENT_TAB) {
  CURRENT_TAB = tab;

  // 🔹 markera aktiv flik
  $$(".filters .pill").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === CURRENT_TAB)
  );

  // 🔹 växla vy
  if (CURRENT_VIEW === "cards") {
    $("#cards").style.display = "grid";
    $(".listview-wrap").style.display = "none";
  } else {
    $("#cards").style.display = "none";
    $(".listview-wrap").style.display = "flex";
  }

  // 🔹 visa “loading” i card-vyn
  const grid = $("#cards");
  grid.innerHTML = "<p class='muted center'>Loading…</p>";

  // -----------------------------------------------------------
  // 1️⃣  Hämta alla rader för counts (oberoende av flik)
  // -----------------------------------------------------------
  const COUNT_FIELDS = "id,approved,flagged,deleted,photo_reference";
  let allData = [];
  try {
    const { data, error } = await WCL.supabase
      .from("stores")
      .select(COUNT_FIELDS, { head: false }) // 🔹 hämtar bara minimala fält
      .order("id", { ascending: false });

    if (error) console.warn("⚠️ Count fetch failed:", error);
    if (data) allData = data;
  } catch (err) {
    console.warn("⚠️ Count fetch crashed:", err);
  }

  // -----------------------------------------------------------
  // 2️⃣  Hämta filtrerad lista beroende på flik
  // -----------------------------------------------------------
  const SELECT_FIELDS =
    "id,name,city,country,continent,type,address,phone,access,rating," +
    "approved,flagged,deleted,status,photo_reference,place_id,website,created_at,flag_reason";

  let base = WCL.supabase
    .from("stores")
    .select(SELECT_FIELDS)
    .order("id", { ascending: false });

  if (tab === "approved") base = base.eq("approved", true).eq("deleted", false);
  else if (tab === "flagged") base = base.eq("flagged", true).eq("deleted", false);
  else if (tab === "deleted") base = base.eq("deleted", true);
  else if (tab === "pending") base = base.eq("approved", false).eq("flagged", false).eq("deleted", false);
  else base = base.eq("deleted", false); // all

  // “Needs Repair” specialflik
  if (tab === "repair") {
    const { data, error } = await WCL.supabase
      .from("stores")
      .select(SELECT_FIELDS)
      .eq("deleted", false)
      .order("id", { ascending: false });

    if (error) {
      grid.innerHTML = "<p class='error center'>Error loading stores</p>";
      return;
    }

    const fallbackList = (data || []).filter(s => !s.photo_reference);
    STORES = fallbackList.map(s => ({
      ...s,
      continent: s.continent || countryToContinent(s.country)
    }));

    render();
    updateRegionCounts(allData); // ✅ alltid uppdaterad
    return;
  }

  // -----------------------------------------------------------
  // 3️⃣  Kör huvudqueryn för aktiv flik
  // -----------------------------------------------------------
  const { data, error } = await base;
  if (error) {
    console.error(error);
    grid.innerHTML = "<p class='error center'>Error loading stores</p>";
    return;
  }

  STORES = (data || []).map((s) => ({
    ...s,
    continent: s.continent || countryToContinent(s.country),
  }));

  // -----------------------------------------------------------
  // 4️⃣  Rendera + uppdatera counts korrekt
  // -----------------------------------------------------------
  render();
  updateRegionCounts(allData); // 💥 baseras på *hela databasen*

  console.log(`✅ reloadData(): tab=${CURRENT_TAB}, shown=${STORES.length}, total=${allData.length}`);
}




/* ===================== BUTTON ===================== */
function makeBtn(label, onclick, cls = "") {
  const b = document.createElement("button");
  b.className = `btn ${cls}`.trim();
  b.textContent = label;
  if (typeof onclick === "function") b.onclick = onclick;
  return b;
}

/* ===================== CARDS ===================== */
function renderCards(list) {
  const grid = $("#cards");
  grid.innerHTML = "";

  list.forEach((s) => {
    const borderClass =
      s.deleted ? "border-gray" :
      s.flagged ? "border-red" :
      s.approved ? "border-green" :
      "border-gold";

    const card = document.createElement("div");
    card.className = `card ${borderClass}`;

    /* ----------- Photo ----------- */
    const img = document.createElement("img");
    img.className = "photo";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* ----------- Body ----------- */
    const body = document.createElement("div");
    body.className = "body";

    /* ----------- Name (2 lines) ----------- */
    const h3 = document.createElement("h3");
    h3.className = "twoline";
    h3.textContent = safe(s.name);
    body.appendChild(h3);

    /* ----------- Flag + Country/City ----------- */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const flagSrc = flagURL(s.country, s.country_iso2);
    if (flagSrc) {
      const flag = document.createElement("img");
      flag.className = "flag";
      flag.src = flagSrc;
      flag.alt = safe(s.country);
      flag.onerror = () => (flag.style.display = "none");
      loc.appendChild(flag);
    }

    const geo = document.createElement("span");
    geo.textContent = `${safe(s.country)}, ${safe(s.city)}`;
    loc.appendChild(geo);
    body.appendChild(loc);

/* ----------- Info Block ----------- */
const info = document.createElement("div");
info.className = "infoblock";

// 🟦🟨 Typ-badges (flera typer stöds)
const typeBadges = (Array.isArray(s.types) ? s.types : [s.type])
  .filter(Boolean)
  .map(t => {
    const color =
      t === "store" ? "blue" :
      t === "lounge" ? "gold" : "gray";
    const icon =
      t === "store" ? "🏪" :
      t === "lounge" ? "🍷" : "🏷️";
    return `<span class="badge ${color}" style="margin-left:4px;">${icon} ${t}</span>`;
  })
  .join("");

info.innerHTML = `
  <p class="truncate"><strong>Type:</strong> ${typeBadges || "–"}</p>
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
        💬 View Comments / Reviews
      </button>
    `;
    body.appendChild(reviewsLink);

    /* ----------- Status badges ---------- */
    const status = document.createElement("div");
    status.className = "badges";
    status.innerHTML = `
      ${s.approved ? `<span class='badge green'>APPROVED</span>` : ""}
      ${s.flagged ? `<span class='badge red'>FLAGGED</span>` : ""}
      ${s.deleted ? `<span class='badge gray'>DELETED</span>` : ""}
      ${!s.approved && !s.flagged && !s.deleted ? `<span class='badge gold'>PENDING</span>` : ""}
      <span style="margin-left:6px;color:var(--muted)">⭐ ${s.rating ?? "–"}</span>
    `;
    body.appendChild(status);

    /* ----------- Actions ----------- */
    const actions = document.createElement("div");
    actions.className = "actions";

    const approveBtn = makeBtn("Approve", () => approveStore(s.id), "green");
    const deleteBtn  = makeBtn(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "danger");
    const editBtn    = makeBtn("Edit", () => editStore(s.id), "blue");
    const repairBtn  = makeBtn("Repair Photo", () => repairPhoto(s.id, s.place_id, img), "orange");

    if (s.flagged) {
      actions.append(
        approveBtn,
        makeBtn("Unflag", () => unflagStore(s.id), "yellow"),
        deleteBtn,
        editBtn,
        repairBtn
      );
    } else {
      actions.append(approveBtn, deleteBtn, editBtn, repairBtn);
    }

    card.appendChild(body);
    card.appendChild(actions);
    grid.appendChild(card);
  });

  if (!list.length) grid.innerHTML = `<p class="muted center">No stores</p>`;
}


/* ==================== MOD ACTIONS ================= */
async function approveStore(id) {
  const { error } = await WCL.supabase
    .from("stores")
    .update({ approved: true, flagged: false, deleted: false })
    .eq("id", id);

  if (error) return toast("Error approving", "error");

  toast("Approved ✅");
  await reloadData(CURRENT_TAB);
}

async function unflagStore(id) {
  const { error } = await WCL.supabase
    .from("stores")
    .update({ flagged: false, flag_reason: null })
    .eq("id", id);

  if (error) return toast("Error unflagging", "error");

  toast("Unflagged ✅");
  await reloadData(CURRENT_TAB);
}

async function toggleDelete(s) {
  const next = !s.deleted;

  const { error } = await WCL.supabase
    .from("stores")
    .update({ deleted: next })
    .eq("id", s.id);

  if (error) return toast("Error updating delete", "error");

  toast(next ? "Moved to Trash 🗑️" : "Restored ♻️");
  await reloadData(CURRENT_TAB);
}

/* ==================== REPAIR PHOTO ================= */
async function repairPhoto(id, place_id, imgEl) {
  const row = event?.target?.closest("tr");
  if (row) row.style.transition = "background-color 0.4s ease";

  if (!place_id) {
    toast("No place_id found for this store", "error");
    return;
  }

  // 🔶 Markera raden under arbete
  if (row) row.style.backgroundColor = "rgba(255,165,0,0.25)";
  toast("Repairing photo…", "info");

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

    // ✅ Lyckades — grön blink!
    toast("Photo repaired ✅");
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

/* ==================== EDIT MODAL ================= */
async function editStore(id) {
  closeEdit();

  // 🔹 Hämta store + kommentarer parallellt
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

  // 🔹 Bygg modal
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

  // 🔹 Fyll kontinent
  const contSel = $("#edit-continent");
  const defaultCont = store.continent || countryToContinent(store.country);
  if (defaultCont) contSel.value = defaultCont;

  // 🔹 Typval – återställ
  modal.querySelectorAll(".type-btn input").forEach(cb => {
    cb.checked = (store.types || []).includes(cb.value);
  });

  // 🔹 Access
  modal.querySelectorAll(".access-pill input").forEach(radio => {
    radio.checked = store.access === radio.value;
  });

  // 🔹 Foto-navigation
  let refs = await fetchPhotoRefs(store.place_id);
  if (!refs.length && store.photo_reference) refs = [store.photo_reference];
  let currentIndex = Math.max(0, refs.indexOf(store.photo_reference));
  const imgEl = modal.querySelector("#edit-photo");
  const metaEl = modal.querySelector("#photo-meta");

  function showCurrent() {
    if (!refs.length) {
      imgEl.src = WCL.FALLBACK_IMG;
      metaEl.textContent = "No photo loaded";
      return;
    }
    imgEl.src = buildPhotoProxyUrl(refs[currentIndex]);
    metaEl.textContent = `Photo ${currentIndex + 1} / ${refs.length} — via proxy`;
  }
  showCurrent();

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

  // 🔹 Delete comment
  modal.querySelectorAll(".del-comment").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this comment?")) return;
      const cid = btn.dataset.id;
      const { error } = await WCL.supabase.from("store_comments").delete().eq("id", cid);
      if (error) return toast("Error deleting comment", "error");
      toast("Comment deleted 🗑️");
      closeEdit();
      editStore(id);
    });
  });

  // 🔹 Save button
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
      types: selectedTypes, // ✅ array
      access: selectedAccess,
      photo_reference: refs.length ? refs[currentIndex] : null,
    };

    const { error } = await WCL.supabase.from("stores").update(payload).eq("id", id);
    if (error) {
      console.error("❌ Supabase update failed:", error);
      return toast("Error saving", "error");
    }

    toast("✅ Store updated!");
    closeEdit();
    reloadData(CURRENT_TAB);
  };

  $("#edit-cancel").onclick = closeEdit;
}

