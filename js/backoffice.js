/* ============================================================
   Backoffice V5.2.1 — Moderation + Edit + Proxy + ISO Flags
   NO MODULES / NO EXPORTS
   Depends on: globals.js (window.WCL_BO)
   ============================================================ */

(function () {
  "use strict";

  console.log("🚀 Backoffice V5.2.1 loaded ✅");

  const WCL_BO = window.WCL_BO;
  if (!WCL_BO || !WCL_BO.supabase) {
    console.error("backoffice.js: WCL_BO or supabase missing (globals.js failed?)");
    return;
  }

  const { $, $$, safe, toast } = WCL_BO;
  const CFG = WCL_BO.config;

  /* ======================== STATE (SINGLE SOURCE) ========================= */
  let STORES = [];
  let ALL_STORES = [];
  let CURRENT_TAB = "pending"; // all | approved | pending | flagged | deleted | repair
  let CURRENT_VIEW = "cards";  // cards | list
  let HIER_SEL = { continent: null, country: null, city: null };

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
     FLAGS — ISO2 Engine
     ============================================================ */
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

  const COUNTRY_TO_ISO2 = {};
  for (const [iso, name] of Object.entries(ISO2_BASE)) {
    COUNTRY_TO_ISO2[name] = iso;
    COUNTRY_TO_ISO2[name.replace(" and ", " & ")] = iso;
  }

  Object.assign(COUNTRY_TO_ISO2, {
    "sverige":"se","norge":"no","danmark":"dk","finland":"fi",
    "storbritannien":"gb","england":"gb","skottland":"gb","wales":"gb","nordirland":"gb",
    "usa":"us","united states of america":"us",
    "españa":"es","méxico":"mx","deutschland":"de","schweiz":"ch","italia":"it",
    "brasil":"br","japón":"jp","россия":"ru","rossiya":"ru"
  });

  function normalizeCountryKey(name) {
    return (name || "")
      .toLowerCase()
      .trim()
      .replace(/’/g, "'")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ");
  }

  function flagURL(country, isoOverride = null) {
    if (!country && !isoOverride) return null;

    if (isoOverride && ISO2_BASE[isoOverride]) {
      return `${CFG.FLAGS_BASE}/${isoOverride}.svg`;
    }

    const key = normalizeCountryKey(country);

    if (ISO2_BASE[key]) {
      return `${CFG.FLAGS_BASE}/${key}.svg`;
    }

    const iso = COUNTRY_TO_ISO2[key];
    return iso ? `${CFG.FLAGS_BASE}/${iso}.svg` : null;
  }

  /* ---------- Images ---------- */
  const photoURL = (ref, w = 800) =>
    ref
      ? `${CFG.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`
      : CFG.FALLBACK_IMG;

  function buildPhotoProxyUrl(photo_reference, maxwidth = 800) {
    if (!photo_reference) return CFG.FALLBACK_IMG;
    return `${CFG.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(photo_reference)}&maxwidth=${maxwidth}`;
  }

  /* ---------- Google photo refs ---------- */
  async function fetchPhotoRefs(placeId) {
    if (!placeId) return [];
    try {
      const url = `${CFG.PHOTO_REFS_URL}?place_id=${encodeURIComponent(placeId)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) return [];
      const json = await res.json(); // { refs: [...] }
      return Array.isArray(json?.refs) ? json.refs : [];
    } catch (e) {
      console.warn("fetchPhotoRefs failed:", e);
      return [];
    }
  }

  /* ============================================================
     COUNTRY HELPERS
     ============================================================ */
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

  function countryToContinent(country) {
    if (!country) return "Unknown";
    const c = normalizeCountry(country).replaceAll(" ", "_");
    return countryContinentMap[c] || "Unknown";
  }

  /* ============================================================
     REGION COUNTS — ENDA SANNINGEN (ALL_STORES)
     ============================================================ */
  function updateRegionCounts() {
    const list = ALL_STORES;

    const counts = {
      all: list.filter((s) => !s.deleted).length,
      approved: list.filter((s) => s.approved && !s.deleted).length,
      pending: list.filter((s) => !s.approved && !s.flagged && !s.deleted).length,
      flagged: list.filter((s) => s.flagged && !s.deleted).length,
      deleted: list.filter((s) => s.deleted).length,
      repair: list.filter((s) => !s.photo_reference && !s.deleted).length,
    };

    $$(".filters .pill").forEach((p) => {
      const tab = p.dataset.tab;
      if (counts[tab] !== undefined) {
        let badge = p.querySelector(".badge-count");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "badge-count";
          badge.style.marginLeft = "6px";
          badge.style.fontSize = ".85rem";
          badge.style.opacity = "0.7";
          p.appendChild(badge);
        }
        badge.textContent = `(${counts[tab]})`;
      }
    });

    console.log("🔢 Backoffice counts (GLOBAL):", counts);
  }

  /* ============================================================
     LIST VIEW
     ============================================================ */
  function renderListView(list) {
    const wrap = $(".listview-wrap");
    if (!wrap) return;

    // Existing HTML table uses #tbody in your template;
    // We'll keep list rendering simple and not change layout.
    const tbody = document.getElementById("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    list.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(s.name)}</td>
        <td>
          ${flagURL(s.country, s.country_iso2) ? `<img src="${flagURL(s.country, s.country_iso2)}" class="flag">` : ""}
          ${safe(s.country)}
        </td>
        <td>${safe(s.continent)}</td>
        <td>${safe(s.city)}</td>
        <td>${safe(s.type || (Array.isArray(s.types) ? s.types.join(", ") : ""))}</td>
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
          <button class="btn small danger" onclick="toggleDeleteById(${s.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ============================================================
     CARDS VIEW
     ============================================================ */
  function renderCards(list) {
    const grid = $("#cards");
    if (!grid) return;
    grid.innerHTML = "";

    list.forEach((s) => {
      const borderClass = s.deleted
        ? "border-gray"
        : s.flagged
          ? "border-red"
          : s.approved
            ? "border-green"
            : "border-gold";

      const card = document.createElement("div");
      card.className = `card ${borderClass}`;
      card.dataset.id = String(s.id); // data attribute only, no layout impact

      // Photo
      const img = document.createElement("img");
      img.className = "photo";
      img.src = photoURL(s.photo_reference, 800);
      img.onerror = () => (img.src = CFG.FALLBACK_IMG);
      card.appendChild(img);

      // Body
      const body = document.createElement("div");
      body.className = "body";

      const h3 = document.createElement("h3");
      h3.className = "twoline";
      h3.textContent = safe(s.name);
      body.appendChild(h3);

      const types = Array.isArray(s.types) ? s.types : (s.type ? [s.type] : []);
      const typeBadges = types
        .map((t) => {
          const color = t === "store" ? "blue" : t === "lounge" ? "gold" : "gray";
          let html = `<span class="badge ${color}">${t}</span>`;

          if (t === "lounge" && s.access) {
            const accessColor =
              s.access === "public" ? "green" : s.access === "members" ? "purple" : "gray";
            html += `<span class="badge access ${accessColor}">${String(s.access).toUpperCase()}</span>`;
          }
          return html;
        })
        .join(" ");

      const badgeWrap = document.createElement("div");
      badgeWrap.className = "badge-wrap";
      badgeWrap.innerHTML = typeBadges || `<span class="badge gray">–</span>`;
      body.appendChild(badgeWrap);

      // Location
      const loc = document.createElement("div");
      loc.className = "locrow";

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

      if (s.continent) {
        const cont = document.createElement("div");
        cont.className = "continent-line";
        cont.textContent = safe(s.continent);
        loc.appendChild(cont);
      }

      body.appendChild(loc);

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

      const reviewsLink = document.createElement("div");
      reviewsLink.className = "reviewslink";
      reviewsLink.innerHTML = `
        <button class="btn small ghost" onclick="editStore(${s.id})">
          💬 View Comments / Reviews
        </button>
      `;
      body.appendChild(reviewsLink);

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

      // Actions
      const actions = document.createElement("div");
      actions.className = "actions";

      const approveBtn = makeBtn("Approve", () => approveStore(s.id), "green");
      const deleteBtn = makeBtn(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "danger");
      const editBtn = makeBtn("Edit", () => editStore(s.id), "blue");
      const repairBtn = makeBtn("Repair Photo", () => repairPhoto(s.id, s.place_id, img), "orange");

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

    if (!list.length) {
      grid.innerHTML = `<p class="muted center">No stores</p>`;
    }
  }

  function makeBtn(label, onclick, cls = "") {
    const b = document.createElement("button");
    b.className = `btn ${cls}`.trim();
    b.textContent = label;
    if (typeof onclick === "function") b.onclick = onclick;
    return b;
  }

  /* ============================================================
     RENDER (MISSING BEFORE) — SINGLE SWITCH
     ============================================================ */
  function render() {
    // Search filter (does not affect layout)
    const q = ($("#searchInput")?.value || "").trim().toLowerCase();

    let list = STORES;
    if (q) {
      list = STORES.filter((s) => {
        const blob = `${safe(s.name)} ${safe(s.city)} ${safe(s.country)}`.toLowerCase();
        return blob.includes(q);
      });
    }

    if (CURRENT_VIEW === "cards") renderCards(list);
    else renderListView(list);
  }

  /* ============================================================
     DATA LOADING — EN KÄLLA FÖR LISTA, EN FÖR COUNTS
     ============================================================ */
  async function reloadData(tab = CURRENT_TAB) {
    CURRENT_TAB = tab;

    // Mark active tab (same UI)
    $$(".filters .pill").forEach((p) =>
      p.classList.toggle("active", p.dataset.tab === CURRENT_TAB)
    );

    // Toggle view (same UI)
    if (CURRENT_VIEW === "cards") {
      $("#cards") && ($("#cards").style.display = "grid");
      $(".listview-wrap") && ($(".listview-wrap").style.display = "none");
    } else {
      $("#cards") && ($("#cards").style.display = "none");
      $(".listview-wrap") && ($(".listview-wrap").style.display = "flex");
    }

    const grid = $("#cards");
    if (grid) grid.innerHTML = "<p class='muted center'>Loading…</p>";

    // 1) ALL rows for counts
    const allResp = await WCL_BO.supabase
      .from("stores")
      .select("id,approved,flagged,deleted,photo_reference");

    ALL_STORES = allResp.data || [];

    // 2) Build query for current tab
    const SELECT_FIELDS =
      "id,name,city,country,continent,type,types,address,phone,access,rating," +
      "approved,flagged,deleted,status,photo_reference,place_id,website,created_at,flag_reason,country_iso2";

    let base = WCL_BO.supabase
      .from("stores")
      .select(SELECT_FIELDS)
      .order("id", { ascending: false });

    if (tab === "approved") {
      base = base.eq("approved", true).eq("deleted", false);
    } else if (tab === "pending") {
      base = base.eq("approved", false).eq("flagged", false).eq("deleted", false);
    } else if (tab === "flagged") {
      base = base.eq("flagged", true).eq("deleted", false);
    } else if (tab === "deleted") {
      base = base.eq("deleted", true);
    } else {
      base = base.eq("deleted", false); // all
    }

    // 3) Fetch display rows
    const { data, error } = await base;
    if (error) {
      console.error(error);
      if (grid) grid.innerHTML = "<p class='error center'>Error loading stores</p>";
      return;
    }

    STORES = (data || []).map((s) => ({
      ...s,
      continent: s.continent || countryToContinent(s.country),
    }));

    // 4) Render + counts
    render();
    updateRegionCounts();

    console.log(
      `reloadData(): tab=${CURRENT_TAB}, shown=${STORES.length}, total=${ALL_STORES.length}`
    );
  }

  /* ============================================================
     MOD ACTIONS
     ============================================================ */
  async function approveStore(id) {
    const { error } = await WCL_BO.supabase
      .from("stores")
      .update({ approved: true, flagged: false, deleted: false })
      .eq("id", id);

    if (error) return toast("Error approving", "error");

    toast("Approved ✅");
    await reloadData(CURRENT_TAB);
  }

  async function unflagStore(id) {
    const { error } = await WCL_BO.supabase
      .from("stores")
      .update({ flagged: false, flag_reason: null })
      .eq("id", id);

    if (error) return toast("Error unflagging", "error");

    toast("Unflagged ✅");
    await reloadData(CURRENT_TAB);
  }

  async function toggleDelete(s) {
    const next = !s.deleted;

    const { error } = await WCL_BO.supabase
      .from("stores")
      .update({ deleted: next })
      .eq("id", s.id);

    if (error) return toast("Error updating delete", "error");

    toast(next ? "Moved to Trash 🗑️" : "Restored ♻️");
    await reloadData(CURRENT_TAB);
  }

  async function toggleDeleteById(id) {
    const s = STORES.find((x) => x.id === id) || ALL_STORES.find((x) => x.id === id);
    if (!s) return toast("Store not found", "error");
    // Minimal object with deleted state
    await toggleDelete({ id, deleted: !!s.deleted });
  }

  /* ==================== REPAIR PHOTO ================= */
  async function repairPhoto(id, place_id, imgEl) {
    const row = window.event?.target?.closest("tr");
    if (row) row.style.transition = "background-color 0.4s ease";

    if (!place_id) {
      toast("No place_id found for this store", "error");
      return;
    }

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
      const { error } = await WCL_BO.supabase
        .from("stores")
        .update({ photo_reference: newRef })
        .eq("id", id);

      if (error) {
        console.error(error);
        toast("Error updating photo", "error");
        if (row) row.style.backgroundColor = "";
        return;
      }

      toast("Photo repaired ✅");
      if (imgEl) imgEl.src = buildPhotoProxyUrl(newRef);
      if (row) {
        row.style.backgroundColor = "rgba(144,238,144,0.4)";
        setTimeout(() => (row.style.backgroundColor = ""), 800);
      }
    } catch (e) {
      console.error(e);
      toast("Repair failed", "error");
      if (row) row.style.backgroundColor = "";
    }
  }

  /* ============================================================
     EDIT MODAL (keeps your existing markup)
     Scroll-fix: preserve scroll + optionally re-focus edited card
     ============================================================ */
  async function editStore(id) {
    closeEdit();

    const [storeResp, commentsResp] = await Promise.all([
      WCL_BO.supabase.from("stores").select("*").eq("id", id).single(),
      WCL_BO.supabase
        .from("store_comments")
        .select("*")
        .eq("store_id", id)
        .order("created_at", { ascending: false }),
    ]);

    const store = storeResp?.data;
    const error = storeResp?.error;
    const comments = commentsResp?.data || [];

    if (error || !store) {
      toast("Failed to load store", "error");
      console.error(error);
      return;
    }

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal">
        <h3>Edit Store</h3>
        <div class="edit-grid">

          <label>Name</label>
          <input id="edit-name" value="${safe(store.name)}" />

          <label>Address</label>
          <input id="edit-address" value="${safe(store.address || "")}" />

          <label>Phone</label>
          <input id="edit-phone" value="${safe(store.phone || "")}" />

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
              src="${store.photo_reference ? buildPhotoProxyUrl(store.photo_reference) : CFG.FALLBACK_IMG}" />
            <button id="edit-next" class="photo-nav">▶</button>
          </div>

          <div id="photo-meta" class="muted center">
            ${store.photo_reference ? "Loaded from proxy" : "No photo loaded"}
          </div>

          ${
            comments.length
              ? `<label>Comments (${comments.length})</label>
                 <div class="comment-list">
                   ${comments
                     .map(
                       (c) => `
                     <div class="comment-item">
                       <p><strong>${safe(c.user_name || "Anon")}:</strong> ${safe(c.comment)}</p>
                       <span class="muted">${new Date(c.created_at).toLocaleString()}</span>
                       <button class="btn small ghost del-comment" data-id="${c.id}">🗑️</button>
                     </div>`
                     )
                     .join("")}
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

    modal.querySelectorAll(".type-btn input").forEach((cb) => {
      cb.checked = (store.types || []).includes(cb.value);
    });

    modal.querySelectorAll(".access-pill input").forEach((radio) => {
      radio.checked = store.access === radio.value;
    });

    let refs = await fetchPhotoRefs(store.place_id);
    if (!refs.length && store.photo_reference) refs = [store.photo_reference];
    let currentIndex = Math.max(0, refs.indexOf(store.photo_reference));
    const imgEl = modal.querySelector("#edit-photo");
    const metaEl = modal.querySelector("#photo-meta");

    function showCurrent() {
      if (!refs.length) {
        imgEl.src = CFG.FALLBACK_IMG;
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

    modal.querySelectorAll(".del-comment").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this comment?")) return;
        const cid = btn.dataset.id;
        const { error } = await WCL_BO.supabase.from("store_comments").delete().eq("id", cid);
        if (error) return toast("Error deleting comment", "error");
        toast("Comment deleted 🗑️");
        closeEdit();
        editStore(id);
      });
    });

    // Repair from modal
    $("#repair-photo").onclick = async () => {
      toast("Repairing photo…", "info");
      const placeId = store.place_id;
      if (!placeId) return toast("No place_id", "error");

      const refs2 = await fetchPhotoRefs(placeId);
      if (!refs2.length) return toast("No photos found from Google", "error");

      const newRef = refs2[0];
      const { error } = await WCL_BO.supabase
        .from("stores")
        .update({ photo_reference: newRef })
        .eq("id", id);

      if (error) return toast("Error updating photo", "error");

      toast("Photo repaired ✅");
      refs = refs2;
      currentIndex = 0;
      showCurrent();
    };

    $("#edit-save").onclick = async () => {
      const selectedTypes = Array.from(
        modal.querySelectorAll(".type-btn input:checked")
      ).map((cb) => cb.value);

      const selectedAccess =
        modal.querySelector("input[name='access']:checked")?.value || null;

      const payload = {
        name: $("#edit-name").value.trim(),
        address: $("#edit-address").value.trim(),
        phone: $("#edit-phone").value.trim(),
        city: $("#edit-city").value.trim(),
        country: $("#edit-country").value.trim(),
        continent: $("#edit-continent").value || null,
        website: $("#edit-website").value.trim(),
        types: selectedTypes,
        access: selectedAccess,
        photo_reference: refs.length ? refs[currentIndex] : null,
      };

      // ✅ Scroll preserve (no layout change)
      const prevScrollY = window.scrollY;

      const { error } = await WCL_BO.supabase.from("stores").update(payload).eq("id", id);
      if (error) {
        console.error("❌ Supabase update failed:", error);
        return toast("Error saving", "error");
      }

      toast("✅ Store updated!");
      closeEdit();

      // Reload + restore scroll + focus edited card (best UX, no layout change)
      await reloadData(CURRENT_TAB);

      // Restore scroll first
      window.scrollTo({ top: prevScrollY });

      // Then attempt to bring edited card into view (center)
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) card.scrollIntoView({ block: "center" });
    };

    $("#edit-cancel").onclick = closeEdit;

    $("#edit-delete").onclick = async () => {
      await toggleDelete({ id, deleted: !!store.deleted });
      closeEdit();
    };

    $("#edit-unflag") && ($("#edit-unflag").onclick = async () => {
      await unflagStore(id);
      closeEdit();
    });
  }

  function closeEdit() {
    document.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());
  }

  /* ============================================================
     UI WIRING
     ============================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM fully loaded — Backoffice ready");

    // Filter buttons
    $$(".filters .pill").forEach((p) =>
      p.addEventListener("click", () => {
        CURRENT_TAB = p.dataset.tab;
        reloadData(CURRENT_TAB);
      })
    );

    // View toggle
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

    // Search
    $("#searchInput")?.addEventListener("input", () => render());
  });

  /* ============================================================
     EXPOSE GLOBALS REQUIRED BY HTML onclick="..."
     ============================================================ */
  window.reloadData = reloadData;
  window.render = render;

  window.approveStore = approveStore;
  window.unflagStore = unflagStore;
  window.toggleDelete = toggleDelete;
  window.toggleDeleteById = toggleDeleteById;

  window.editStore = editStore;
  window.closeEdit = closeEdit;
  window.repairPhoto = repairPhoto;
})();
