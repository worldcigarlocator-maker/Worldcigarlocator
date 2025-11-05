/* ============================================================
   Backoffice V5 — Moderation + Hierarki + Edit + Proxy
   Works with:
   - Supabase table: stores
     cols (min): id, name, city, country, continent, type, access, rating,
                 approved (bool), flagged (bool), deleted (bool),
                 status (text), photo_reference (text), place_id (text),
                 website (text), flag_reason (text), created_at (timestamptz)
   - Edge functions:
       /photo-proxy?photo_reference=...&maxwidth=...
       /photo-refs?place_id=...
   ============================================================ */

/* ======================== CONFIG ======================== */
const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",
  PHOTO_PROXY_URL:
    "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  PHOTO_REFS_URL:
    "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs",
  FALLBACK_IMG:
    "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
};

WCL.supabase = window.supabase.createClient(
  WCL.SUPABASE_URL,
  WCL.SUPABASE_ANON_KEY
);

/* ======================== STATE ========================= */
let STORES = [];
let CURRENT_TAB = "pending"; // all | approved | pending | flagged | deleted
let CURRENT_VIEW = "cards";  // cards | list
let HIER_SEL = { continent: null, country: null, city: null };
let EDIT_CTX = { refs: [], index: 0 };

/* ======================== HELPERS ======================== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const safe = (v) => (v ?? "").toString();
const prettyDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const toast = (msg, cls = "success") => {
  const c = $("#toast-container");
  const t = document.createElement("div");
  t.className = `toast ${cls}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2500);
};

const photoURL = (ref, w = 800) =>
  ref
    ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(
        ref
      )}&maxwidth=${w}`
    : WCL.FALLBACK_IMG;

const starRow = (rating) => {
  const r = Math.round(Number(rating) || 0);
  return Array.from({ length: 5 })
    .map((_, i) => (i < r ? "★" : "☆"))
    .join("");
};

const countryToContinent = (country) => {
  const c = (country || "").toLowerCase();
  if (
    [
      "sweden",
      "germany",
      "france",
      "italy",
      "spain",
      "norway",
      "finland",
      "denmark",
      "netherlands",
      "belgium",
      "austria",
      "switzerland",
      "poland",
      "czech republic",
      "czechia",
    ].includes(c)
  )
    return "Europe";
  if (["united states", "usa", "canada", "mexico", "cuba", "dominican republic"].includes(c))
    return "North America";
  if (["brazil", "argentina", "chile", "peru", "colombia", "uruguay", "paraguay"].includes(c))
    return "South America";
  if (
    [
      "china",
      "japan",
      "india",
      "thailand",
      "malaysia",
      "singapore",
      "israel",
      "turkey",
      "vietnam",
      "indonesia",
    ].includes(c)
  )
    return "Asia";
  if (["south africa", "nigeria", "kenya", "morocco", "egypt", "ghana"].includes(c))
    return "Africa";
  if (["australia", "new zealand", "fiji"].includes(c)) return "Oceania";
  return "Other";
};

/* ===================== DATA LOADING ====================== */
async function reloadData(tab = CURRENT_TAB) {
  CURRENT_TAB = tab;

  // uppdatera tab UI
  $$(".filters .pill").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === CURRENT_TAB)
  );

  // Visa rätt view-omslag
  if (CURRENT_VIEW === "cards") {
    $("#cards").style.display = "grid";
    $(".listview-wrap").style.display = "none";
  } else {
    $("#cards").style.display = "none";
    $(".listview-wrap").style.display = "flex";
  }

  const grid = $("#cards");
  grid.innerHTML = "<p class='muted' style='text-align:center'>Loading…</p>";

  // Basfråga
  let q = WCL.supabase.from("stores").select(
    "id,name,city,country,continent,type,access,rating,approved,flagged,deleted,status,photo_reference,place_id,website,created_at,flag_reason"
  ).order("id", { ascending: false });

  // Logiska filter (OBS: ingen 'pending' kolumn)
  if (tab === "approved") q = q.eq("approved", true).eq("deleted", false);
  else if (tab === "flagged") q = q.eq("flagged", true).eq("deleted", false);
  else if (tab === "deleted") q = q.eq("deleted", true);
  else if (tab === "pending")
    q = q.eq("approved", false).eq("flagged", false).eq("deleted", false);
  else q = q.eq("deleted", false); // all

  const { data, error } = await q;
  if (error) {
    console.error(error);
    grid.innerHTML = "<p class='error' style='text-align:center'>Error loading stores</p>";
    return;
  }
  STORES = (data || []).map((s) => ({
    ...s,
    continent: s.continent || countryToContinent(s.country),
  }));

  // Render enligt vald vy
  render();
}

function render() {
  const term = $("#searchInput").value.trim().toLowerCase();
  let list = !term
    ? STORES
    : STORES.filter((s) =>
        [s.name, s.city, s.country].some((v) => safe(v).toLowerCase().includes(term))
      );

  if (CURRENT_VIEW === "cards") {
    renderCards(list);
  } else {
    renderHierarchy(list);
    renderTable(applyHierarchyFilter(list));
  }
}

/* ===================== CARD RENDERING ==================== */
function renderCards(list) {
  const grid = $("#cards");
  grid.innerHTML = "";

  list.forEach((s) => {
    const card = document.createElement("div");
    const borderClass = s.deleted
      ? "border-gray"
      : s.flagged
      ? "border-red"
      : s.approved
      ? "border-green"
      : "border-gold";
    card.className = `card ${borderClass}`;

    const img = document.createElement("img");
    img.className = "photo";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);

    const body = document.createElement("div");
    body.className = "body";
    body.innerHTML = `
      <h3>${safe(s.name)}</h3>
      <p><strong>📍</strong> ${safe(s.city)}, ${safe(s.country)}</p>
      <p><strong>🗺️</strong> ${safe(s.continent)}</p>
      <p><strong>⭐</strong> ${s.rating ?? "–"}</p>
      <div class="badges">
        ${s.approved ? `<span class='badge green'>APPROVED</span>` : ""}
        ${s.flagged ? `<span class='badge red'>FLAGGED</span>` : ""}
        ${s.deleted ? `<span class='badge gray'>DELETED</span>` : ""}
        ${!s.approved && !s.flagged && !s.deleted ? `<span class='badge gold'>PENDING</span>` : ""}
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      makeBtn("Approve", () => approveStore(s.id), "green"),
      s.flagged
        ? makeBtn("Unflag", () => unflagStore(s.id), "yellow")
        : makeBtn("Flag", () => openFlagModal(s), "danger"),
      makeBtn(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "danger"),
      makeBtn("Edit", () => openEdit(s), "blue")
    );

    card.append(img, body, actions);
    grid.appendChild(card);
  });

  if (!list.length) {
    grid.innerHTML = `<p class="muted" style="text-align:center">No stores</p>`;
  }
}

function makeBtn(label, onClick, cls = "") {
  const b = document.createElement("button");
  b.className = `btn ${cls}`;
  b.textContent = label;
  b.onclick = onClick;
  return b;
}

/* ===================== LIST RENDERING ==================== */
function renderTable(list) {
  const tbody = $("#tbody");
  tbody.innerHTML = "";

  list.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safe(s.name)}</td>
      <td>${safe(s.country)}</td>
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
      <td></td>
    `;

    const actionsTd = tr.lastElementChild;
    actionsTd.style.whiteSpace = "nowrap";
    actionsTd.append(
      makeBtn("Edit", () => openEdit(s), "blue"),
      makeBtn("Approve", () => approveStore(s.id), "green"),
      s.flagged
        ? makeBtn("Unflag", () => unflagStore(s.id), "yellow")
        : makeBtn("Flag", () => openFlagModal(s), "danger"),
      makeBtn(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), "danger")
    );

    tbody.appendChild(tr);
  });

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="muted" style="text-align:center">No stores</td></tr>`;
  }
}

/* ================ HIERARCHY (LIST-VIEW) ================== */
function renderHierarchy(list) {
  const panel = $("#hierarchyPanel");
  panel.innerHTML = "";

  const byCont = groupBy(list, (s) => s.continent || "Other");
  Object.keys(byCont)
    .sort()
    .forEach((continent) => {
      const contNode = line("continent", continent, countStores(byCont[continent]));
      const nestedCountries = document.createElement("div");
      nestedCountries.className = "nested";

      contNode.addEventListener("click", () => {
        toggleNested(nestedCountries, contNode);
        HIER_SEL = { continent, country: null, city: null };
        render(); // uppdatera tabell
        highlight(panel, contNode);
      });

      const byCountry = groupBy(byCont[continent], (s) => s.country || "Unknown");
      Object.keys(byCountry)
        .sort()
        .forEach((country) => {
          const cNode = line("country", country, countStores(byCountry[country]));
          const nestedCities = document.createElement("div");
          nestedCities.className = "nested";

          cNode.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleNested(nestedCities, cNode);
            HIER_SEL = { continent, country, city: null };
            render();
            highlight(panel, cNode);
          });

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

function line(level, label, count) {
  const el = document.createElement("div");
  el.className = `line ${level}`;
  el.innerHTML = `<span class="arrow">▶</span> ${label} <span class="muted">(${count})</span>`;
  return el;
}

function toggleNested(nested, lineEl) {
  const a = lineEl.querySelector(".arrow");
  const open = nested.style.display === "block";
  nested.style.display = open ? "none" : "block";
  a.textContent = open ? "▶" : "▼";
}

function highlight(root, el) {
  root.querySelectorAll(".highlight").forEach((n) => n.classList.remove("highlight"));
  el.classList.add("highlight");
}

function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}
const countStores = (arr) => arr.length;

function applyHierarchyFilter(list) {
  let out = list.slice();
  if (HIER_SEL.continent) out = out.filter((s) => s.continent === HIER_SEL.continent);
  if (HIER_SEL.country) out = out.filter((s) => s.country === HIER_SEL.country);
  if (HIER_SEL.city) out = out.filter((s) => s.city === HIER_SEL.city);
  return out;
}

/* ==================== MODERATION ACTIONS ================= */
async function approveStore(id) {
  const { error } = await WCL.supabase
    .from("stores")
    .update({ approved: true, flagged: false })
    .eq("id", id);
  if (error) return toast("Error approving", "error");
  toast("Approved ✅");
  reloadData(CURRENT_TAB);
}

async function unflagStore(id) {
  const { error } = await WCL.supabase
    .from("stores")
    .update({ flagged: false, flag_reason: null })
    .eq("id", id);
  if (error) return toast("Error unflagging", "error");
  toast("Unflagged ✅");
  reloadData(CURRENT_TAB);
}

function openFlagModal(s) {
  const m = document.createElement("div");
  m.className = "modal-backdrop";
  m.innerHTML = `
    <div class="modal">
      <h3>Flag store — reason</h3>
      <textarea id="flagReason" placeholder="Describe why this store should be flagged…"></textarea>
      <div class="row" style="justify-content:flex-end;gap:.6rem;">
        <button class="btn ghost" id="flagCancel">Cancel</button>
        <button class="btn danger" id="flagConfirm">Flag</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  $("#flagCancel").onclick = () => m.remove();
  $("#flagConfirm").onclick = async () => {
    const reason = $("#flagReason").value.trim() || null;
    const { error } = await WCL.supabase
      .from("stores")
      .update({ flagged: true, flag_reason: reason })
      .eq("id", s.id);
    if (error) return toast("Error flagging", "error");
    toast("Flagged 🚩");
    m.remove();
    reloadData(CURRENT_TAB);
  };
}

async function toggleDelete(s) {
  const next = !s.deleted;
  const { error } = await WCL.supabase
    .from("stores")
    .update({ deleted: next })
    .eq("id", s.id);
  if (error) return toast("Error updating delete", "error");
  toast(next ? "Moved to Trash 🗑️" : "Restored ♻️");
  reloadData(CURRENT_TAB);
}

/* ======================== EDIT MODAL ===================== */
async function openEdit(s) {
  // Hämta färsk data
  const { data, error } = await WCL.supabase
    .from("stores")
    .select("*")
    .eq("id", s.id)
    .single();
  if (error || !data) {
    toast("Failed to load store", "error");
    return;
  }
  const store = data;

  // Förbered photo-refs
  EDIT_CTX = { refs: [], index: 0 };
  if (store.place_id) {
    try {
      const res = await fetch(
        `${WCL.PHOTO_REFS_URL}?place_id=${encodeURIComponent(store.place_id)}`
      );
      const j = await res.json();
      if (Array.isArray(j.refs) && j.refs.length) {
        EDIT_CTX.refs = j.refs;
        const i = j.refs.indexOf(store.photo_reference);
        EDIT_CTX.index = i >= 0 ? i : 0;
      }
    } catch (e) {
      console.warn("photo-refs failed:", e);
    }
  }

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <h3>Edit Store</h3>
      <div class="edit-grid">
        <label>Name</label>
        <input id="e-name" value="${safe(store.name)}"/>

        <label>City</label>
        <input id="e-city" value="${safe(store.city)}"/>

        <label>Country</label>
        <input id="e-country" value="${safe(store.country)}"/>

        <label>Continent</label>
        <select id="e-continent">
          ${["Europe","North America","South America","Asia","Africa","Oceania","Other"]
            .map((c)=>`<option ${store.continent===c?"selected":""}>${c}</option>`).join("")}
        </select>

        <label>Website</label>
        <input id="e-website" value="${safe(store.website)}"/>

        <label>Type</label>
        <div class="type-group">
          <button type="button" class="type-btn ${store.type==='store'?'active':''}" data-type="store">Store</button>
          <button type="button" class="type-btn ${store.type==='lounge'?'active':''}" data-type="lounge">Lounge</button>
        </div>

        <label>Access</label>
        <div class="access-group">
          <label class="access-pill"><input type="radio" name="e-access" value="public" ${store.access==='public'?'checked':''}><span>Public</span></label>
          <label class="access-pill"><input type="radio" name="e-access" value="members" ${store.access==='members'?'checked':''}><span>Members Only</span></label>
        </div>

        <label>Photo</label>
        <div class="photo-picker">
          <button id="e-prev" class="photo-nav">◀</button>
          <img id="e-photo" class="preview-photo" src="${photoURL(store.photo_reference)}" />
          <button id="e-next" class="photo-nav">▶</button>
        </div>
        <div id="e-photo-meta" class="muted" style="text-align:center;">
          ${EDIT_CTX.refs.length ? `Photos: ${EDIT_CTX.index+1}/${EDIT_CTX.refs.length}` : "No Google photos found"}
        </div>
      </div>

      <div class="row" style="justify-content:flex-end;gap:.6rem;margin-top:1rem;">
        <button class="btn ghost" id="e-cancel">Cancel</button>
        <button class="btn blue" id="e-save">Save</button>
        ${store.flagged ? `<button class="btn yellow" id="e-unflag">Unflag</button>` : ""}
        <button class="btn danger" id="e-delete">${store.deleted?"Restore":"Delete"}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // typ-toggle
  modal.querySelectorAll(".type-btn").forEach((b) =>
    b.addEventListener("click", () => {
      modal.querySelectorAll(".type-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    })
  );

  // photo-pilar
  const imgEl = modal.querySelector("#e-photo");
  const metaEl = modal.querySelector("#e-photo-meta");
  modal.querySelector("#e-prev").onclick = () => {
    if (!EDIT_CTX.refs.length) return;
    EDIT_CTX.index = (EDIT_CTX.index - 1 + EDIT_CTX.refs.length) % EDIT_CTX.refs.length;
    imgEl.src = photoURL(EDIT_CTX.refs[EDIT_CTX.index]);
    metaEl.textContent = `Photos: ${EDIT_CTX.index + 1}/${EDIT_CTX.refs.length}`;
  };
  modal.querySelector("#e-next").onclick = () => {
    if (!EDIT_CTX.refs.length) return;
    EDIT_CTX.index = (EDIT_CTX.index + 1) % EDIT_CTX.refs.length;
    imgEl.src = photoURL(EDIT_CTX.refs[EDIT_CTX.index]);
    metaEl.textContent = `Photos: ${EDIT_CTX.index + 1}/${EDIT_CTX.refs.length}`;
  };

  // knappar
  $("#e-cancel").onclick = () => modal.remove();
  $("#e-save").onclick = () => saveEdit(store.id, modal);
  $("#e-delete").onclick = async () => {
    const next = !store.deleted;
    const { error } = await WCL.supabase
      .from("stores")
      .update({ deleted: next })
      .eq("id", store.id);
    if (error) return toast("Error updating", "error");
    toast(next ? "Moved to Trash" : "Restored");
    modal.remove();
    reloadData(CURRENT_TAB);
  };
  if (store.flagged && $("#e-unflag")) {
    $("#e-unflag").onclick = async () => {
      const { error } = await WCL.supabase
        .from("stores")
        .update({ flagged: false, flag_reason: null })
        .eq("id", store.id);
      if (error) return toast("Error unflagging", "error");
      toast("Unflagged");
      modal.remove();
      reloadData(CURRENT_TAB);
    };
  }
}

async function saveEdit(id, modal) {
  const payload = {
    name: $("#e-name").value.trim(),
    city: $("#e-city").value.trim(),
    country: $("#e-country").value.trim(),
    continent: $("#e-continent").value,
    website: $("#e-website").value.trim(),
    type: modal.querySelector(".type-btn.active")?.dataset.type || null,
    access: modal.querySelector('input[name="e-access"]:checked')?.value || null,
  };

  // sätt photo_reference om man bläddrat fram en
  if (EDIT_CTX.refs.length) {
    payload.photo_reference = EDIT_CTX.refs[EDIT_CTX.index];
  }

  const { error } = await WCL.supabase.from("stores").update(payload).eq("id", id);
  if (error) {
    console.error(error);
    return toast("Error saving", "error");
  }
  toast("Saved ✅");
  modal.remove();
  reloadData(CURRENT_TAB);
}

/* ===================== UI WIRING ========================= */
document.addEventListener("DOMContentLoaded", () => {
  // tabbar
  $$(".filters .pill").forEach((p) =>
    p.addEventListener("click", () => {
      CURRENT_TAB = p.dataset.tab;
      reloadData(CURRENT_TAB);
    })
  );

  // view-toggle
  $$(".viewtoggle .seg").forEach((seg) =>
    seg.addEventListener("click", () => {
      $$(".viewtoggle .seg").forEach((x) => x.classList.remove("active"));
      seg.classList.add("active");
      CURRENT_VIEW = seg.dataset.view;
      // växla containers
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
  $("#searchInput").addEventListener("input", () => render());

  // initial load
  reloadData("pending");
});
