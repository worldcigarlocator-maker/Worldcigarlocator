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

/* ===================== DATA LOADING ====================== */
async function reloadData(tab = CURRENT_TAB) {
  CURRENT_TAB = tab;

  // uppdatera filter UI
  $$(".filters .pill").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === CURRENT_TAB)
  );

  // vy
  if (CURRENT_VIEW === "cards") {
    $("#cards").style.display = "grid";
    $(".listview-wrap").style.display = "none";
  } else {
    $("#cards").style.display = "none";
    $(".listview-wrap").style.display = "flex";
  }

  const grid = $("#cards");
  grid.innerHTML = "<p class='muted center'>Loading…</p>";

  // Basfråga
  let base = WCL.supabase
    .from("stores")
    .select("id,name,city,country,continent,type,address,phone,access,rating,approved,flagged,deleted,status,photo_reference,place_id,website,created_at,flag_reason")
    .order("id", { ascending: false });

  // Logiska filter
  if (tab === "approved") base = base.eq("approved", true).eq("deleted", false);
  else if (tab === "flagged") base = base.eq("flagged", true).eq("deleted", false);
  else if (tab === "deleted") base = base.eq("deleted", true);
  else if (tab === "pending") base = base.eq("approved", false).eq("flagged", false).eq("deleted", false);
  else base = base.eq("deleted", false); // all

  // Needs Repair
  if (tab === "repair") {
    const { data, error } = await WCL.supabase
      .from("stores")
      .select("id,name,city,country,continent,type,address,phone,access,rating,approved,flagged,deleted,status,photo_reference,place_id,website,created_at,flag_reason")
      .eq("deleted", false)
      .order("id", { ascending: false });
    if (error) { console.error(error); grid.innerHTML = "<p class='error center'>Error loading stores</p>"; return; }

    const fallbackList = (data || []).filter(s => !s.photo_reference);
    STORES = fallbackList.map((s) => ({ ...s, continent: s.continent || countryToContinent(s.country) }));
    render(); return;
  }

  const { data, error } = await base;
  if (error) { console.error(error); grid.innerHTML = "<p class='error center'>Error loading stores</p>"; return; }

  STORES = (data || []).map((s) => ({ ...s, continent: s.continent || countryToContinent(s.country) }));
  render();
}

function render() {
  const term = ($("#searchInput")?.value || "").trim().toLowerCase();
  const matches = (s) => [s.name, s.city, s.country].some((v) => safe(v).toLowerCase().includes(term));
  const list = term ? STORES.filter(matches) : STORES;

  if (CURRENT_VIEW === "cards") {
    renderCards(list);
  } else {
    renderHierarchy(list);
    renderTable(applyHierarchyFilter(list));
  }
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
    info.innerHTML = `
      <p class="truncate"><strong>Type:</strong> ${safe(s.type || "–")}</p>
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



/* ===================== LIST ===================== */
function renderTable(list) {
  const tbody = $("#tbody");
  tbody.innerHTML = "";

  list.forEach((s) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${safe(s.name)}</td>

      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          ${(() => {
            const url = flagURL(s.country, s.country_iso2);
            return url
              ? `<img class="flag" src="${url}"
                   style="width:18px;height:14px;border-radius:2px;object-fit:cover;border:1px solid #ccc;">`
              : "";
          })()}
          <span>${safe(s.country)}</span>
        </div>
      </td>

      <td>${safe(s.continent)}</td>
      <td>${safe(s.city)}</td>
      <td>${safe(s.type) || "store"}</td>
      <td>${safe(s.access) || "—"}</td>
      <td>${s.rating ?? "—"}</td>

      <td>
        ${s.approved ? `<span class='badge green'>APPROVED</span>` : ""}
        ${s.flagged ? `<span class='badge red'>FLAGGED</span>` : ""}
        ${s.deleted ? `<span class='badge gray'>DELETED</span>` : ""}
        ${!s.approved && !s.flagged && !s.deleted ? `<span class='badge gold'>PENDING</span>` : ""}
      </td>

      <td class="action-td"></td>
    `;

    const actionsTd = tr.querySelector(".action-td");
    actionsTd.style.whiteSpace = "nowrap";

    actionsTd.append(
      makeBtn("Edit", () => editStore(s.id), "blue"),
      makeBtn("Approve", () => approveStore(s.id), "green"),
      s.flagged ? makeBtn("Unflag", () => unflagStore(s.id), "yellow") : document.createComment(""),
      makeBtn(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "danger")
    );

    tbody.appendChild(tr);
  });

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="muted center">No stores</td></tr>`;
  }
}

/* ================ HIERARCHY (LIST-VIEW) ================== */
function renderHierarchy(list) {
  const panel = $("#hierarchyPanel");
  panel.innerHTML = "";

  const byCont = groupBy(list, (s) => s.continent || "Other");

  Object.keys(byCont).sort().forEach((continent) => {

    // ---- CONTINENT ----
    const contNode = line("continent", continent, countStores(byCont[continent]));
    const nestedCountries = document.createElement("div");
    nestedCountries.className = "nested";

    contNode.addEventListener("click", () => {
      toggleNested(nestedCountries, contNode);
      HIER_SEL = { continent, country: null, city: null };
      render();
      highlight(panel, contNode);
    });

    // ---- COUNTRIES ----
    const byCountry = groupBy(byCont[continent], (s) => s.country || "Unknown");

    Object.keys(byCountry).sort().forEach((country) => {

      const cNode = document.createElement("div");
      cNode.className = "line country";

      const iso = flagURL(country);
      const flagHTML = iso
        ? `<img src="${iso}" style="width:18px;height:14px;border-radius:2px;
           object-fit:cover;border:1px solid #ccc;margin-right:6px;">`
        : "";

      cNode.innerHTML = `
        <span class="arrow">▶</span>
        ${flagHTML}
        <span class="label">${country}</span>
        <span class="muted">(${countStores(byCountry[country])})</span>
      `;

      const nestedCities = document.createElement("div");
      nestedCities.className = "nested";

      cNode.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleNested(nestedCities, cNode);
        HIER_SEL = { continent, country, city: null };
        render();
        highlight(panel, cNode);
      });

      // ---- CITIES ----
      const byCity = groupBy(byCountry[country], (s) => s.city || "Unknown");

      Object.keys(byCity)
        .sort((a, b) => byCity[b].length - byCity[a].length)
        .forEach((city) => {
          const cityNode = document.createElement("div");
          cityNode.className = "line city";
          cityNode.textContent = `${city} (${byCity[city].length})`;

          cityNode.addEventListener("click", (e) => {
            e.stopPropagation();
            HIER_SEL = { continent, country, city };
            render();
            highlight(panel, cityNode);
          });

          nestedCities.appendChild(cityNode);
        });

      nestedCountries.append(cNode, nestedCities);
    });

    panel.append(contNode, nestedCountries);
  });
}

/* ================ EXPAND / COLLAPSE ALL ================= */

function expandAllHierarchy() {
  $$("#hierarchyPanel .nested").forEach((nested) => {
    nested.classList.add("open");
    nested.style.display = "block";
  });
  $$("#hierarchyPanel .line .arrow").forEach((arr) => arr.textContent = "▼");
}

function collapseAllHierarchy() {
  $$("#hierarchyPanel .nested").forEach((nested) => {
    nested.classList.remove("open");
    nested.style.display = "none";
  });
  $$("#hierarchyPanel .line .arrow").forEach((arr) => arr.textContent = "▶");
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
  if (!place_id) { toast("No place_id found for this store", "error"); return; }
  toast("Repairing photo…", "info");
  try {
    const refs = await fetchPhotoRefs(place_id);
    if (!refs.length) { toast("No photos found from Google", "error"); return; }
    const newRef = refs[0];
    const { error } = await WCL.supabase.from("stores").update({ photo_reference: newRef }).eq("id", id);
    if (error) { console.error(error); toast("Error updating photo", "error"); return; }
    toast("Photo repaired ✅");
    if (imgEl) imgEl.src = buildPhotoProxyUrl(newRef);
  } catch (e) { console.error(e); toast("Repair failed", "error"); }
}

/* ==================== EDIT MODAL ================= */
async function editStore(id) {
  closeEdit();

  const [storeResp, commentsResp] = await Promise.all([
    WCL.supabase.from("stores").select("*").eq("id", id).single(),
    WCL.supabase.from("store_comments").select("*").eq("store_id", id).order("created_at", { ascending: false })
  ]);
  const store = storeResp?.data;
  const error = storeResp?.error;
  const comments = commentsResp?.data || [];
  if (error || !store) { toast("Failed to load store", "error"); console.error(error); return; }

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
          ${["Europe","North America","South America","Asia","Africa","Oceania","Other"].map(opt => `
            <option value="${opt}">${opt}</option>
          `).join("")}
        </select>

        <label>Website</label>
        <input id="edit-website" value="${safe(store.website)}" />

        <label>Type</label>
        <div class="type-group">
          <button type="button" class="type-btn ${store.type === "store" ? "active" : ""}" data-type="store">Store</button>
          <button type="button" class="type-btn ${store.type === "lounge" ? "active" : ""}" data-type="lounge">Lounge</button>
        </div>

        <label>Access</label>
        <div class="access-group">
          <label class="access-pill">
            <input type="radio" name="access" value="public" ${store.access === "public" ? "checked" : ""}>
            <span>Public</span>
          </label>
          <label class="access-pill">
            <input type="radio" name="access" value="members" ${store.access === "members" ? "checked" : ""}>
            <span>Members Only</span>
          </label>
        </div>

        <label>Photo</label>
        <div class="photo-picker">
          <button id="edit-prev" class="photo-nav">◀</button>
          <img id="edit-photo" class="preview-photo" src="${store.photo_reference ? buildPhotoProxyUrl(store.photo_reference) : WCL.FALLBACK_IMG}" />
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
                 </div>
               `).join("")}
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

  // init continent select default (store.continent eller auto)
  const contSel = $("#edit-continent");
  const defaultCont = store.continent || countryToContinent(store.country);
  if (defaultCont) contSel.value = defaultCont;

  // close
  modal.addEventListener("click", (e) => { if (e.target === modal) closeEdit(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEdit(); }, { once: true });

  // type toggles
  modal.querySelectorAll(".type-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    })
  );

  // photos
  let refs = await fetchPhotoRefs(store.place_id);
  if (!refs.length && store.photo_reference) refs = [store.photo_reference];
  let currentIndex = Math.max(0, refs.indexOf(store.photo_reference));
  const imgEl  = modal.querySelector("#edit-photo");
  const metaEl = modal.querySelector("#photo-meta");

  function showCurrent() {
    if (!refs.length) { imgEl.src = WCL.FALLBACK_IMG; metaEl.textContent = "No photo loaded"; return; }
    imgEl.src = buildPhotoProxyUrl(refs[currentIndex]);
    metaEl.textContent = `Photo ${currentIndex + 1} / ${refs.length} — via proxy`;
  }
  showCurrent();

  $("#edit-prev").onclick = () => { if (!refs.length) return; currentIndex = (currentIndex - 1 + refs.length) % refs.length; showCurrent(); };
  $("#edit-next").onclick = () => { if (!refs.length) return; currentIndex = (currentIndex + 1) % refs.length; showCurrent(); };

  // repair
  $("#repair-photo").onclick = async () => {
    toast("Repairing photo…", "info");
    const fresh = await fetchPhotoRefs(store.place_id);
    if (!fresh.length) { toast("No photos found from Google", "error"); return; }
    const newRef = fresh[0];
    const { error } = await WCL.supabase.from("stores").update({ photo_reference: newRef }).eq("id", id);
    if (error) return toast("Error updating photo", "error");
    toast("Photo repaired ✅");
    imgEl.src = buildPhotoProxyUrl(newRef);
    metaEl.textContent = "Photo repaired from Google";
  };

  // delete comment
  modal.querySelectorAll(".del-comment").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this comment?")) return;
      const cid = btn.dataset.id;
      const { error } = await WCL.supabase.from("store_comments").delete().eq("id", cid);
      if (error) return toast("Error deleting comment", "error");
      toast("Comment deleted 🗑️");
      closeEdit(); editStore(id);
    });
  });

// buttons
$("#edit-save").onclick = async () => {
  const payload = {
    name: $("#edit-name").value.trim(),
    address: $("#edit-address").value.trim(),
    phone: $("#edit-phone").value.trim(),
    city: $("#edit-city").value.trim(),
    country: $("#edit-country").value.trim(),
    continent: $("#edit-continent").value || null,
    website: $("#edit-website").value.trim(),
    type: document.querySelector(".type-btn.active")?.dataset.type || null,
    access: document.querySelector('input[name="access"]:checked')?.value || null,
    photo_reference: refs.length ? refs[currentIndex] : null,
  };

  const { error } = await WCL.supabase
    .from("stores")
    .update(payload)
    .eq("id", id);

  if (error) return toast("Error saving", "error");

toast("Saved ✅");
closeEdit();

// 🔥 Ladda om kort automatiskt
await reloadData(CURRENT_TAB);
};   // avslutar $("#edit-save").onclick
}    // avslutar hela async function editStore()


/* ==================== CLOSE MODAL ================= */
function closeEdit(){ document.querySelectorAll(".modal-backdrop").forEach((m)=>m.remove()); }


/* ===================== UI WIRING ========================= */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM fully loaded — Backoffice V5.2.1 ready");

  // filters
  $$(".filters .pill").forEach((p) =>
    p.addEventListener("click", () => {
      CURRENT_TAB = p.dataset.tab;
      reloadData(CURRENT_TAB);
    })
  );

  // view toggle
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
      render();
    })
  );

  // search
  $("#searchInput")?.addEventListener("input", () => render());

$("#expandAll")?.addEventListener("click", expandAllHierarchy);
$("#collapseAll")?.addEventListener("click", collapseAllHierarchy);

  // initial
  reloadData("pending");
});
