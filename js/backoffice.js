/* ============================================================
   Backoffice V5 — Cards + Hierarchy + Edit + Proxy Photos
   ============================================================ */

const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",
  PHOTO_PROXY_URL: "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  FALLBACK_IMG: "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
};

WCL.supabase = window.supabase.createClient(WCL.SUPABASE_URL, WCL.SUPABASE_ANON_KEY);

// state
let CURRENT_TAB = "all";
let CURRENT_VIEW = "cards";
let STORES = [];
let FLAG_ID = null;
let EDIT_ID = null;

// tiny helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const toast = (msg, cls = "success") => {
  const c = $("#toast-container");
  const t = document.createElement("div");
  t.className = `toast ${cls}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2500);
};

const photoURL = (ref, w = 800) =>
  ref ? `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}` : WCL.FALLBACK_IMG;

const starRow = (rating) => {
  const r = Math.round(Number(rating) || 0);
  return Array.from({ length: 5 }, (_, i) => (i < r ? "★" : "☆")).join("");
};

const safe = (s) => (s ?? "").toString();

/* ============================================================
   Load + Render
   ============================================================ */
async function reloadData(tab = CURRENT_TAB) {
  CURRENT_TAB = tab;

  // tabs UI
  $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === CURRENT_TAB));

  const grid = $("#cards");
  grid.innerHTML = "<p class='muted center'>Loading…</p>";

  let q = WCL.supabase.from("stores").select("*").order("id", { ascending: false });

  // logical filters (no 'pending' column)
  if (tab === "approved") q = q.eq("approved", true).eq("deleted", false);
  else if (tab === "flagged") q = q.eq("flagged", true).eq("deleted", false);
  else if (tab === "deleted") q = q.eq("deleted", true);
  else if (tab === "pending")
    q = q.eq("approved", false).eq("flagged", false).eq("deleted", false);
  else q = q.eq("deleted", false); // all

  const { data, error } = await q;
  if (error) {
    console.error(error);
    grid.innerHTML = "<p class='error center'>Error loading stores</p>";
    $("#countLine").textContent = "";
    return;
  }

  STORES = data || [];
  $("#countLine").textContent = `${STORES.length} ${tab} stores found`;

  render();
}

function render() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const filtered = !term
    ? STORES
    : STORES.filter((s) =>
        [s.name, s.city, s.country].some((v) => safe(v).toLowerCase().includes(term))
      );

  if (CURRENT_VIEW === "cards") {
    // === Card View ===
    $("#hierarchyPanel").style.display = "none";
    $(".listview-wrap").style.display = "none";
    $("#cards").style.display = "grid";
    renderCards(filtered);
  } else {
    // === Kombinerad List + Hierarki View ===
    $("#cards").style.display = "none";
    $(".listview-wrap").style.display = "flex";
    $("#hierarchyPanel").style.display = "block";
    $("#table").style.display = "block";

    renderHierarchy(filtered); // vänster sida
    renderTable(filtered);     // höger sida
  }
}


/* ============================================================
   Render List View (Table)
   ============================================================ */
function renderTable(stores) {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  if (!stores.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="muted" style="text-align:center;">No stores found</td></tr>`;
    return;
  }

  stores.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name || "Unnamed"}</td>
      <td>${s.country || ""}</td>
      <td>${s.continent || ""}</td>
      <td>${s.city || ""}</td>
      <td>${s.type || ""}</td>
      <td>${s.access || ""}</td>
      <td>${s.rating ?? "–"}</td>
      <td>${new Date(s.created_at).toLocaleDateString()}</td>
      <td class="status ${s.deleted ? "deleted" : s.flagged ? "flagged" : s.approved ? "approved" : "pending"}">
        ${s.deleted ? "DELETED" : s.flagged ? "FLAGGED" : s.approved ? "APPROVED" : "PENDING"}
      </td>
      <td>
        <button class="btn small" onclick="editStore(${s.id})">Edit</button>
        ${s.flagged 
          ? `<button class="btn small yellow" onclick="unflag(${s.id})">Unflag</button>` 
          : `<button class="btn small danger" onclick="flag(${s.id})">Flag</button>`}
        <button class="btn small danger" onclick="removeStore(${s.id})">${s.deleted ? "Restore" : "Delete"}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
/* ============================================================
   Hierarki (Continent → Country → City)
   ============================================================ */
function renderHierarchy(stores) {
  const panel = document.getElementById("hierarchyPanel");
  panel.innerHTML = "";

  if (!stores.length) {
    panel.innerHTML = `<p class="muted center">No stores found</p>`;
    return;
  }

  // 🧩 Grupp 1: continent → countries → cities
  const continents = {};
  stores.forEach((s) => {
    const cont = s.continent || "Other";
    const country = s.country || "Unknown";
    const city = s.city || "Unknown";

    if (!continents[cont]) continents[cont] = {};
    if (!continents[cont][country]) continents[cont][country] = {};
    if (!continents[cont][country][city]) continents[cont][country][city] = [];
    continents[cont][country][city].push(s);
  });

  // 🧱 Bygg hierarki DOM
  Object.entries(continents).forEach(([cont, countries]) => {
    const contDiv = document.createElement("div");
    contDiv.className = "line continent";
    contDiv.innerHTML = `
      <div class="line-header">
        <span class="arrow">▶</span>
        <strong>${cont}</strong>
        <span class="count">${Object.values(countries).reduce((a, c) => a + Object.values(c).reduce((b, d) => b + d.length, 0), 0)}</span>
      </div>
      <div class="nested"></div>
    `;
    panel.appendChild(contDiv);

    const nestedCont = contDiv.querySelector(".nested");

    Object.entries(countries).forEach(([country, cities]) => {
      const countryDiv = document.createElement("div");
      countryDiv.className = "line country";
      countryDiv.innerHTML = `
        <div class="line-header">
          <span class="arrow">▶</span>
          <span>${country}</span>
          <span class="count">${Object.values(cities).reduce((a, b) => a + b.length, 0)}</span>
        </div>
        <div class="nested"></div>
      `;
      nestedCont.appendChild(countryDiv);

      const nestedCountry = countryDiv.querySelector(".nested");

      Object.entries(cities).forEach(([city, list]) => {
        const cityDiv = document.createElement("div");
        cityDiv.className = "line city";
        cityDiv.innerHTML = `
          <div class="line-header">
            <span class="arrow">▶</span>
            <span>${city}</span>
            <span class="count">${list.length}</span>
          </div>
          <div class="nested stores"></div>
        `;
        nestedCountry.appendChild(cityDiv);

        const nestedCity = cityDiv.querySelector(".nested");

        list.forEach((store) => {
          const storeDiv = document.createElement("div");
          storeDiv.className = "line store";
          storeDiv.innerHTML = `
            <span>${store.name}</span>
            <span class="muted">${store.type || ""}</span>
            <button class="btn small" onclick="editStore(${store.id})">Edit</button>
          `;
          nestedCity.appendChild(storeDiv);
        });
      });
    });
  });

  // 🎯 Gör pilar klickbara
  panel.querySelectorAll(".line-header").forEach((hdr) => {
    hdr.addEventListener("click", (e) => {
      const line = hdr.parentElement;
      line.classList.toggle("open");
      hdr.querySelector(".arrow").textContent = line.classList.contains("open") ? "▼" : "▶";
    });
  });
}

/* ============================================================
   Cards
   ============================================================ */
function renderCards(list) {
  const grid = $("#cards");
  grid.innerHTML = "";

  list.forEach((s) => {
    const card = document.createElement("div");
    card.className =
      "card " +
      (s.deleted ? "border-gray" : s.flagged ? "border-red" : s.approved ? "border-green" : "border-gold");

    const img = document.createElement("img");
    img.className = "photo";
    img.src = photoURL(s.photo_reference);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);

    const body = document.createElement("div");
    body.className = "body";
    body.innerHTML = `
      <div class="chip small">${safe(s.type) || "store"}</div>
      <h3>${safe(s.name)}</h3>
      <p class="muted">${safe(s.city)}, ${safe(s.country)}</p>
      <div class="stars">${starRow(s.rating)}</div>

      <div class="statusline">
        ${s.approved ? `<span class="badge green">APPROVED</span>` : ""}
        ${s.flagged ? `<span class="badge red">FLAGGED</span>` : ""}
        ${s.deleted ? `<span class="badge gray">DELETED</span>` : ""}
        ${!s.approved && !s.flagged && !s.deleted ? `<span class="badge gold">PENDING</span>` : ""}
      </div>
    `;

    // === actions (justerat)
    const actions = document.createElement("div");
    actions.className = "actions";

    // Approve (visas om ej approved)
    if (!s.approved && !s.deleted) {
      actions.append(button("Approve", () => approveStore(s.id), "ok"));
    }

    // Unflag (gul) om flagged = true
    if (s.flagged) {
      actions.append(button("Unflag", () => unflag(s.id), "warning"));
    }

    // Delete / Restore
    actions.append(
      button(s.deleted ? "Restore" : "Delete", () => toggleDelete(s), s.deleted ? "ghost" : "danger")
    );

    // Edit (alltid tillgänglig)
    actions.append(button("Edit", () => editStore(s.id), "primary"));

    card.append(img, body, actions);
    grid.appendChild(card);
  });

  if (!list.length) {
    grid.innerHTML = `<p class="muted center">No stores</p>`;
  }
}

/* ============================================================
   Button helper
   ============================================================ */
function button(label, onClick, cls = "") {
  const b = document.createElement("button");
  b.className = `btn ${cls}`;
  b.textContent = label;
  b.onclick = onClick;
  return b;
}

/* ============================================================
   Hierarchy (List view)
   ============================================================ */
function renderHierarchy(list) {
  const tree = $("#hTree");
  tree.innerHTML = "";

  // group: continent → country → city
  const byCont = {};
  for (const s of list) {
    const cont = safe(s.continent) || "Other";
    const ctry = safe(s.country) || "Unknown";
    const city = safe(s.city) || "Unknown";
    byCont[cont] ??= {};
    byCont[cont][ctry] ??= {};
    byCont[cont][ctry][city] ??= [];
    byCont[cont][ctry][city].push(s);
  }

  Object.entries(byCont)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([continent, countries]) => {
      const total = Object.values(countries).reduce(
        (acc, cities) => acc + Object.values(cities).reduce((a, arr) => a + arr.length, 0),
        0
      );
      const contRow = line("continent", continent, total);
      const contNest = nested();

      contRow.addEventListener("click", () => toggleNest(contRow, contNest));
      tree.append(contRow, contNest);

      Object.entries(countries)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {
          const subtotal = Object.values(cities).reduce((a, arr) => a + arr.length, 0);
          const cRow = line("country", country, subtotal);
          const cNest = nested();
          cRow.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleNest(cRow, cNest);
          });
          contNest.append(cRow, cNest);

          Object.entries(cities)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([city, stores]) => {
              const cityRow = line("city", city, stores.length, false);
              cityRow.addEventListener("click", (e) => {
                e.stopPropagation();
                // quick scroll to cards view of this city (or filter in list)
                CURRENT_VIEW = "cards";
                $("#cards").style.display = "grid";
                $("#hierarchyPanel").style.display = "none";
                $("#searchInput").value = city;
                render();
              });
              cNest.append(cityRow);
            });
        });
    });

  $("#hCrumbs").innerHTML = `Showing: <b>${capitalize(CURRENT_TAB)}</b>`;
}

function line(level, label, count, showArrow = true) {
  const b = document.createElement("button");
  b.className = `line ${level}`;
  b.innerHTML = `${showArrow ? `<span class="arrow">▶</span>` : ""}<span class="label">${label}</span><span class="pill">${count}</span>`;
  return b;
}
function nested() {
  const d = document.createElement("div");
  d.className = "nested";
  return d;
}
function toggleNest(btn, nest) {
  const isOpen = nest.classList.toggle("show");
  btn.classList.toggle("open", isOpen);
  const ar = btn.querySelector(".arrow");
  if (ar) ar.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
}
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ============================================================
   Actions: approve / flag / delete / edit
   ============================================================ */
async function approveStore(id) {
  const { error } = await WCL.supabase.from("stores").update({ approved: true, flagged: false }).eq("id", id);
  if (error) return toast("Error approving", "error");
  toast("Approved");
  reloadData();
}

function openFlag(s) {
  FLAG_ID = s.id;
  $("#flagReason").value = "";
  $("#flagModal").classList.add("show");
}
$("#flagCancel").onclick = () => $("#flagModal").classList.remove("show");
$("#flagConfirm").onclick = async () => {
  if (!FLAG_ID) return;
  const reason = $("#flagReason").value.trim() || null;

  // toggle flag/unflag depending on current state
  const st = STORES.find((x) => x.id === FLAG_ID);
  const next = st?.flagged ? { flagged: false, flag_reason: null } : { flagged: true, flag_reason: reason };

  const { error } = await WCL.supabase.from("stores").update(next).eq("id", FLAG_ID);
  if (error) return toast("Error updating flag", "error");
  $("#flagModal").classList.remove("show");
  FLAG_ID = null;
  toast(next.flagged ? "Flagged" : "Unflagged");
  reloadData();
};

async function toggleDelete(s) {
  const next = !s.deleted;
  const { error } = await WCL.supabase.from("stores").update({ deleted: next }).eq("id", s.id);
  if (error) return toast("Error updating delete", "error");
  toast(next ? "Moved to Trash" : "Restored");
  reloadData();
}

/* ============================================================
   Edit Store Modal (med photo-refs och pilar)
   ============================================================ */
async function editStore(id) {
  const { data, error } = await WCL.supabase.from("stores").select("*").eq("id", id).single();
  if (error || !data) {
    toast("Failed to load store", "error");
    console.error(error);
    return;
  }
  const store = data;

  // 🔹 1. Hämta photo_refs via Supabase Edge Function
  let refs = [];
  if (store.place_id) {
    try {
      const res = await fetch(
        `https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs?place_id=${encodeURIComponent(store.place_id)}`
      );
      const json = await res.json();
      refs = json?.refs || [];
    } catch (err) {
      console.warn("photo-refs fetch failed", err);
    }
  }

  // 🔹 2. Bygg modalen
  const editModal = document.createElement("div");
  editModal.className = "modal-backdrop";
  editModal.innerHTML = `
    <div class="modal">
      <h3>Edit Store</h3>
      <div class="edit-grid">
        <label>Name</label>
        <input id="edit-name" value="${store.name || ''}" />

        <label>City</label>
        <input id="edit-city" value="${store.city || ''}" />

        <label>Country</label>
        <input id="edit-country" value="${store.country || ''}" />

        <label>Website</label>
        <input id="edit-website" value="${store.website || ''}" />

        <label>Type</label>
        <div class="type-group">
          <button type="button" class="type-btn ${store.type==='store'?'active':''}" data-type="store">Store</button>
          <button type="button" class="type-btn ${store.type==='lounge'?'active':''}" data-type="lounge">Lounge</button>
        </div>

        <label>Access</label>
        <div class="access-group">
          <label class="access-pill"><input type="radio" name="access" value="public" ${store.access==='public'?'checked':''}><span>Public</span></label>
          <label class="access-pill"><input type="radio" name="access" value="members" ${store.access==='members'?'checked':''}><span>Members Only</span></label>
        </div>

        <label>Photo</label>
        <div class="photo-picker">
          <button id="edit-prev" class="photo-nav">◀</button>
          <img id="edit-photo" class="preview-photo" src="${store.photo_reference ? buildPhotoProxyUrl(store.photo_reference) : WCL.FALLBACK_IMG}" />
          <button id="edit-next" class="photo-nav">▶</button>
        </div>
        <div id="photo-meta" class="muted" style="text-align:center;">${refs.length ? `Showing ${refs.length} photos` : 'No photos found'}</div>
      </div>

      <div class="row" style="justify-content:flex-end;gap:.6rem;margin-top:1rem;">
        <button class="btn ghost" onclick="closeEdit()">Cancel</button>
        <button class="btn" onclick="saveEdit(${store.id})">Save</button>
        ${store.flagged ? `<button class="btn warning" onclick="unflag(${store.id})">Unflag</button>` : ""}
        <button class="btn danger" onclick="removeStore(${store.id})">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(editModal);

  // 🔹 3. Interaktivitet
  document.querySelectorAll(".type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".type-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // 🔹 4. Piltangenter för foto
  let currentIndex = 0;
  const imgEl = editModal.querySelector("#edit-photo");

  function updatePhoto() {
    if (!refs.length) return;
    imgEl.src = buildPhotoProxyUrl(refs[currentIndex]);
  }

  editModal.querySelector("#edit-prev").onclick = () => {
    if (!refs.length) return;
    currentIndex = (currentIndex - 1 + refs.length) % refs.length;
    updatePhoto();
  };

  editModal.querySelector("#edit-next").onclick = () => {
    if (!refs.length) return;
    currentIndex = (currentIndex + 1) % refs.length;
    updatePhoto();
  };
}


/* ============================================================
   UI wiring
   ============================================================ */
$("#reloadBtn").onclick = () => reloadData();

$("#searchBtn").onclick = render;
$("#clearBtn").onclick = () => {
  $("#searchInput").value = "";
  render();
};
$("#searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") render();
});

// tabs
$$(".tab").forEach((b) =>
  b.addEventListener("click", () => {
    reloadData(b.dataset.tab);
  })
);

// view toggle
$$(".seg").forEach((s) =>
  s.addEventListener("click", () => {
    $$(".seg").forEach((x) => x.classList.remove("active"));
    s.classList.add("active");
    CURRENT_VIEW = s.dataset.view;
    render();
  })
);

// hierarchy controls
$("#hCloseAll").onclick = () => {
  $$(".nested").forEach((n) => n.classList.remove("show"));
  $$(".line").forEach((l) => l.classList.remove("open"));
  $$(".line .arrow").forEach((a) => (a.style.transform = "rotate(0deg)"));
};

// init
document.addEventListener("DOMContentLoaded", () => {
  reloadData("all");
  toast("Backoffice ready");
});
