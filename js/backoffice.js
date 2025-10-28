/* ===============================
   Backoffice v4.3 — Logic & 403 Fix
   =============================== */

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ====== State ====== */
let ALL = [];
let currentTab = "pending";
let currentView = "cards";
let editingId = null;
let FLAG_TARGET_ID = null;

/* ====== Hierarchy filter ====== */
let H_SELECTED = { continent: null, country: null, city: null };
let hPhotosById = {}; // per card: {photos:[], index:0}

/* ====== Utils ====== */
const $ = (s, p = document) => p.querySelector(s);
function toast(msg, type = "info") {
  const c = $("#toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3400);
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
function fmtDate(s) {
  if (!s) return "–";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return esc(s);
  return d.toISOString().slice(0, 16).replace("T", " ");
}
function stars(n) {
  const v = Math.round(Number(n) || 0);
  return "★★★★★".slice(0, v) + "☆☆☆☆☆".slice(0, 5 - v);
}
function countryToContinent(country) {
  if (!country) return "Other";
  const c = country.trim().toLowerCase();
  const m = {
    sweden: "Europe",
    norway: "Europe",
    denmark: "Europe",
    finland: "Europe",
    iceland: "Europe",
    usa: "North America",
    "united states": "North America",
    canada: "North America",
    france: "Europe",
    germany: "Europe",
    italy: "Europe",
    spain: "Europe",
    brazil: "South America",
    argentina: "South America",
    australia: "Oceania",
    japan: "Asia",
    china: "Asia",
    india: "Asia",
      "south africa": "Africa"
  };
  return m[c] || "Other";
}

/* ====== Load ====== */
document.addEventListener("DOMContentLoaded", async () => {
  bindUI();
  await reloadData();
});

async function reloadData() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    toast("Failed to load data", "error");
    return;
  }
  ALL = (data || []).map((s) => ({
    ...s,
    continent: s.continent || countryToContinent(s.country),
  }));
  render();
}

/* ====== Filters / View ====== */
function bindUI() {
  document.querySelectorAll(".pill").forEach((p) => {
    p.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach((x) => x.classList.remove("active"));
      p.classList.add("active");
      currentTab = p.dataset.tab;

      if (currentTab === "approved") $("#hierarchyPanel").style.display = "";
      else {
        $("#hierarchyPanel").style.display = "none";
        H_SELECTED = { continent: null, country: null, city: null };
        updateCrumbs();
      }
      setView(currentView);
      render();
    });
  });

  document.querySelectorAll(".viewtoggle .seg").forEach((seg) => {
    seg.addEventListener("click", () => {
      document.querySelectorAll(".viewtoggle .seg").forEach((x) =>
        x.classList.remove("active")
      );
      seg.classList.add("active");
      setView(seg.dataset.view);
      render();
    });
  });

  $("#searchInput").addEventListener("input", render);

  $("#hSearch").addEventListener("input", buildHierarchy);
  $("#hCloseAll").addEventListener("click", () =>
    document.querySelectorAll(".h-children").forEach((el) => (el.style.display = "none"))
  );
  $("#hClearSel").addEventListener("click", () => {
    H_SELECTED = { continent: null, country: null, city: null };
    updateCrumbs();
    render();
  });

  $("#flagCancel").addEventListener("click", () => toggleFlagModal(false));
  $("#flagConfirm").addEventListener("click", onConfirmFlag);
}

function setView(v) {
  currentView = v;
  document
    .querySelectorAll(".viewtoggle .seg")
    .forEach((x) => x.classList.toggle("active", x.dataset.view === v));
  if (currentTab === "approved") $("#hierarchyPanel").style.display = "";
}

function filtered() {
  let arr = [...ALL];
  if (currentTab === "approved") arr = arr.filter((s) => s.approved && !s.deleted);
  if (currentTab === "pending") arr = arr.filter((s) => !s.approved && !s.deleted);
  if (currentTab === "flagged") arr = arr.filter((s) => s.flagged && !s.deleted);
  if (currentTab === "deleted") arr = arr.filter((s) => s.deleted);

  if (currentTab === "approved") {
    if (H_SELECTED.continent) arr = arr.filter((s) => s.continent === H_SELECTED.continent);
    if (H_SELECTED.country) arr = arr.filter((s) => s.country === H_SELECTED.country);
    if (H_SELECTED.city) arr = arr.filter((s) => s.city === H_SELECTED.city);
  }

  const q = $("#searchInput").value.trim().toLowerCase();
  if (q) {
    arr = arr.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.city || "").toLowerCase().includes(q) ||
        (s.country || "").toLowerCase().includes(q) ||
        (s.address || "").toLowerCase().includes(q)
    );
  }
  return arr;
}

/* ====== Hierarchy ====== */
function updateCrumbs() {
  const parts = [];
  if (H_SELECTED.continent) parts.push(H_SELECTED.continent);
  if (H_SELECTED.country) parts.push(H_SELECTED.country);
  if (H_SELECTED.city) parts.push(H_SELECTED.city);
  $("#hCrumbs").innerHTML = parts.length
    ? `Showing: <b>${esc(parts.join(" → "))}</b>`
    : `Showing: <b>All Approved</b>`;
}

/* ====== Render (cards & tables) ====== */
function render() {
  const list = filtered();
  const showCards = currentView === "cards";

  if (currentTab === "approved") {
    $("#hierarchyPanel").style.display = "";
    buildHierarchy();
  } else $("#hierarchyPanel").style.display = "none";

  $("#cards").style.display = showCards ? "" : "none";
  $("#table").style.display = !showCards ? "" : "none";

  if (showCards) renderCards(list);
  else renderTable(list);
}

function cardBadges(s) {
  const arr = [];
  const tt = (s.types && Array.isArray(s.types)
    ? s.types
    : s.type
    ? [s.type]
    : []
  ).map((x) => String(x || "").toLowerCase());

  if (tt.includes("store")) arr.push(`<span class="badge b-store">Store</span>`);
  if (tt.includes("lounge")) arr.push(`<span class="badge b-lounge">Lounge</span>`);
  if (s.access) {
    const a = String(s.access).toLowerCase();
    if (a === "public") arr.push(`<span class="badge b-public">Public</span>`);
    else if (a === "membership") arr.push(`<span class="badge b-membership">Membership</span>`);
    else if (a === "members")
      arr.push(`<span class="badge b-membersonly">Members Only</span>`);
  }
  if (s.continent)
    arr.push(`<span class="badge b-continent">🌍 ${esc(s.continent)}</span>`);
  return arr.join(" ");
}

/* ====== NEW — Permanent image fix ====== */
function cardImageSrc(s) {
  if (s.photo_reference) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(
      s.photo_reference
    )}&key=${GOOGLE_BROWSER_KEY}`;
  }

  // if Supabase URL (custom upload or stored)
  if (s.photo_url && !s.photo_url.includes("PhotoService.GetPhoto")) {
    return s.photo_url;
  }

  // fallback GitHub default
  const tt = (s.types && s.types.length
    ? s.types
    : s.type
    ? [s.type]
    : []
  ).map((x) => String(x || "").toLowerCase());
  return tt.includes("lounge") ? "images/lounge.jpg" : "images/store.jpg";
}
function renderEditFormHTML(s) {
  return `
    <div class="edit-grid">
      <input class="full" data-k="name" value="${esc(s.name||"")}" placeholder="Name">
      <input data-k="phone" value="${esc(s.phone||"")}" placeholder="Phone">
      <input data-k="website" value="${esc(s.website||"")}" placeholder="https://">
      <input class="full" data-k="address" value="${esc(s.address||"")}" placeholder="Address">
      <input data-k="city" value="${esc(s.city||"")}" placeholder="City">
      <input data-k="state" value="${esc(s.state||"")}" placeholder="State/Region">
      <input data-k="country" value="${esc(s.country||"")}" placeholder="Country">
      <select data-k="access">
        <option value="">Access…</option>
        <option value="public" ${s.access==='public'?'selected':''}>Public</option>
        <option value="membership" ${s.access==='membership'?'selected':''}>Membership</option>
        <option value="members" ${s.access==='members'?'selected':''}>Members Only</option>
      </select>
      <select data-k="type">
        <option value="">Type…</option>
        <option value="store" ${s.type==='store'?'selected':''}>Store</option>
        <option value="lounge" ${s.type==='lounge'?'selected':''}>Lounge</option>
        <option value="other" ${s.type==='other'?'selected':''}>Other</option>
      </select>
      <input type="number" min="0" max="5" step="1" data-k="rating" value="${Number(s.rating||0)}" placeholder="Rating 0–5">
      <input class="full" data-k="photo_url" value="${esc(s.photo_url||"")}" placeholder="Photo URL">
      <input type="hidden" data-k="photo_reference" value="${esc(s.photo_reference||"")}">
      <input type="hidden" data-k="place_id" value="${esc(s.place_id||"")}">
    </div>

    <div class="edit-help">
      Tip: If Google <code>place_id</code> exists we will load its photos to choose from. Otherwise paste a direct image URL or tick “Use default image”.
    </div>

    <div class="photo-row">
      <button class="photo-nav" data-photo="prev">◀</button>
      <img class="photo-preview" src="${esc(cardImageSrc(s))}" alt="Preview">
      <button class="photo-nav" data-photo="next">▶</button>
      <span class="photo-meta">No photos loaded</span>
      <button class="btn" data-photo="use">Use this photo</button>
      <label class="photo-check"><input type="checkbox" data-photo="default"> Use default image</label>
    </div>
  `;
}

function renderCards(list) {
  const c = $("#cards");
  c.innerHTML = list.map(s => {
    const ratingStars = stars(s.rating);
    const img = cardImageSrc(s);
    const status = s.deleted ? "Deleted" : s.flagged ? "Flagged" : s.approved ? "Approved" : "Pending";
    const actions = cardActionsFor(s);

    return `
      <div class="card" data-id="${s.id}">
        <img class="card-img" src="${esc(img)}" alt="${esc(s.name||'')}" onerror="this.src='images/store.jpg'">
        <div class="card-body">
          <div class="title">${s.flagged ? '🚩' : ''}${esc(s.name||"–")}</div>
          <div class="badges">${cardBadges(s)}</div>
          <div class="row rating" title="Rating">${ratingStars}</div>
          <div class="row muted">📍 ${esc(s.city||"")}${s.city&&s.country?', ':''}${esc(s.country||"")}</div>
          <div class="row muted">🏠 ${esc(s.address||"–")}</div>
          ${s.phone?`<div class="row muted">📞 ${esc(s.phone)}</div>`:""}
          ${s.website?`<div class="row"><a href="${esc(s.website)}" target="_blank" rel="noopener">🌐 ${esc(s.website)}</a></div>`:""}
          <div class="meta"><div>🕓 ${fmtDate(s.created_at)}</div><div>${s.added_by?`👤 ${esc(s.added_by)}`:""}</div></div>
          <div class="edit-zone" style="display:none">${renderEditFormHTML(s)}</div>
          <div class="row muted">Status: <strong>${status}</strong></div>
          <div class="actions">${actions}</div>
        </div>
      </div>`;
  }).join("");

  c.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", onCardAction));
}

function cardActionsFor(s) {
  const id = s.id;
  const arr = [];
  if (!s.deleted) {
    if (!s.approved) arr.push(`<button class="btn sm" data-act="approve" data-id="${id}">Approve</button>`);
    else arr.push(`<button class="btn sm" data-act="unapprove" data-id="${id}">Unapprove</button>`);
    if (!s.flagged) arr.push(`<button class="btn sm" data-act="flag" data-id="${id}">Flag</button>`);
    else arr.push(`<button class="btn sm" data-act="unflag" data-id="${id}">Unflag</button>`);
    arr.push(`<button class="btn sm" data-act="edit" data-id="${id}">Edit</button>`);
    arr.push(`<button class="btn sm danger" data-act="delete" data-id="${id}">Delete</button>`);
    arr.push(`<button class="btn sm" data-act="save" data-id="${id}" style="display:none">Save</button>`);
    arr.push(`<button class="btn sm" data-act="cancel" data-id="${id}" style="display:none">Cancel</button>`);
  } else arr.push(`<button class="btn sm" data-act="restore" data-id="${id}">Restore</button>`);
  return arr.join(" ");
}

/* ---------- Card actions ---------- */
async function setApproved(id, val) {
  const updates = val ? { approved: true, flagged: false } : { approved: false };
  const { error } = await supabase.from("stores").update(updates).eq("id", id);
  if (error) { console.error(error); toast("Update failed", "error"); return; }
  toast(val ? "Approved ✅" : "Unapproved", "success");
  await reloadData();
}

async function setFlagged(id, val, reason = null) {
  const upd = val
    ? { flagged: true, flag_reason: reason || "manual | flagged by admin" }
    : { flagged: false, flag_reason: null };
  const { error } = await supabase.from("stores").update(upd).eq("id", id);
  if (error) { console.error(error); toast("Update failed", "error"); return; }
  toast(val ? "Flagged 🚩" : "Unflagged", "success");
  await reloadData();
}

async function setDeleted(id, val) {
  const { error } = await supabase.from("stores").update({ deleted: val }).eq("id", id);
  if (error) { console.error(error); toast("Update failed", "error"); return; }
  toast(val ? "Moved to Trash 🗑️" : "Restored", "success");
  await reloadData();
}

/* ---------- Save Edit (with 403 fix) ---------- */
async function saveEdit(id, payload) {
  // default cleanup
  if (!payload.photo_url && !payload.photo_reference) {
    payload.photo_url = null;
    payload.photo_reference = null;
  }

  // regenerate Google URL if needed
  if (payload.photo_reference &&
      (!payload.photo_url || payload.photo_url.includes("PhotoService.GetPhoto"))) {
    payload.photo_url =
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${payload.photo_reference}&key=${GOOGLE_BROWSER_KEY}`;
  }

  const { error } = await supabase.from("stores").update(payload).eq("id", id);
  if (error) { console.error(error); toast("Save failed", "error"); return; }
  toast("Saved ✔", "success");
  editingId = null;
  await reloadData();
}

/* ---------- Flag modal ---------- */
let FLAG_TARGET_ID = null;
function openFlagModal(id) {
  FLAG_TARGET_ID = id;
  $("#flagReason").value = "";
  toggleFlagModal(true);
}
function toggleFlagModal(show) {
  $("#flagModal").style.display = show ? "flex" : "none";
}
async function onConfirmFlag() {
  const reason = $("#flagReason").value.trim();
  toggleFlagModal(false);
  if (!FLAG_TARGET_ID) return;
  await setFlagged(FLAG_TARGET_ID, true, reason || null);
  FLAG_TARGET_ID = null;
}

/* ---------- Photo Picker ---------- */
let placesService = null;
function ensurePlacesService() {
  if (placesService) return true;
  if (!window.google || !window.google.maps || !window.google.maps.places) return false;
  placesService = new google.maps.places.PlacesService(document.getElementById("gmap"));
  return true;
}

function initPhotoPicker(scopeEl, id) {
  const ez = scopeEl.querySelector(".edit-zone");
  if (!ez) return;
  const placeId = ez.querySelector('[data-k="place_id"]')?.value || "";
  const prev = ez.querySelector('[data-photo="prev"]');
  const next = ez.querySelector('[data-photo="next"]');
  const useBtn = ez.querySelector('[data-photo="use"]');
  const defChk = ez.querySelector('[data-photo="default"]');
  const img = ez.querySelector(".photo-preview");
  const meta = ez.querySelector(".photo-meta");
  const urlInput = ez.querySelector('[data-k="photo_url"]');
  const refInput = ez.querySelector('[data-k="photo_reference"]');

  hPhotosById[id] = hPhotosById[id] || { photos: [], index: 0 };

  function updatePhotoPreview() {
    const st = hPhotosById[id];
    if (!st.photos.length) { meta.textContent = "No photos loaded"; return; }
    const p = st.photos[st.index];
    const url = p.getUrl({ maxWidth: 800 });
    img.src = url;
    meta.textContent = `Photo ${st.index + 1}/${st.photos.length}`;
  }

  function nav(delta) {
    const st = hPhotosById[id];
    if (!st.photos.length) return;
    st.index = (st.index + delta + st.photos.length) % st.photos.length;
    updatePhotoPreview();
  }

  prev.addEventListener("click", () => nav(-1));
  next.addEventListener("click", () => nav(1));

  useBtn.addEventListener("click", () => {
    const st = hPhotosById[id];
    if (!st.photos.length) { toast("No Google photos to use", "info"); return; }
    const p = st.photos[st.index];
    const ref = p.photo_reference || "";
    if (ref) {
      refInput.value = ref;
      urlInput.value = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${GOOGLE_BROWSER_KEY}`;
    } else {
      urlInput.value = p.getUrl({ maxWidth: 800 });
    }
    toast("Photo selected", "success");
  });

  defChk.addEventListener("change", () => {
    if (defChk.checked) {
      const tt = (urlInput.value || "").toLowerCase();
      img.src = tt.includes("lounge") ? "images/lounge.jpg" : "images/store.jpg";
      meta.textContent = "Default image selected";
    } else updatePhotoPreview();
  });

  if (!placeId) { meta.textContent = "No place_id — paste a Photo URL or tick default."; return; }

  if (ensurePlacesService()) {
    placesService.getDetails({ placeId, fields: ["photos"] }, (res, status) => {
      if (status === "OK" && res && res.photos?.length) {
        hPhotosById[id] = { photos: res.photos, index: 0 };
        updatePhotoPreview();
      } else meta.textContent = "No Google photos found";
    });
  } else {
    meta.textContent = "Loading Google photos…";
    const t = setInterval(() => {
      if (ensurePlacesService()) { clearInterval(t); initPhotoPicker(scopeEl, id); }
    }, 400);
    setTimeout(() => clearInterval(t), 6000);
  }
}

/* ---------- Google init ---------- */
function _mapsReady() {
  if (!window.google || !google.maps || !google.maps.places) return;
  new google.maps.Map(document.getElementById("gmap"));
}
window._mapsReady = _mapsReady;
