/* js/backoffice.js  —  World Cigar Locator (Backoffice)
   Permanent, legal Google CDN images + GitHub fallback
   Last update: 2025-10-28
*/

/* ====== Config ====== */
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ"; // används för Places Details REST

// 🔒 Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🔁 GitHub-bild-backup (absoluta länkar)
const GITHUB_STORE_FALLBACK  = "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
const GITHUB_LOUNGE_FALLBACK = "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

/* ====== State ====== */
let ALL = [];
let currentTab  = "pending";  // default: Pending
let currentView = "cards";    // default: Cards
let editingId   = null;

// Approved hierarchy filter
let H_SELECTED = { continent:null, country:null, city:null };

// Photo picker state per row/card: { [id]: { refs: string[], index: number } }
let hPhotosById = {};

/* ====== DOM utils & helpers ====== */
const $  = (s, p=document)=>p.querySelector(s);
const $$ = (s, p=document)=>Array.from(p.querySelectorAll(s));

function toast(msg,type="info"){
  const c=$("#toast-container"); const t=document.createElement("div");
  t.className=`toast ${type}`; t.textContent=msg; c.appendChild(t);
  setTimeout(()=>t.remove(),3400);
}
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

/* ====== Country → Continent (fallback) ====== */
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

/* ====== Image helpers (permanent, legal) ====== */
function googleCdnFromPhotoRef(ref, w = 800, h = 600, variant = 0) {
  // Prova i ordning: endast storlek → +k-no → +no
  const tails = [
    `=w${w}-h${h}`,
    `=w${w}-h${h}-k-no`,
    `=w${w}-h${h}-no`
  ];
  const idx = Math.max(0, Math.min(variant, tails.length - 1));
  return `https://lh3.googleusercontent.com/p/${ref}${tails[idx]}`;
}

function githubFallbackForTypes(typesOrType){
  const arr = (Array.isArray(typesOrType) && typesOrType.length
    ? typesOrType
    : (typesOrType ? [typesOrType] : [])).map(x=>String(x||"").toLowerCase());
  return arr.includes("lounge")
    ? "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg"
    : "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
}

function cardImageSrc(s){
  // 1) Google CDN om vi har ett (v1) media key / photo_reference
  if (s.photo_reference) return googleCdnFromPhotoRef(s.photo_reference);
  // 2) Stabil egen URL (inte PhotoService-temporär)
  if (s.photo_url && !s.photo_url.includes("PhotoService.GetPhoto")) return s.photo_url;
  // 3) Fallback
  return githubFallbackForTypes(s.types?.length ? s.types : s.type);
}


  // 2️⃣ Har vi en stabil egen URL → använd den (men inte PhotoService-länkar)
  if (s.photo_url && !s.photo_url.includes("PhotoService.GetPhoto")) {
    return s.photo_url;
  }

  // 3️⃣ Har vi Google-foto-URL som verkar temporär? → tillåt ändå (är CDN)
  if (s.photo_url && s.photo_url.includes("googleusercontent")) {
    return s.photo_url;
  }

  // 4️⃣ Annars fallback till GitHub-bilder
  return githubFallbackForTypes(s.types?.length ? s.types : s.type);
}


/* ====== Load ====== */
document.addEventListener("DOMContentLoaded", async()=>{
  bindUI();
  await reloadData();
});

/* ====== Load & render all stores ====== */
async function reloadData() {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      showToast("❌ Error loading stores", "error");
      return;
    }
ALL = data; // 
    renderAll(data || []);
    showToast(`✅ Loaded ${data.length} stores`, "success");

  } catch (e) {
    console.error("Reload error:", e);
    showToast("⚠️ Could not load stores", "error");
  }
}

/* ====== Render all cards ====== */
function renderAll(data) {
  const container = document.getElementById("cards");
  container.innerHTML = "";

  if (!data || !data.length) {
    container.innerHTML = `<div class="empty">No stores found</div>`;
    return;
  }

  data.forEach(s => {
    // 🧠 Visa bara om den inte är raderad (men inkludera flagged/pending/approved)
    if (s.deleted) return;

    // ⚙️ Rendera kort
    const card = renderCard(s);
    container.appendChild(card);
  });
}


/* ====== Filters & View ====== */
function bindUI(){
  // Tabs
  $$(".pill").forEach(p=>{
    p.addEventListener("click",()=>{
      $$(".pill").forEach(x=>x.classList.remove("active"));
      p.classList.add("active");
      currentTab = p.dataset.tab;

      // Endast i Approved: visa hierarkipanel
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

  $("#searchInput").addEventListener("input",render);

  // Hierarchy controls
  $("#hSearch")?.addEventListener("input", buildHierarchy);
  $("#hCloseAll")?.addEventListener("click", ()=>{ $$(".h-children").forEach(el=>el.style.display="none"); });
  $("#hClearSel")?.addEventListener("click", ()=>{ H_SELECTED={continent:null,country:null,city:null}; updateCrumbs(); render(); });

  // Flag modal
  $("#flagCancel")?.addEventListener("click", ()=>toggleFlagModal(false));
  $("#flagConfirm")?.addEventListener("click", onConfirmFlag);
}

function setView(v){
  currentView = v;
  $$(".viewtoggle .seg").forEach(x=>x.classList.toggle("active", x.dataset.view===v));
  if(currentTab==="approved") $("#hierarchyPanel").style.display="";
}

function filtered(){
  let arr = [...ALL];

  // ✅ All = allt utom deleted
  if(currentTab==="all")      arr = arr.filter(s=>!s.deleted);
  if(currentTab==="approved") arr = arr.filter(s=>s.approved && !s.deleted);
  if(currentTab==="pending")  arr = arr.filter(s=>!s.approved && !s.deleted);
  if(currentTab==="flagged")  arr = arr.filter(s=>s.flagged && !s.deleted);
  if(currentTab==="deleted")  arr = arr.filter(s=>s.deleted);

  // Hierarki (Approved)
  if(currentTab==="approved"){
    if(H_SELECTED.continent) arr = arr.filter(s=>(s.continent||"")===H_SELECTED.continent);
    if(H_SELECTED.country)   arr = arr.filter(s=>(s.country||"")===H_SELECTED.country);
    if(H_SELECTED.city)      arr = arr.filter(s=>(s.city||"")===H_SELECTED.city);
  }

  // Sök
  const q = $("#searchInput").value.trim().toLowerCase();
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

/* ====== Hierarchy (Approved) ====== */
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
  const data = filtered(); // already approved + search applied

  // Build tree
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
    const totalCont = Object.values(tree[cont]).reduce((acc,citiesByCountry)=>acc+Object.values(citiesByCountry).reduce((a,b)=>a+b,0),0);
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
              Object.keys(tree[cont][country]).sort((a,b)=>tree[cont][country][b]-tree[cont][country][a]).forEach(city=>{
                if(q && !(city.toLowerCase().includes(q))) return;
                const cityNode = document.createElement("div");
                cityNode.className="h-node";
                cityNode.innerHTML=`
                  <div class="h-line" data-lv="city" data-cont="${esc(cont)}" data-cty="${esc(country)}" data-key="${esc(city)}">
                    <div class="h-label">🏙️ ${esc(city)}</div>
                    <div class="h-pill">${tree[cont][country][city]}</div>
                  </div>
                `;
                const cityLine = cityNode.querySelector(".h-line");
                cityLine.addEventListener("click",(e)=>{
                  e.stopPropagation();
                  H_SELECTED = { continent:cont, country:country, city:city };
                  updateCrumbs();
                  render();
                });
                cChildren.appendChild(cityNode);
              });
            }
            // Klick på land sätter filter
            H_SELECTED = { continent:cont, country:country, city:null };
            updateCrumbs(); render();
          });

          contChildren.appendChild(countryNode);
        });
      }
      // Klick på kontinent sätter filter
      H_SELECTED = { continent:cont, country:null, city:null };
      updateCrumbs(); render();
    });

    h.appendChild(contNode);
  });
}

/* ====== Render ====== */
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

function renderCards(list){
  const c = $("#cards");
  c.innerHTML = list.map(s=>{
    const ratingStars = stars(s.rating);
    const img = cardImageSrc(s);
    const status = s.deleted ? "Deleted" : s.flagged ? "Flagged" : s.approved ? "Approved" : "Pending";
    const actions = cardActionsFor(s);
    const fb = githubFallbackForTypes(s.types?.length ? s.types : s.type);

    return `
    <div class="card" data-id="${s.id}">
      <img class="card-img"
           src="${esc(img)}"
           alt="${esc(s.name||'')}"
           data-fallback="${esc(fb)}"
           onerror="this.onerror=null; this.src=this.dataset.fallback; console.warn('🟡 Fallback image used for', this.alt);" />
      <div class="card-body">
        <div class="title">${s.flagged ? '🚩 ' : ''}${esc(s.name||"–")}</div>
        <div class="badges">${cardBadges(s)}</div>
        <div class="row rating" title="Rating">${ratingStars}</div>
        <div class="row muted">📍 ${esc(s.city||"")}${s.city&&s.country?', ':''}${esc(s.country||"")}</div>
        <div class="row muted">🏠 ${esc(s.address||"–")}</div>
        ${s.phone?`<div class="row muted">📞 ${esc(s.phone)}</div>`:""}
        ${s.website?`<div class="row"><a href="${esc(s.website)}" target="_blank" rel="noopener">🌐 ${esc(s.website)}</a></div>`:""}

        ${( (currentTab==="pending" || currentTab==="flagged") && s.flag_reason ) ? (() => {
          const reason = s.flag_reason || "No reason provided";
          const parts = reason.split("|");
          const category = (parts[0]||"").trim();
          const detail = (parts.slice(1).join("|")||"").trim();
          return `<div class="flag-reason">
                    🚩 <strong>${esc(category.charAt(0).toUpperCase() + category.slice(1))}</strong>
                    ${detail ? `<div class="muted detail">${esc(detail)}</div>` : ""}
                  </div>`;
        })() : ""}

        <div class="meta">
          <div>🕓 ${fmtDate(s.created_at)}</div>
          <div>${s.added_by?`👤 ${esc(s.added_by)}`:""}</div>
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
  $$("#cards [data-act]").forEach(b=>b.addEventListener("click", onCardAction));
}

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

/* ====== Table (list view) ====== */
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

  // Row-level actions
  $$("#tbody [data-rowact]").forEach(b=>b.addEventListener("click", onRowEditAction));
}

function editStore(id) {
  const row = document.querySelector(`tr[data-edit="${id}"]`);
  if(!row) return;
  const show = row.style.display==="none";
  // Stäng andra öppna editrader
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

/* ====== Collect & Save ====== */
function collectEditPayload(ez){
  const payload = {};
  ez.querySelectorAll("[data-k]").forEach(inp=>{
    const k = inp.dataset.k;
    let v = inp.value.trim();
    if(k==="rating") v = Number(v||0);
    payload[k]= v||null;
  });
  if(payload.type){ payload.types = [payload.type]; }
  // continent från country om saknas
  if(payload.country && !payload.continent){
    payload.continent = countryToContinent(payload.country);
  }
  // Default image checkbox
  const useDefault = ez.querySelector('[data-photo="default"]')?.checked;
  if(useDefault){
    payload.photo_url = null;
    payload.photo_reference = null;
  }
  // ⚠️ Spara aldrig temporära PhotoService-länkar
  if (payload.photo_url && payload.photo_url.includes("PhotoService.GetPhoto")) {
    payload.photo_url = null;
  }
  return payload;
}

async function saveEdit(id, payload){
  // Om reference finns → använd inte photo_url
  if (payload.photo_reference) {
    payload.photo_url = null;
         // 💾 Spara även permanent Google CDN-URL för framtida visning
    payload.photo_cdn_url = googleCdnFromPhotoRef(payload.photo_reference);

  }

  const { error } = await supabase.from("stores").update(payload).eq("id", id);
  if(error){
    console.error(error);
    toast("Save failed","error");
    return;
  }
  toast("Saved ✔","success");
  editingId = null;
  await reloadData();
}

/* ====== Approvals/Flags/Deletes ====== */
async function setApproved(id, val){
  const updates = val ? { approved:true, flagged:false } : { approved:false };
  const { error } = await supabase.from("stores").update(updates).eq("id", id);
  if(error){ console.error(error); toast("Update failed","error"); return;}
  toast(val?"Approved ✅":"Unapproved","success");
  await reloadData();
}
let FLAG_TARGET_ID = null;

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

// Table helpers
async function approveStore(id){ await setApproved(id,true); }
async function unflagStore(id){ await setFlagged(id,false); }
async function deleteStore(id){
  if(!confirm("Are you sure you want to delete this store?")) return;
  await setDeleted(id,true);
}

/* ====== Flag reason modal ====== */
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

/* ====== Helper: Build legal, permanent image URL ====== */
function buildPhotoUrl(photo_reference, type) {
  if (photo_reference) {
    // ✅ Google CDN — fungerar utan API-nyckel och utan 403-risk
    return `https://lh3.googleusercontent.com/p/${photo_reference}=w600-h400-n-k-no`;
  }
  // 🪪 Fallback till GitHub-bilder
  if (type === "lounge") {
    return "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";
  }
  return "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
}

/* ====== Render one card (store entry) ====== */
function renderCard(s) {
  const card = document.createElement("div");
  card.className = "card";

// 🖼️ Hämta rätt foto
const img = document.createElement("img");
img.className = "photo";
img.alt = s.name || "Store photo";

// start-src
const baseRef = s.photo_reference || null;
const fallbackUrl = githubFallbackForTypes(s.types?.length ? s.types : s.type);
let variantTry = 0;

if (baseRef) {
  img.src = googleCdnFromPhotoRef(baseRef, 800, 600, variantTry);
} else if (s.photo_url && !s.photo_url.includes("PhotoService.GetPhoto")) {
  img.src = s.photo_url;
} else {
  img.src = fallbackUrl;
}

// Prova flera CDN-varianter innan vi går till GitHub
img.onerror = () => {
  if (baseRef && variantTry < 2) {
    variantTry += 1;
    img.src = googleCdnFromPhotoRef(baseRef, 800, 600, variantTry);
  } else {
    console.warn(`⚠️ Fallback används för: ${s.name}`);
    img.src = fallbackUrl;
  }
};


// Prova flera CDN-varianter innan vi går till GitHub
img.onerror = () => {
  if (baseRef && variantTry < 2) {
    variantTry += 1;
    img.src = googleCdnFromPhotoRef(baseRef, 800, 600, variantTry);
  } else {
    img.src = fallbackUrl;
  }
};


  // 🏷️ Info-sektion
  const info = document.createElement("div");
  info.className = "info";
  info.innerHTML = `
    <h3>${s.name || "Unnamed"}</h3>
    <p>${s.city || ""}, ${s.country || ""}</p>
    <p><b>Type:</b> ${s.type || "–"}${s.access ? ` • ${s.access}` : ""}</p>
    ${s.rating ? `<p><b>Rating:</b> ⭐ ${s.rating}</p>` : ""}
  `;

  // 🔘 Actions
  const actions = document.createElement("div");
  actions.className = "actions";
  actions.innerHTML = `
    <button class="btn small approve">Approve</button>
    <button class="btn small flag">Flag</button>
    <button class="btn small delete">Delete</button>
  `;

  // ⛓️ Event-handlers
  actions.querySelector(".approve").onclick = () => updateStatus(s.id, "approved");
  actions.querySelector(".flag").onclick = () => openFlagModal(s.id);
  actions.querySelector(".delete").onclick = () => softDeleteStore(s.id);

  // 🧩 Montera kortet
  card.appendChild(img);
  card.appendChild(info);
  card.appendChild(actions);

  return card;
}


function ensurePlacesService(){
  if(!window.google || !window.google.maps || !window.google.maps.places) return false;
  return true;
}

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
      const fb = githubFallbackForTypes((ez.querySelector('[data-k="type"]')?.value)||"");
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

/* ====== Google Maps bootstrap (for other parts if needed) ====== */
window._mapsReady = function(){
  // No-op: vi använder REST för foto-refsen men låter skriptet laddas
};
