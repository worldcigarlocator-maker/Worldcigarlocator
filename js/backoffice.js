/* ============================================================
   Backoffice V5.3.0 — Clean Structured + Hierarchy + Edit + Proxy + Flags
   ============================================================ */

console.log("🚀 Backoffice V5.3.0 loaded ✅");

/* ============================================================
   1. CONFIGURATION
   ============================================================ */
const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",
  PHOTO_PROXY_URL: "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  PHOTO_REFS_URL:  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs",
  FALLBACK_IMG:   "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
  FLAGS_BASE: "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags"
};

// Supabase client
WCL.supabase = window.supabase.createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);


/* ============================================================
   2. GLOBAL STATE
   ============================================================ */
let STORES = [];
let CURRENT_TAB = "pending"; // all | approved | pending | flagged | deleted | repair
let CURRENT_VIEW = "cards";  // cards | list
let HIER_SEL = { continent: null, country: null, city: null };


/* ============================================================
   3. GENERIC HELPERS
   ============================================================ */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const safe = (v) => (v ?? "").toString();

const toast = (msg, cls = "success") => {
  const c = $("#toast-container");
  if (!c) return console.warn("[toast]", msg);
  const t = document.createElement("div");
  t.className = `toast ${cls}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2500);
};

function groupBy(array, keyFn) {
  const map = {};
  for (const item of array) {
    const key = keyFn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}


/* ============================================================
   4. ISO FLAGS ENGINE (unchanged logic)
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

/* 2) Reverse lookup: namn/alias → iso2 */
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

/* 4) Normalisering + flag resolver */
function normalizeCountryKey(name){
  return (name||"").toLowerCase()
    .trim().replace(/’/g,"'")
    .replace(/\./g,"").replace(/,/g,"")
    .replace(/-/g," ").replace(/\s+/g," ");
}

function flagURL(country, isoOverride = null){
  if (!country && !isoOverride) return null;
  if (isoOverride && ISO2_BASE[isoOverride]) return `${WCL.FLAGS_BASE}/${isoOverride}.svg`;
  const key = normalizeCountryKey(country);
  if (ISO2_BASE[key]) return `${WCL.FLAGS_BASE}/${key}.svg`;
  const iso = COUNTRY_TO_ISO2[key];
  return iso ? `${WCL.FLAGS_BASE}/${iso}.svg` : null;
}

/* Country → Continent fallback */
function countryToContinent(country){
  const c = normalizeCountryKey(country);
  if (["sweden","germany","france","italy","spain","norway","finland","denmark","netherlands","belgium","austria","switzerland","poland","czech republic","czechia","portugal","ireland","iceland","estonia","latvia","lithuania","hungary","greece","romania","bulgaria","slovenia","slovakia","croatia","ukraine"].includes(c)) return "Europe";
  if (["united states","usa","canada","mexico","cuba","dominican republic"].includes(c)) return "North America";
  if (["brazil","argentina","chile","peru","colombia","uruguay","paraguay"].includes(c)) return "South America";
  if (["china","japan","india","thailand","malaysia","singapore","israel","turkey","vietnam","indonesia","philippines","south korea","taiwan","united arab emirates","uae","qatar","saudi arabia"].includes(c)) return "Asia";
  if (["south africa","nigeria","kenya","morocco","egypt","ghana"].includes(c)) return "Africa";
  if (["australia","new zealand","fiji"].includes(c)) return "Oceania";
  return "Other";
}

//* ============================================================
   4.9 RENDERING HELPERS — Cards & Hierarchy
   ============================================================ */

// Helper: makeBtn(label, action, style)
function makeBtn(label, onClick, cls = "ghost") {
  const b = document.createElement("button");
  b.className = `btn ${cls}`;
  b.textContent = label;
  b.addEventListener("click", (e) => {
    e.stopPropagation(); // hindrar klick från att trigga kortet
    onClick();
  });
  return b;
}


// 🧪 TESTLOGG
console.log("✅ renderCards loaded!");

// Render cards (grid view)
function renderCards(list) {
  const grid = $("#cards");
  if (!grid) return;
  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = `<p class="muted center">No stores</p>`;
    return;
  }

  list.forEach((s) => {
    const card = document.createElement("div");
    card.className = "card";

    // --- Photo ---
    const img = document.createElement("img");
    img.className = "photo";
    img.src = s.photo_reference
      ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(s.photo_reference)}&maxwidth=800`
      : WCL.FALLBACK_IMG;
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    // --- Body ---
    const body = document.createElement("div");
    body.className = "body";

    const h3 = document.createElement("h3");
    h3.textContent = safe(s.name);
    body.appendChild(h3);

    const flagSrc = flagURL(s.country, s.country_iso2);
    if (flagSrc) {
      const flag = document.createElement("img");
      flag.className = "flag";
      flag.src = flagSrc;
      flag.alt = s.country;
      flag.onerror = () => (flag.style.display = "none");
      body.appendChild(flag);
    }

    const loc = document.createElement("p");
    loc.className = "muted";
    loc.textContent = `${safe(s.city)}, ${safe(s.country)}`;
    body.appendChild(loc);

    // --- Actions ---
    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      makeBtn("Edit", () => editStore(s.id), "blue"),
      makeBtn("Approve", () => approveStore(s.id), "green"),
      makeBtn("Delete", () => toggleDelete(s), "danger")
    );

    card.appendChild(body);
    card.appendChild(actions);
    grid.appendChild(card);
  });
}

// Render hierarchy (list view)
function renderHierarchy(list) {
  const tbody = $("#tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="muted center">No stores</td></tr>`;
    return;
  }

  const byContinent = groupBy(list, s => s.continent || "Other");

  Object.keys(byContinent).sort().forEach(cont => {
    const contStores = byContinent[cont];
    const contRow = document.createElement("tr");
    contRow.className = "level-1";
    contRow.innerHTML = `
      <td><span class="arrow">▶</span> ${cont} <span class="muted">(${contStores.length})</span></td>
      <td colspan="8"></td>`;
    tbody.appendChild(contRow);

    contRow.addEventListener("click", () => {
      const open = contRow.classList.toggle("open");
      const arr = contRow.querySelector(".arrow");
      arr.textContent = open ? "▼" : "▶";
      tbody.querySelectorAll(`tr[data-parent='${cont}']`).forEach(r => r.remove());
      if (open) {
        contStores.forEach(s => {
          const row = document.createElement("tr");
          row.dataset.parent = cont;
          row.innerHTML = `
            <td>${safe(s.name)}</td>
            <td>${safe(s.city)}</td>
            <td>${safe(s.country)}</td>
            <td>${safe(s.type || "–")}</td>
            <td>${safe(s.access || "–")}</td>
            <td>${s.rating ?? "–"}</td>
            <td>${s.approved ? "✅" : "–"}</td>`;
          tbody.appendChild(row);
        });
      }
    });
  });
}


/* ============================================================
   5. MAIN RENDER SWITCH
   ============================================================ */
function render() {
  if (CURRENT_VIEW === "cards") {
    renderCards(STORES);
  } else {
    renderHierarchy(STORES);
    updateCounts(); // 🔢 uppdaterar counts efter rendering
  }
}


/* ============================================================
   6. DATA LOADING — hämtar från Supabase och uppdaterar state
   ============================================================ */
async function reloadData(tab = CURRENT_TAB) {
  CURRENT_TAB = tab;

  // uppdatera filter UI
  $$(".filters .pill").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === CURRENT_TAB)
  );

  // växla vy
  if (CURRENT_VIEW === "cards") {
    $("#cards").style.display = "grid";
    $(".listview-wrap").style.display = "none";
  } else {
    $("#cards").style.display = "none";
    $(".listview-wrap").style.display = "flex";
  }

  const grid = $("#cards");
  grid.innerHTML = "<p class='muted center'>Loading…</p>";

  // Samma select överallt (inkl address + phone + website)
  const SELECT_FIELDS =
    "id,name,city,country,continent,type,address,phone,access," +
    "rating,approved,flagged,deleted,status," +
    "photo_reference,place_id,website,created_at,flag_reason";

  // Basfråga
  let base = WCL.supabase
    .from("stores")
    .select(SELECT_FIELDS)
    .order("id", { ascending: false });

  // Logiska filter
  if (tab === "approved") {
    base = base.eq("approved", true).eq("deleted", false);
  } else if (tab === "flagged") {
    base = base.eq("flagged", true).eq("deleted", false);
  } else if (tab === "deleted") {
    base = base.eq("deleted", true);
  } else if (tab === "pending") {
    base = base
      .eq("approved", false)
      .eq("flagged", false)
      .eq("deleted", false);
  } else {
    base = base.eq("deleted", false); // all
  }

  // 🔧 Needs Repair-läge (särskild branch)
  if (tab === "repair") {
    const { data, error } = await WCL.supabase
      .from("stores")
      .select(SELECT_FIELDS)
      .eq("deleted", false)
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      grid.innerHTML =
        "<p class='error center'>Error loading stores</p>";
      return;
    }

    const fallbackList = (data || []).filter(
      (s) => !s.photo_reference
    );

    STORES = fallbackList.map((s) => ({
      ...s,
      continent: s.continent || countryToContinent(s.country),
    }));

    console.log(
      "🔎 reloadData(repair) → rows:",
      STORES.length
    );

    // uppdatera counts & render
    await updateFilterCounts();
    render();
    return;
  }

  // 🔁 Vanligt läge
  const { data, error } = await base;
  if (error) {
    console.error(error);
    grid.innerHTML =
      "<p class='error center'>Error loading stores</p>";
    return;
  }

  STORES = (data || []).map((s) => ({
    ...s,
    continent: s.continent || countryToContinent(s.country),
  }));

  console.log(
    "🔎 reloadData(): tab=",
    CURRENT_TAB,
    "rows=",
    STORES.length
  );

  // 🧩 uppdatera topbar-badges
  await updateFilterCounts();

  // rendera aktuell vy
  render();
}


/* ============================================================
   6.1 FILTER COUNTS BADGES — uppdaterar siffror i toppbar
   ============================================================ */
async function updateFilterCounts() {
  try {
    // hämta alla (ej hårt filtrerat här, vi räknar i JS)
    const { data, error } = await WCL.supabase
      .from("stores")
      .select("id, approved, flagged, deleted, photo_reference");

    if (error) {
      console.error("updateFilterCounts error:", error);
      return;
    }

    const rows = data || [];

    const allCount      = rows.filter(s => !s.deleted).length;
    const pendingCount  = rows.filter(s => !s.deleted && !s.approved && !s.flagged).length;
    const approvedCount = rows.filter(s => s.approved && !s.deleted).length;
    const flaggedCount  = rows.filter(s => s.flagged && !s.deleted).length;
    const deletedCount  = rows.filter(s => s.deleted).length;
    const repairCount   = rows.filter(s => !s.deleted && !s.photo_reference).length;

    const setBadge = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setBadge("count-all",      allCount);
    setBadge("count-pending",  pendingCount);
    setBadge("count-approved", approvedCount);
    setBadge("count-flagged",  flaggedCount);
    setBadge("count-deleted",  deletedCount);
    setBadge("count-repair",   repairCount);
  } catch (e) {
    console.error("updateFilterCounts exception:", e);
  }
}


/* ============================================================
   7. MOD ACTIONS — approve / unflag / delete / repair photo
   ============================================================ */
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


/* ============================================================
   8. EDIT MODAL — ladda butik + kommentarer, visa formulär
   ============================================================ */
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
          <option value="Europe">Europe</option>
          <option value="North America">North America</option>
          <option value="South America">South America</option>
          <option value="Asia">Asia</option>
          <option value="Africa">Africa</option>
          <option value="Oceania">Oceania</option>
          <option value="Other">Other</option>
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

  // close på backdrop + ESC
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

  // repair från modal
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

  // save-knapp
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
    await reloadData(CURRENT_TAB);
  };
}

/* ============================================================
   9. EXPAND / COLLAPSE + COUNT + SEARCH
   ============================================================ */
function expandAllHierarchy() {
  const tbody = $("#tbody");
  tbody.querySelectorAll("tr").forEach(tr => {
    if (["level-1","level-2","level-3"].some(c => tr.classList.contains(c))) {
      tr.classList.add("open");
      const arrow = tr.querySelector(".arrow");
      if (arrow) arrow.textContent = "▼";
    }
  });
  tbody.querySelectorAll("tr").forEach(tr => (tr.style.display = ""));
}

function collapseAllHierarchy() {
  const tbody = $("#tbody");
  tbody.querySelectorAll("tr").forEach(tr => {
    const lvl = tr.className.match(/level-(\d)/);
    const level = lvl ? parseInt(lvl[1]) : 0;
    if (level > 1) tr.remove();
    if (level === 1) {
      tr.classList.remove("open");
      const arrow = tr.querySelector(".arrow");
      if (arrow) arrow.textContent = "▶";
    }
  });
}

function updateCounts() {
  const tbody = $("#tbody");
  tbody.querySelectorAll(".level-1").forEach(contRow => {
    const cont = contRow.textContent.trim();
    const childRows = Array.from(tbody.querySelectorAll(`tr[data-parent='${cont}']`));
    const count = childRows.length
      ? childRows.reduce((sum, r) => {
          const num = parseInt(r.lastElementChild?.textContent || 0);
          return sum + (isNaN(num) ? 0 : num);
        }, 0)
      : parseInt(contRow.lastElementChild?.textContent || 0);
    const muted = contRow.querySelector(".muted");
    if (muted) muted.textContent = `(${count})`;
  });
}

function filterListView(query) {
  const q = query.trim().toLowerCase();
  const rows = $("#tbody").querySelectorAll("tr");
  if (!q) return rows.forEach(r => (r.style.display = ""));
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(q) ? "" : "none";
  });
}


/* ============================================================
   10. MODERATION ACTIONS
   ============================================================ */
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


/* ============================================================
   11. PHOTO REPAIR
   ============================================================ */
async function repairPhoto(id, place_id, imgEl) {
  if (!place_id) return toast("No place_id found", "error");
  toast("Repairing photo…", "info");
  try {
    const refs = await fetchPhotoRefs(place_id);
    if (!refs.length) return toast("No photos found from Google", "error");
    const newRef = refs[0];
    const { error } = await WCL.supabase.from("stores").update({ photo_reference: newRef }).eq("id", id);
    if (error) return toast("Error updating photo", "error");
    toast("Photo repaired ✅");
    if (imgEl) imgEl.src = `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(newRef)}&maxwidth=800`;
  } catch (e) {
    console.error(e);
    toast("Repair failed", "error");
  }
}


/* ============================================================
   12. EDIT MODAL + CLOSE
   ============================================================ */
async function editStore(id) {
  closeEdit();

  const [storeResp, commentsResp] = await Promise.all([
    WCL.supabase.from("stores").select("*").eq("id", id).single(),
    WCL.supabase.from("store_comments").select("*").eq("store_id", id).order("created_at", { ascending: false })
  ]);
  const store = storeResp?.data;
  const error = storeResp?.error;
  const comments = commentsResp?.data || [];
  if (error || !store) return toast("Failed to load store", "error");

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
          <option value="Europe">Europe</option>
          <option value="North America">North America</option>
          <option value="South America">South America</option>
          <option value="Asia">Asia</option>
          <option value="Africa">Africa</option>
          <option value="Oceania">Oceania</option>
          <option value="Other">Other</option>
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
          <img id="edit-photo" class="preview-photo" src="${store.photo_reference ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(store.photo_reference)}&maxwidth=800` : WCL.FALLBACK_IMG}" />
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

  const contSel = $("#edit-continent");
  const defaultCont = store.continent || countryToContinent(store.country);
  if (defaultCont) contSel.value = defaultCont;

  modal.addEventListener("click", (e) => { if (e.target === modal) closeEdit(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEdit(); }, { once: true });

  modal.querySelectorAll(".type-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    })
  );

  let refs = await fetchPhotoRefs(store.place_id);
  if (!refs.length && store.photo_reference) refs = [store.photo_reference];
  let currentIndex = Math.max(0, refs.indexOf(store.photo_reference));
  const imgEl  = modal.querySelector("#edit-photo");
  const metaEl = modal.querySelector("#photo-meta");

  function showCurrent() {
    if (!refs.length) { imgEl.src = WCL.FALLBACK_IMG; metaEl.textContent = "No photo loaded"; return; }
    imgEl.src = `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(refs[currentIndex])}&maxwidth=800`;
    metaEl.textContent = `Photo ${currentIndex + 1} / ${refs.length}`;
  }
  showCurrent();

  $("#edit-prev").onclick = () => { if (!refs.length) return; currentIndex = (currentIndex - 1 + refs.length) % refs.length; showCurrent(); };
  $("#edit-next").onclick = () => { if (!refs.length) return; currentIndex = (currentIndex + 1) % refs.length; showCurrent(); };

  $("#repair-photo").onclick = async () => {
    toast("Repairing photo…", "info");
    const fresh = await fetchPhotoRefs(store.place_id);
    if (!fresh.length) return toast("No photos found", "error");
    const newRef = fresh[0];
    const { error } = await WCL.supabase.from("stores").update({ photo_reference: newRef }).eq("id", id);
    if (error) return toast("Error updating photo", "error");
    toast("Photo repaired ✅");
    imgEl.src = `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(newRef)}&maxwidth=800`;
    metaEl.textContent = "Photo repaired";
  };

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
    const { error } = await WCL.supabase.from("stores").update(payload).eq("id", id);
    if (error) return toast("Error saving", "error");
    toast("Saved ✅");
    closeEdit();
    await reloadData(CURRENT_TAB);
  };
}

function closeEdit(){ document.querySelectorAll(".modal-backdrop").forEach((m)=>m.remove()); }


/* ============================================================
   13. UI INITIALIZATION
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM ready — Backoffice V5.3.0 initialized");

  // Filter pills
  $$(".filters .pill").forEach(p =>
    p.addEventListener("click", () => {
      CURRENT_TAB = p.dataset.tab;
      $("#searchInput").value = ""; // 🧠 reset search
      reloadData(CURRENT_TAB);
    })
  );

  // View toggle
  $$(".viewtoggle .seg").forEach(seg =>
    seg.addEventListener("click", () => {
      $$(".viewtoggle .seg").forEach(x => x.classList.remove("active"));
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

  // Search + Expand/Collapse
  $("#searchInput")?.addEventListener("input", (e) => filterListView(e.target.value));
  $("#expandAll")?.addEventListener("click", expandAllHierarchy);
  $("#collapseAll")?.addEventListener("click", collapseAllHierarchy);

  // Initial load
  reloadData("pending");
});
