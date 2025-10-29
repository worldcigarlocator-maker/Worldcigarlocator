/* js/backoffice.js — World Cigar Locator (Backoffice)
   Permanent Google CDN images + GitHub fallback, full features
   Last update: 2025-10-28
*/

/* ================= CONFIG ================= */
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ"; // For Places Details REST

// Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Static fallback images (absolute URLs so de funkar överallt)
const GITHUB_STORE_FALLBACK  = "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
const GITHUB_LOUNGE_FALLBACK = "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

/* ================= STATE ================= */
let ALL = [];                       // alla stores
let currentTab  = "pending";        // 'all' | 'approved' | 'pending' | 'flagged' | 'deleted'
let currentView = "cards";          // 'cards' | 'list'
let editingId   = null;

// Hierarchy selection (för Approved)
let H_SELECTED = { continent:null, country:null, city:null };

// Photo picker state per row/card
let hPhotosById = {}; // { [id]: { refs: string[], index: number } }

/* ================= DOM HELPERS ================= */
const $  = (s, p=document)=>p.querySelector(s);
const $$ = (s, p=document)=>Array.from(p.querySelectorAll(s));

function toast(msg, type="info"){
  const c = $("#toast-container");
  if(!c) return alert(msg);
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(()=>t.remove(), 3600);
}
// alias för äldre anrop i filen
function showToast(m,t){ toast(m,t); }

function esc(s){return String(s ?? "").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(s){
  if(!s) return "–";
  const d=new Date(s);
  if(Number.isNaN(d.getTime())) return esc(s);
  return d.toISOString().slice(0,16).replace("T"," ");
}
function stars(n){
  const v = Math.round(Number(n)||0);
  return "★★★★★".slice(0,v) + "☆☆☆☆☆".slice(0,5-v);
}

/* ============ Country → Continent (fallback) ============ */
function countryToContinent(country){
  if(!country) return "Other";
  const c = country.trim().toLowerCase();
  const m = {
    "sweden":"Europe","norway":"Europe","denmark":"Europe","finland":"Europe","iceland":"Europe",
    "usa":"North America","united states":"North America","canada":"North America","mexico":"North America",
    "france":"Europe","germany":"Europe","italy":"Europe","spain":"Europe","portugal":"Europe","netherlands":"Europe","belgium":"Europe","poland":"Europe","czechia":"Europe","czech republic":"Europe","austria":"Europe","switzerland":"Europe","united kingdom":"Europe","ireland":"Europe",
    "brazil":"South America","argentina":"South America","chile":"South America","peru":"South America","colombia":"South America",
    "australia":"Oceania","new zealand":"Oceania",
    "japan":"Asia","china":"Asia","india":"Asia","south korea":"Asia","singapore":"Asia","thailand":"Asia","vietnam":"Asia","taiwan":"Asia",
    "south africa":"Africa","morocco":"Africa","egypt":"Africa","kenya":"Africa",
  };
  return m[c] || "Other";
}

/* ============ IMAGE HELPERS (permanent, legal) ============ */
// Förbättrad version – känner av vilken typ av Google-referens som används.
// Om CDN inte fungerar används automatiskt API-länken (med key).
// CDN används för permanenta, nyckellösa bilder – API-länken är temporär men alltid fungerande.

function googleCdnFromPhotoRef(ref, w = 800, h = 600, variant = 0) {
  if (!ref) return null;

  // 🧠 Om ref redan är en fullständig URL (http/https)
  if (ref.startsWith("http")) return ref;

  // 🚫 Om det är en "AWn..."-referens (Google PhotoService) → kräver API-länk
  if (/^AWn/i.test(ref)) {
    console.warn("⚠️ Using API photo URL for AWn-style reference:", ref);
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${w}&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_BROWSER_KEY}`;
  }

  // 🧹 Normalisera och rensa referensen (för CDN-kompatibla varianter)
  let clean = String(ref).trim();
  if (clean.includes("/photos/")) {
    const parts = clean.split("/");
    clean = parts[parts.length - 1];
  }
  if (clean.startsWith("p/")) clean = clean.slice(2);
  clean = clean.split("?")[0];

  // 📐 Bygg CDN-URL med olika suffix (–k-no, –no etc.)
  const tails = [
    `=w${w}-h${h}`,
    `=w${w}-h${h}-k-no`,
    `=w${w}-h${h}-no`
  ];
  const idx = Math.max(0, Math.min(variant, tails.length - 1));
  const cdnUrl = `https://lh3.googleusercontent.com/p/${encodeURIComponent(clean)}${tails[idx]}`;

  // 🧩 Testa i bakgrunden (icke-blockerande logg)
  const img = new Image();
  img.onload = () => console.log(`✅ CDN works for ${ref}`);
  img.onerror = () => console.warn(`⚠️ CDN failed, fallback may apply for ${ref}`);
  img.src = cdnUrl;

  return cdnUrl;
}

/* GitHub fallback – används om Google-bilden inte laddas alls */
function githubFallbackForTypes(typesOrType) {
  const arr = (Array.isArray(typesOrType) && typesOrType.length
    ? typesOrType
    : (typesOrType ? [typesOrType] : [])).map(x => String(x || "").toLowerCase());

  return arr.includes("lounge")
    ? GITHUB_LOUNGE_FALLBACK
    : GITHUB_STORE_FALLBACK;
}


/* Bestäm vilken bild-URL som ska användas för ett kort */
function cardImageSrc(s) {
  let srcType = "fallback";
  let finalUrl;

  if (s.photo_cdn_url) {
    finalUrl = s.photo_cdn_url;
    srcType = "cdn_url";
  } else if (s.photo_reference) {
    finalUrl = googleCdnFromPhotoRef(s.photo_reference);
    srcType = "photo_reference";
  } else if (s.photo_url && !s.photo_url.includes("PhotoService.GetPhoto")) {
    finalUrl = s.photo_url;
    srcType = "photo_url";
  } else if (s.photo_url && s.photo_url.includes("googleusercontent")) {
    finalUrl = s.photo_url;
    srcType = "googleusercontent";
  } else {
    finalUrl = githubFallbackForTypes(s.types?.length ? s.types : s.type);
  }

  console.log(`🖼️ [${s.name || "Unnamed"}] → ${srcType}`, finalUrl);
  return finalUrl;
}


/* ====== Photo references via Places Details (REST) ====== */
async function fetchPhotoRefs(placeId){
  if(!placeId) return [];
  try {
    // v1 Places
    const v1 = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=photos&key=${encodeURIComponent(GOOGLE_BROWSER_KEY)}`;
    let res = await fetch(v1);
    if(res.ok){
      const j = await res.json();
      const refs = (j.photos||[])
        .map(p => (p?.name||"").split("/").pop())
        .filter(Boolean);
      if(refs.length) return refs;
    }
    // legacy details
    const legacy = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${encodeURIComponent(GOOGLE_BROWSER_KEY)}`;
    res = await fetch(legacy);
    if(res.ok){
      const j = await res.json();
      const refs = (j.result?.photos||[]).map(p=>p.photo_reference).filter(Boolean);
      return refs;
    }
  } catch(e){ console.warn("fetchPhotoRefs error:", e); }
  return [];
}

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", async()=>{
  bindUI();
  await reloadData();
});
/* ====== LOAD & FILTER ====== */
async function reloadData(){
  try{
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("id", { ascending:false });

    if(error){ console.error(error); toast("❌ Error loading stores","error"); return; }

    ALL = data || [];
    render();
    toast(`✅ Loaded ${ALL.length} stores`, "success");
  }catch(e){
    console.error("Reload error:", e);
    toast("⚠️ Could not load stores","error");
  }
}

function setView(v){
  currentView = v;
  $$(".viewtoggle .seg").forEach(x=>x.classList.toggle("active", x.dataset.view===v));
  if(currentTab==="approved") $("#hierarchyPanel").style.display="";
}

function filtered(){
  let arr = [...ALL];

  // Tabs
  if(currentTab==="all")      arr = arr.filter(s=>!s.deleted);
  if(currentTab==="approved") arr = arr.filter(s=>s.approved && !s.deleted);
  if(currentTab==="pending")  arr = arr.filter(s=>!s.approved && !s.deleted);
  if(currentTab==="flagged")  arr = arr.filter(s=>s.flagged && !s.deleted);
  if(currentTab==="deleted")  arr = arr.filter(s=>s.deleted);

  // Hierarchy (Approved only)
  if(currentTab==="approved"){
    if(H_SELECTED.continent) arr = arr.filter(s=>(s.continent||"")===H_SELECTED.continent);
    if(H_SELECTED.country)   arr = arr.filter(s=>(s.country||"")===H_SELECTED.country);
    if(H_SELECTED.city)      arr = arr.filter(s=>(s.city||"")===H_SELECTED.city);
  }

  // Search
  const q = $("#searchInput")?.value.trim().toLowerCase() || "";
  if(q){
    arr = arr.filter(s =>
      (s.name||"").toLowerCase().includes(q) ||
      (s.city||"").toLowerCase().includes(q) ||
      (s.country||"").toLowerCase().includes(q) ||
      (s.address||"").toLowerCase().includes(q)
    );
  }
  return arr;
}

/* ====== HIERARCHY (approved) ====== */
function updateCrumbs(){
  const parts = [];
  if(H_SELECTED.continent) parts.push(H_SELECTED.continent);
  if(H_SELECTED.country)   parts.push(H_SELECTED.country);
  if(H_SELECTED.city)      parts.push(H_SELECTED.city);
  $("#hCrumbs").innerHTML = parts.length ? `Showing: <b>${esc(parts.join(" → "))}</b>` : `Showing: <b>All Approved</b>`;
}

function buildHierarchy(){
  if(currentTab!=="approved") return;
  const q = $("#hSearch").value.trim().toLowerCase();
  const data = filtered();

  const tree = {};
  data.forEach(s=>{
    const cont = s.continent || "Other";
    const ctry = s.country || "Unknown";
    const city = s.city || "Unknown";
    tree[cont]??={};
    tree[cont][ctry]??={};
    tree[cont][ctry][city]??=0;
    tree[cont][ctry][city]++;
  });

  const h = $("#hTree");
  h.innerHTML = "";

  Object.keys(tree).sort().forEach(cont=>{
    const contNode = document.createElement("div");
    const totalCont = Object.values(tree[cont]).reduce((acc,cities)=>acc+Object.values(cities).reduce((a,b)=>a+b,0),0);
    contNode.className="h-node";
    contNode.innerHTML = `
      <div class="h-line" data-lv="continent" data-key="${esc(cont)}">
        <div class="h-toggle">▶</div>
        <div class="h-label">🌍 ${esc(cont)}</div>
        <div class="h-pill">${totalCont}</div>
      </div>
      <div class="h-children" style="display:none"></div>
    `;
    const contLine = contNode.querySelector(".h-line");
    const contChildren = contNode.querySelector(".h-children");

    contLine.addEventListener("click", ()=>{
      const opened = getComputedStyle(contChildren).display==="none";
      contChildren.style.display = opened ? "" : "none";

      if(opened && contChildren.childElementCount===0){
        Object.keys(tree[cont]).sort().forEach(country=>{
          if(q && !(country.toLowerCase().includes(q) || cont.toLowerCase().includes(q))) return;

          const totalC = Object.values(tree[cont][country]).reduce((a,b)=>a+b,0);
          const countryNode = document.createElement("div");
          countryNode.className="h-node";
          countryNode.innerHTML = `
            <div class="h-line" data-lv="country" data-cont="${esc(cont)}" data-key="${esc(country)}">
              <div class="h-toggle">▶</div>
              <div class="h-label">🏳️ ${esc(country)}</div>
              <div class="h-pill">${totalC}</div>
            </div>
            <div class="h-children" style="display:none"></div>
          `;
          const cLine = countryNode.querySelector(".h-line");
          const cChildren = countryNode.querySelector(".h-children");

          cLine.addEventListener("click", (ev)=>{
            ev.stopPropagation();
            const opened2 = getComputedStyle(cChildren).display==="none";
            cChildren.style.display = opened2 ? "" : "none";

            if(opened2 && cChildren.childElementCount===0){
              Object.keys(tree[cont][country])
                .sort((a,b)=>tree[cont][country][b]-tree[cont][country][a])
                .forEach(city=>{
                  if(q && !(city.toLowerCase().includes(q))) return;
                  const cityNode = document.createElement("div");
                  cityNode.className="h-node";
                  cityNode.innerHTML=`
                    <div class="h-line" data-lv="city" data-cont="${esc(cont)}" data-cty="${esc(country)}" data-key="${esc(city)}">
                      <div class="h-label">🏙️ ${esc(city)}</div>
                      <div class="h-pill">${tree[cont][country][city]}</div>
                    </div>`;
                  const cityLine = cityNode.querySelector(".h-line");
                  cityLine.addEventListener("click",(e)=>{
                    e.stopPropagation();
                    H_SELECTED = { continent:cont, country:country, city:city };
                    updateCrumbs(); render();
                  });
                  cChildren.appendChild(cityNode);
                });
            }
            H_SELECTED = { continent:cont, country:country, city:null };
            updateCrumbs(); render();
          });

          contChildren.appendChild(countryNode);
        });
      }
      H_SELECTED = { continent:cont, country:null, city:null };
      updateCrumbs(); render();
    });

    h.appendChild(contNode);
  });
}

/* ====== BIND UI ====== */
function bindUI(){
  // Tabs
  $$(".pill").forEach(p=>{
    p.addEventListener("click",()=>{
      $$(".pill").forEach(x=>x.classList.remove("active"));
      p.classList.add("active");
      currentTab = p.dataset.tab;

      if(currentTab==="approved"){ $("#hierarchyPanel").style.display=""; }
      else {
        $("#hierarchyPanel").style.display="none";
        H_SELECTED={continent:null,country:null,city:null};
        updateCrumbs();
      }
      setView(currentView);
      render();
    });
  });

  // View toggle
  $$(".viewtoggle .seg").forEach(seg=>{
    seg.addEventListener("click",()=>{
      $$(".viewtoggle .seg").forEach(x=>x.classList.remove("active"));
      seg.classList.add("active");
      setView(seg.dataset.view);
      render();
    });
  });

  $("#searchInput")?.addEventListener("input", render);

  // Hierarchy controls
  $("#hSearch")?.addEventListener("input", buildHierarchy);
  $("#hCloseAll")?.addEventListener("click", ()=>{ $$(".h-children").forEach(el=>el.style.display="none"); });
  $("#hClearSel")?.addEventListener("click", ()=>{ H_SELECTED={continent:null,country:null,city:null}; updateCrumbs(); render(); });

  // Flag modal
  $("#flagCancel")?.addEventListener("click", ()=>toggleFlagModal(false));
  $("#flagConfirm")?.addEventListener("click", onConfirmFlag);
}

/* ====== RENDER (cards / list) ====== */
function render(){
  const list = filtered();
  const showCards = (currentView==="cards");

  if(currentTab==="approved"){ $("#hierarchyPanel").style.display=""; buildHierarchy(); }
  else { $("#hierarchyPanel").style.display="none"; }

  $("#cards").style.display = showCards ? "" : "none";
  $("#table").style.display = !showCards ? "" : "none";

  if(showCards) renderCards(list);
  else          renderTable(list);
}

function cardBadges(s){
  const arr=[];
  const tt = (s.types && Array.isArray(s.types) ? s.types : (s.type? [s.type] : []))
    .map(x=>String(x||"").toLowerCase());
  if(tt.includes("store"))  arr.push(`<span class="badge b-store">Store</span>`);
  if(tt.includes("lounge")) arr.push(`<span class="badge b-lounge">Lounge</span>`);
  if(s.access){
    const a = String(s.access).toLowerCase();
    if(a==="public") arr.push(`<span class="badge b-public">Public</span>`);
    else if(a==="membership") arr.push(`<span class="badge b-membership">Membership</span>`);
    else if(a==="members") arr.push(`<span class="badge b-membersonly">Members Only</span>`);
  }
  if(s.continent){ arr.push(`<span class="badge b-continent">🌍 ${esc(s.continent)}</span>`); }
  return arr.join(" ");
}

function renderEditFormHTML(s){
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
      <input class="full" data-k="photo_url" value="${esc(s.photo_url||"")}" placeholder="Photo URL (optional if Google photo used)">
      <input type="hidden" data-k="photo_reference" value="${esc(s.photo_reference||"")}">
      <input type="hidden" data-k="place_id" value="${esc(s.place_id||"")}">
    </div>

    <div class="edit-help">If <code>place_id</code> exists we load Google photo references (permanent, legal). Otherwise paste your own image URL or tick “Use default image”.</div>

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
    const img = cardImageSrc(s); // försöker CDN eller API via vår helper
    const status = s.deleted ? "Deleted" : s.flagged ? "Flagged" : s.approved ? "Approved" : "Pending";
    const actions = cardActionsFor(s);
    const fb = githubFallbackForTypes(s.types?.length ? s.types : s.type);

    return `
    <div class="card" data-id="${s.id}">
      <img class="card-img"
           src="${esc(img)}"
           alt="${esc(s.name || '')}"
           data-fallback="${esc(fb)}"
           onerror="
             console.warn('🟡 Fallback image used for', this.alt);
             this.onerror=null;
             if (!this.src.includes('maps.googleapis.com')) {
               this.src='https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${s.photo_reference || ''}&key=${GOOGLE_BROWSER_KEY}';
             } else {
               this.src=this.dataset.fallback;
             }
           " />

      <div class="card-body">
        <div class="title">${s.flagged ? '🚩 ' : ''}${esc(s.name || '–')}</div>
        <div class="badges">${cardBadges(s)}</div>
        <div class="row rating" title="Rating">${ratingStars}</div>
        <div class="row muted">📍 ${esc(s.city || '')}${s.city && s.country ? ', ' : ''}${esc(s.country || '')}</div>
        <div class="row muted">🏠 ${esc(s.address || '–')}</div>
        ${s.phone ? `<div class="row muted">📞 ${esc(s.phone)}</div>` : ""}
        ${s.website ? `<div class="row"><a href="${esc(s.website)}" target="_blank" rel="noopener">🌐 ${esc(s.website)}</a></div>` : ""}

        <div class="meta">
          <div>🕓 ${fmtDate(s.created_at)}</div>
          <div>${s.added_by ? `👤 ${esc(s.added_by)}` : ""}</div>
        </div>

        <div class="edit-zone" style="display:none">
          ${renderEditFormHTML(s)}
        </div>

        <div class="row muted">Status: <strong>${status}</strong></div>
        <div class="actions">${actions}</div>
      </div>
    </div>`;
  }).join("");

  // bind actions
  $$("#cards [data-act]").forEach(b => b.addEventListener("click", onCardAction));
}


function renderTable(list){
  const tb = $("#tbody");
  tb.innerHTML = list.map(s=>{
    const status = s.deleted ? "Deleted" : s.flagged ? "Flagged" : s.approved ? "Approved" : "Pending";
    const types = (s.types && s.types.length ? s.types : (s.type? [s.type] : [])).join(", ");
    const access = s.access ? (s.access==="members"?"Members Only":s.access[0].toUpperCase()+s.access.slice(1)) : "–";

    return `
      <tr data-id="${s.id}">
        <td><strong>${esc(s.name||"–")}</strong></td>
        <td>${esc(s.country||"–")}</td>
        <td>${esc(s.continent||"–")}</td>
        <td>${esc(s.city||"–")}</td>
        <td>${esc(types||"–")}</td>
        <td>${esc(access)}</td>
        <td>${Number(s.rating||0)}</td>
        <td>${fmtDate(s.created_at)}</td>
        <td>${esc(s.added_by||"")}</td>
        <td>${status}</td>
        <td>${s.flag_reason && s.flagged ? esc(s.flag_reason) : ""}</td>
        <td class="t-actions">
          ${!s.approved && !s.flagged ? `
            <button class="action-btn approve" onclick="approveStore('${s.id}')">✔️ Approve</button>
            <button class="action-btn edit" onclick="editStore('${s.id}')">✏️ Edit</button>
            <button class="action-btn delete" onclick="deleteStore('${s.id}')">🗑 Delete</button>
          ` : s.flagged ? `
            <button class="action-btn approve" onclick="approveStore('${s.id}')">✔️ Approve</button>
            <button class="action-btn unflag" onclick="unflagStore('${s.id}')">🧹 Unflag</button>
            <button class="action-btn edit" onclick="editStore('${s.id}')">✏️ Edit</button>
            <button class="action-btn delete" onclick="deleteStore('${s.id}')">🗑 Delete</button>
          ` : s.approved ? `
            <button class="action-btn edit" onclick="editStore('${s.id}')">✏️ Edit</button>
            <button class="action-btn delete" onclick="deleteStore('${s.id}')">🗑 Delete</button>
          ` : ""}
        </td>
      </tr>

      <tr data-edit="${s.id}" style="display:none">
        <td colspan="12">
          <div class="edit-zone">
            ${renderEditFormHTML(s)}
            <div class="row" style="justify-content:flex-end;margin-top:.5rem">
              <button class="btn" data-rowact="save" data-id="${s.id}">Save</button>
              <button class="btn ghost" data-rowact="cancel" data-id="${s.id}">Cancel</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  $$("#tbody [data-rowact]").forEach(b=>b.addEventListener("click", onRowEditAction));
}
/* ============ EDIT & PHOTO PICKER SYSTEM ============ */

/* Collects payload from any edit zone (card or table row) */
function collectEditPayload(ez){
  const payload = {};
  ez.querySelectorAll("[data-k]").forEach(inp=>{
    const k = inp.dataset.k;
    let v = inp.value.trim();
    if(k==="rating") v = Number(v||0);
    payload[k] = v || null;
  });

  // type → types[]
  if(payload.type){ payload.types = [payload.type]; }

  // continent fallback
  if(payload.country && !payload.continent){
    payload.continent = countryToContinent(payload.country);
  }

  // default image
  const useDefault = ez.querySelector('[data-photo="default"]')?.checked;
  if(useDefault){
    payload.photo_url = null;
    payload.photo_reference = null;
  }

  // ta bort temporära PhotoService-länkar
  if (payload.photo_url && payload.photo_url.includes("PhotoService.GetPhoto")) {
    payload.photo_url = null;
  }
  return payload;
}
/* ====== FETCH GOOGLE PHOTO REFERENCES ====== */
async function fetchPhotoRefs(placeId){
  if(!placeId) return [];
  try {
    const resp = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_BROWSER_KEY}`
    );
    const data = await resp.json();
    if(!data.result?.photos?.length) return [];
    return data.result.photos.map(p => p.photo_reference);
  } catch(err){
    console.error("fetchPhotoRefs error:", err);
    return [];
  }
}

/* Photo carousel logic inside edit-form */
function initPhotoPicker(scopeEl, id){
  const ez = scopeEl.querySelector(".edit-zone");
  if(!ez) return;

  const placeId  = ez.querySelector('[data-k="place_id"]')?.value || "";
  const prev     = ez.querySelector('[data-photo="prev"]');
  const next     = ez.querySelector('[data-photo="next"]');
  const useBtn   = ez.querySelector('[data-photo="use"]');
  const defChk   = ez.querySelector('[data-photo="default"]');
  const img      = ez.querySelector(".photo-preview");
  const meta     = ez.querySelector(".photo-meta");
  const urlInput = ez.querySelector('[data-k="photo_url"]');
  const refInput = ez.querySelector('[data-k="photo_reference"]');

  if(!hPhotosById[id]) hPhotosById[id] = { refs:[], index:0 };

  function updatePhotoPreview(){
    const st = hPhotosById[id];
    if(!st.refs.length){
      meta.textContent = "No photos loaded";
      img.src = urlInput.value || githubFallbackForTypes((ez.querySelector('[data-k=\"type\"]')?.value)||"");
      return;
    }
    const ref = st.refs[st.index];
    img.src = googleCdnFromPhotoRef(ref);
    meta.textContent = `Photo ${st.index+1}/${st.refs.length}`;
  }

  function nav(delta){
    const st = hPhotosById[id];
    if(!st.refs.length) return;
    st.index = (st.index + delta + st.refs.length) % st.refs.length;
    updatePhotoPreview();
  }

  prev.addEventListener("click", ()=>nav(-1));
  next.addEventListener("click", ()=>nav(+1));

  useBtn.addEventListener("click", ()=>{
    const st = hPhotosById[id];
    if(!st.refs.length){ toast("No Google photos to use","info"); return; }
    const ref = st.refs[st.index];
    refInput.value = ref;
    urlInput.value = ""; // lagra inte URL när vi har reference
    toast("Photo selected","success");
  });

  defChk.addEventListener("change", ()=>{
    if(defChk.checked){
      refInput.value = "";
      urlInput.value = "";
      const fb = githubFallbackForTypes((ez.querySelector('[data-k=\"type\"]')?.value)||"");
      img.src = fb;
      meta.textContent = "Default image selected";
    } else {
      updatePhotoPreview();
    }
  });

  // Ladda in refs via REST
  if(!placeId){
    meta.textContent = "No place_id — paste a Photo URL or tick default.";
    return;
  }
  meta.textContent = "Loading Google photos…";
  fetchPhotoRefs(placeId).then(refs=>{
    if(refs && refs.length){
      hPhotosById[id] = { refs, index:0 };
      updatePhotoPreview();
    } else {
      meta.textContent = "No Google photos found";
    }
  }).catch(()=>{
    meta.textContent = "No Google photos found";
  });
}
/* ============ SAVE, APPROVE, FLAG, DELETE ============ */

/* Spara ändringar från edit-zon */
async function saveEdit(id, payload){
  // Om vi har photo_reference → spara permanent CDN-URL
  if (payload.photo_reference) {
    payload.photo_url = null;
    payload.photo_cdn_url = googleCdnFromPhotoRef(payload.photo_reference);
  }

  const { error } = await supabase.from("stores").update(payload).eq("id", id);
  if(error){
    console.error("❌ Save failed:", error);
    toast("Save failed","error");
    return;
  }
  toast("Saved ✔","success");
  editingId = null;
  await reloadData();
}

/* ====== Approvals ====== */
async function setApproved(id, val){
  const updates = val ? { approved:true, flagged:false } : { approved:false };
  const { error } = await supabase.from("stores").update(updates).eq("id", id);
  if(error){ console.error(error); toast("Update failed","error"); return;}
  toast(val?"Approved ✅":"Unapproved","success");
  await reloadData();
}

/* ====== Flagged ====== */
let FLAG_TARGET_ID = null;

async function setFlagged(id, val, reason=null){
  const upd = val
    ? { flagged:true, flag_reason: (reason || 'manual | flagged by admin') }
    : { flagged:false, flag_reason:null };

  const { error } = await supabase.from("stores").update(upd).eq("id", id);
  if(error){
    console.error(error);
    toast("Update failed","error");
    return;
  }
  toast(val?"Flagged 🚩":"Unflagged","success");
  await reloadData();
}

/* ====== Deleted ====== */
async function setDeleted(id, val){
  const { error } = await supabase.from("stores").update({ deleted:val }).eq("id", id);
  if(error){ console.error(error); toast("Update failed","error"); return;}
  toast(val?"Moved to Trash 🗑️":"Restored","success");
  await reloadData();
}

/* ====== Table view helpers (knappar i listan) ====== */
async function approveStore(id){ await setApproved(id,true); }
async function unflagStore(id){ await setFlagged(id,false); }
async function deleteStore(id){
  if(!confirm("Are you sure you want to delete this store?")) return;
  await setDeleted(id,true);
}

/* ====== Flag modal ====== */
function openFlagModal(id){
  FLAG_TARGET_ID = id;
  $("#flagReason").value="";
  toggleFlagModal(true);
}

function toggleFlagModal(show){
  $("#flagModal").style.display = show ? "flex" : "none";
}

async function onConfirmFlag(){
  const reason = $("#flagReason").value.trim();
  toggleFlagModal(false);
  if(!FLAG_TARGET_ID) return;
  await setFlagged(FLAG_TARGET_ID, true, reason || null);
  FLAG_TARGET_ID = null;
}

/* ====== Google Maps bootstrap (dummy) ====== */
window._mapsReady = function(){
  // no-op: laddas bara för Places REST
};

/* ====== CARD & ROW ACTIONS ====== */
function cardActionsFor(s){
  const id = s.id;
  const arr=[];
  if(!s.deleted){
    if(!s.approved) arr.push(`<button class="btn sm" data-act="approve" data-id="${id}">Approve</button>`);
    else            arr.push(`<button class="btn sm" data-act="unapprove" data-id="${id}">Unapprove</button>`);
    if(!s.flagged)  arr.push(`<button class="btn sm" data-act="flag" data-id="${id}">Flag</button>`);
    else            arr.push(`<button class="btn sm" data-act="unflag" data-id="${id}">Unflag</button>`);
    arr.push(`<button class="btn sm" data-act="edit" data-id="${id}">Edit</button>`);
    arr.push(`<button class="btn sm danger" data-act="delete" data-id="${id}">Delete</button>`);
    arr.push(`<button class="btn sm" data-act="save" data-id="${id}" style="display:none">Save</button>`);
    arr.push(`<button class="btn sm" data-act="cancel" data-id="${id}" style="display:none">Cancel</button>`);
  } else {
    arr.push(`<button class="btn sm" data-act="restore" data-id="${id}">Restore</button>`);
  }
  return arr.join(" ");
}

function onCardAction(e){
  const act = e.currentTarget.dataset.act;
  const id  = e.currentTarget.dataset.id;
  const card = e.currentTarget.closest(".card");
  if(!id || !card) return;

  if(act==="approve")   return setApproved(id,true);
  if(act==="unapprove") return setApproved(id,false);
  if(act==="flag")      return openFlagModal(id);
  if(act==="unflag")    return setFlagged(id,false);
  if(act==="delete")    return setDeleted(id,true);
  if(act==="restore")   return setDeleted(id,false);

  const ez = card.querySelector(".edit-zone");
  const btnEdit   = card.querySelector(`[data-act="edit"]`);
  const btnSave   = card.querySelector(`[data-act="save"]`);
  const btnCancel = card.querySelector(`[data-act="cancel"]`);

  if(act==="edit"){
    editingId = id;
    ez.style.display="";
    btnSave.style.display="";
    btnCancel.style.display="";
    btnEdit.style.display="none";
    initPhotoPicker(card, id);
    return;
  }
  if(act==="cancel"){
    editingId = null;
    ez.style.display="none";
    btnSave.style.display="none";
    btnCancel.style.display="none";
    if(btnEdit) btnEdit.style.display="";
    return;
  }
  if(act==="save"){
    const payload = collectEditPayload(ez);
    return saveEdit(id, payload);
  }
}

function editStore(id) {
  const row = document.querySelector(`tr[data-edit="${id}"]`);
  if(!row) return;
  const show = row.style.display==="none";
  $$('tr[data-edit]').forEach(r=>r.style.display='none');
  row.style.display = show ? "" : "none";
  if(show){ initPhotoPicker(row, id); }
}

function onRowEditAction(e){
  const id = e.currentTarget.dataset.id;
  const act = e.currentTarget.dataset.rowact;
  const row = document.querySelector(`tr[data-edit="${id}"]`);
  if(!row) return;
  if(act==="cancel"){ row.style.display="none"; return; }
  if(act==="save"){
    const ez = row.querySelector(".edit-zone");
    const payload = collectEditPayload(ez);
    return saveEdit(id, payload);
  }
}

/* ====== COLLECT & SAVE ====== */
function collectEditPayload(ez){
  const payload = {};
  ez.querySelectorAll("[data-k]").forEach(inp=>{
    const k = inp.dataset.k;
    let v = inp.value.trim();
    if(k==="rating") v = Number(v||0);
    payload[k]= v||null;
  });

  if(payload.type){ payload.types = [payload.type]; }

  if(payload.country && !payload.continent){
    payload.continent = countryToContinent(payload.country);
  }

  const useDefault = ez.querySelector('[data-photo="default"]')?.checked;
  if(useDefault){
    payload.photo_url = null;
    payload.photo_reference = null;
  }

  // Spara aldrig temporära PhotoService-länkar
  if (payload.photo_url && payload.photo_url.includes("PhotoService.GetPhoto")) {
    payload.photo_url = null;
  }
  return payload;
}

async function saveEdit(id, payload){
  // Om reference finns → använd inte photo_url, spara även cdn-url
  if (payload.photo_reference) {
    payload.photo_url = null;
    payload.photo_cdn_url = googleCdnFromPhotoRef(payload.photo_reference);
  }

  const { error } = await supabase.from("stores").update(payload).eq("id", id);
  if(error){ console.error(error); toast("Save failed","error"); return; }

  toast("Saved ✔","success");
  editingId = null;
  await reloadData();
}

/* ====== APPROVE / FLAG / DELETE ====== */
async function setApproved(id, val){
  const updates = val ? { approved:true, flagged:false } : { approved:false };
  const { error } = await supabase.from("stores").update(updates).eq("id", id);
  if(error){ console.error(error); toast("Update failed","error"); return;}
  toast(val?"Approved ✅":"Unapproved","success");
  await reloadData();
}

async function setFlagged(id, val, reason=null){
  const upd = val ? { flagged:true, flag_reason: (reason||'manual | flagged by admin') } : { flagged:false, flag_reason:null };
  const { error } = await supabase.from("stores").update(upd).eq("id", id);
  if(error){ console.error(error); toast("Update failed","error"); return; }
  toast(val?"Flagged 🚩":"Unflagged","success");
  await reloadData();
}
async function setDeleted(id, val){
  const { error } = await supabase.from("stores").update({ deleted:val }).eq("id", id);
  if(error){ console.error(error); toast("Update failed","error"); return;}
  toast(val?"Moved to Trash 🗑️":"Restored","success");
  await reloadData();
}

// Table inline helpers (list view)
async function approveStore(id){ await setApproved(id,true); }
async function unflagStore(id){ await setFlagged(id,false); }
async function deleteStore(id){
  if(!confirm("Are you sure you want to delete this store?")) return;
  await setDeleted(id,true);
}

/* ====== FLAG MODAL ====== */
function openFlagModal(id){
  FLAG_TARGET_ID = id;
  $("#flagReason").value="";
  toggleFlagModal(true);
}
function toggleFlagModal(show){
  $("#flagModal").style.display = show ? "flex" : "none";
}
async function onConfirmFlag(){
  const reason = $("#flagReason").value.trim();
  toggleFlagModal(false);
  if(!FLAG_TARGET_ID) return;
  await setFlagged(FLAG_TARGET_ID, true, reason || null);
  FLAG_TARGET_ID = null;
}

/* ====== PHOTO PICKER (edit UIs) ====== */
function initPhotoPicker(scopeEl, id){
  const ez = scopeEl.querySelector(".edit-zone");
  if(!ez) return;

  const placeId  = ez.querySelector('[data-k="place_id"]')?.value || "";
  const prev     = ez.querySelector('[data-photo="prev"]');
  const next     = ez.querySelector('[data-photo="next"]');
  const useBtn   = ez.querySelector('[data-photo="use"]');
  const defChk   = ez.querySelector('[data-photo="default"]');
  const img      = ez.querySelector(".photo-preview");
  const meta     = ez.querySelector(".photo-meta");
  const urlInput = ez.querySelector('[data-k="photo_url"]');
  const refInput = ez.querySelector('[data-k="photo_reference"]');

  if(!hPhotosById[id]) hPhotosById[id] = { refs:[], index:0 };

  function updatePhotoPreview(){
    const st = hPhotosById[id];
    if(!st.refs.length){
      meta.textContent = "No photos loaded";
      img.src = urlInput.value || githubFallbackForTypes((ez.querySelector('[data-k="type"]')?.value)||"");
      return;
    }
    const ref = st.refs[st.index];
    const url = googleCdnFromPhotoRef(ref);
    img.src = url;
    meta.textContent = `Photo ${st.index+1}/${st.refs.length}`;
  }

  function nav(delta){
    const st = hPhotosById[id];
    if(!st.refs.length) return;
    st.index = (st.index + delta + st.refs.length) % st.refs.length;
    updatePhotoPreview();
  }

  prev?.addEventListener("click", ()=>nav(-1));
  next?.addEventListener("click", ()=>nav(+1));

  useBtn?.addEventListener("click", ()=>{
    const st = hPhotosById[id];
    if(!st.refs.length){ toast("No Google photos to use","info"); return; }
    const ref = st.refs[st.index];
    refInput.value = ref;
    urlInput.value = ""; // lagra inte URL när vi har reference
    toast("Photo selected","success");
  });

  defChk?.addEventListener("change", ()=>{
    if(defChk.checked){
      refInput.value = "";
      urlInput.value = "";
      const fb = githubFallbackForTypes((ez.querySelector('[data-k="type"]')?.value)||"");
      img.src = fb;
      meta.textContent = "Default image selected";
    } else {
      updatePhotoPreview();
    }
  });

  if(!placeId){
    meta.textContent = "No place_id — paste a Photo URL or tick default.";
    return;
  }
  meta.textContent = "Loading Google photos…";
  fetchPhotoRefs(placeId).then(refs=>{
    if(refs && refs.length){
      hPhotosById[id] = { refs, index:0 };
      updatePhotoPreview();
    } else {
      meta.textContent = "No Google photos found";
    }
  }).catch(()=>{
    meta.textContent = "No Google photos found";
  });
}

/* ====== GOOGLE MAPS BOOTSTRAP (noop) ====== */
window._mapsReady = function(){
  // no-op; REST används för foton men skriptet laddas för ev. annan funktion
};
