/* ====== Config ====== */
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const GOOGLE_BROWSER_KEY = "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ====== State ====== */
let ALL = [];
let currentTab = "pending";   // default: Pending
let currentView = "cards";    // default: Cards
let editingId = null;

/* Approved hierarchy filter */
let H_SELECTED = { continent:null, country:null, city:null };
let hPhotosById = {}; // {id: {photos:[], index:0}} for photo-picker per card

/* ====== Utils ====== */
const $ = (s, p=document)=>p.querySelector(s);
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

/* Country → Continent */
function countryToContinent(country){
  if(!country) return "Other";
  const c = country.trim().toLowerCase();
  const m = {
    "afghanistan":"Asia","albania":"Europe","algeria":"Africa","andorra":"Europe","angola":"Africa",
    "antigua and barbuda":"North America","argentina":"South America","armenia":"Asia","australia":"Oceania","austria":"Europe",
    "azerbaijan":"Asia","bahamas":"North America","bahrain":"Asia","bangladesh":"Asia","barbados":"North America",
    "belarus":"Europe","belgium":"Europe","belize":"North America","benin":"Africa","bhutan":"Asia",
    "bolivia":"South America","bosnia and herzegovina":"Europe","botswana":"Africa","brazil":"South America","brunei":"Asia",
    "bulgaria":"Europe","burkina faso":"Africa","burundi":"Africa","cabo verde":"Africa","cambodia":"Asia",
    "cameroon":"Africa","canada":"North America","central african republic":"Africa","chad":"Africa","chile":"South America",
    "china":"Asia","colombia":"South America","comoros":"Africa","congo":"Africa","democratic republic of the congo":"Africa",
    "costa rica":"North America","croatia":"Europe","cuba":"North America","cyprus":"Asia","czech republic":"Europe","czechia":"Europe",
    "denmark":"Europe","djibouti":"Africa","dominica":"North America","dominican republic":"North America","ecuador":"South America",
    "egypt":"Africa","el salvador":"North America","equatorial guinea":"Africa","eritrea":"Africa","estonia":"Europe",
    "eswatini":"Africa","ethiopia":"Africa","fiji":"Oceania","finland":"Europe","france":"Europe",
    "gabon":"Africa","gambia":"Africa","georgia":"Asia","germany":"Europe","ghana":"Africa",
    "greece":"Europe","grenada":"North America","guatemala":"North America","guinea":"Africa","guinea-bissau":"Africa",
    "guyana":"South America","haiti":"North America","honduras":"North America","hungary":"Europe","iceland":"Europe",
    "india":"Asia","indonesia":"Asia","iran":"Asia","iraq":"Asia","ireland":"Europe",
    "israel":"Asia","italy":"Europe","ivory coast":"Africa","jamaica":"North America","japan":"Asia",
    "jordan":"Asia","kazakhstan":"Asia","kenya":"Africa","kiribati":"Oceania","kosovo":"Europe",
    "kuwait":"Asia","kyrgyzstan":"Asia","laos":"Asia","latvia":"Europe","lebanon":"Asia",
    "lesotho":"Africa","liberia":"Africa","libya":"Africa","liechtenstein":"Europe","lithuania":"Europe",
    "luxembourg":"Europe","madagascar":"Africa","malawi":"Africa","malaysia":"Asia","maldives":"Asia",
    "mali":"Africa","malta":"Europe","marshall islands":"Oceania","mauritania":"Africa","mauritius":"Africa",
    "mexico":"North America","micronesia":"Oceania","moldova":"Europe","monaco":"Europe","mongolia":"Asia",
    "montenegro":"Europe","morocco":"Africa","mozambique":"Africa","myanmar":"Asia","namibia":"Africa",
    "nauru":"Oceania","nepal":"Asia","netherlands":"Europe","new zealand":"Oceania","nicaragua":"North America",
    "niger":"Africa","nigeria":"Africa","north korea":"Asia","north macedonia":"Europe","norway":"Europe",
    "oman":"Asia","pakistan":"Asia","palau":"Oceania","palestine":"Asia","panama":"North America",
    "papua new guinea":"Oceania","paraguay":"South America","peru":"South America","philippines":"Asia","poland":"Europe",
    "portugal":"Europe","qatar":"Asia","romania":"Europe","russia":"Europe","rwanda":"Africa",
    "saint kitts and nevis":"North America","saint lucia":"North America","saint vincent and the grenadines":"North America","samoa":"Oceania","san marino":"Europe",
    "sao tome and principe":"Africa","saudi arabia":"Asia","senegal":"Africa","serbia":"Europe","seychelles":"Africa",
    "sierra leone":"Africa","singapore":"Asia","slovakia":"Europe","slovenia":"Europe","solomon islands":"Oceania",
    "somalia":"Africa","south africa":"Africa","south korea":"Asia","south sudan":"Africa","spain":"Europe",
    "sri lanka":"Asia","sudan":"Africa","suriname":"South America","sweden":"Europe","switzerland":"Europe",
    "syria":"Asia","taiwan":"Asia","tajikistan":"Asia","tanzania":"Africa","thailand":"Asia",
    "timor-leste":"Asia","togo":"Africa","tonga":"Oceania","trinidad and tobago":"North America","tunisia":"Africa",
    "turkey":"Asia","turkmenistan":"Asia","tuvalu":"Oceania","uganda":"Africa","ukraine":"Europe",
    "united arab emirates":"Asia","united kingdom":"Europe","united states":"North America","usa":"North America","uruguay":"South America","uzbekistan":"Asia",
    "vanuatu":"Oceania","vatican city":"Europe","venezuela":"South America","vietnam":"Asia","yemen":"Asia",
    "zambia":"Africa","zimbabwe":"Africa","hong kong":"Asia","puerto rico":"North America","macau":"Asia","greenland":"North America"
  };
  return m[c] || "Other";
}

/* ====== Load ====== */
document.addEventListener("DOMContentLoaded", async()=>{
  bindUI();
  await reloadData();
});

/* ====== Google Maps bootstrap ====== */
let placesService = null;
window._mapsReady = function(){
  if(!window.google||!google.maps||!google.maps.places) return;
  const dummyMap = new google.maps.Map(document.getElementById("gmap"));
  placesService = new google.maps.places.PlacesService(dummyMap);
};

/* ====== UI Bindings ====== */
function bindUI(){
  // Tabs
  document.querySelectorAll(".pill").forEach(p=>{
    p.addEventListener("click",()=>{
      document.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));
      p.classList.add("active");
      currentTab = p.dataset.tab;

      // Hierarchy panel only on approved
      if(currentTab==="approved"){ 
        $("#hierarchyPanel").style.display="";
      } else {
        $("#hierarchyPanel").style.display="none";
        H_SELECTED={continent:null,country:null,city:null}; 
        updateCrumbs();
      }
      setView(currentView);
      render();
    });
  });

  // View toggle
  document.querySelectorAll(".viewtoggle .seg").forEach(seg=>{
    seg.addEventListener("click",()=>{
      document.querySelectorAll(".viewtoggle .seg").forEach(x=>x.classList.remove("active"));
      seg.classList.add("active");
      setView(seg.dataset.view);
      render();
    });
  });

  // Search
  $("#searchInput").addEventListener("input",render);

  // Hierarchy controls
  $("#hSearch").addEventListener("input", buildHierarchy);
  $("#hCloseAll").addEventListener("click", ()=>{ document.querySelectorAll(".h-children").forEach(el=>el.style.display="none"); });
  $("#hClearSel").addEventListener("click", ()=>{ H_SELECTED={continent:null,country:null,city:null}; updateCrumbs(); render(); });

  // Flag modal
  $("#flagCancel").addEventListener("click", ()=>toggleFlagModal(false));
  $("#flagConfirm").addEventListener("click", onConfirmFlag);
}

function setView(v){
  currentView = v;
  document.querySelectorAll(".viewtoggle .seg").forEach(x=>x.classList.toggle("active", x.dataset.view===v));
  if(currentTab==="approved") $("#hierarchyPanel").style.display="";
}

/* ====== Data Load & Filter ====== */
async function reloadData(){
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending:false });
  if(error){ console.error(error); toast("Failed to load data","error"); return; }
  ALL = (data||[]).map(s=>({
    ...s,
    continent: s.continent || countryToContinent(s.country)
  }));
  render();
}

function filtered(){
  let arr = [...ALL];

  // Tabs (NOTE: All DOES NOT show deleted anymore)
  if(currentTab==="approved") arr = arr.filter(s=>s.approved && !s.deleted);
  if(currentTab==="pending")  arr = arr.filter(s=>!s.approved && !s.deleted);
  if(currentTab==="flagged")  arr = arr.filter(s=>s.flagged && !s.deleted);
  if(currentTab==="deleted")  arr = arr.filter(s=>s.deleted);
  if(currentTab==="all")      arr = arr.filter(s=>!s.deleted); // <— change requested

  // Hierarchy (approved only)
  if(currentTab==="approved"){
    if(H_SELECTED.continent) arr = arr.filter(s=>(s.continent||"")===H_SELECTED.continent);
    if(H_SELECTED.country)   arr = arr.filter(s=>(s.country||"")===H_SELECTED.country);
    if(H_SELECTED.city)      arr = arr.filter(s=>(s.city||"")===H_SELECTED.city);
  }

  // Search
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

/* ====== Hierarchy ====== */
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

  // Build groups
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
    contNode.className="h-node";
    const totalCont = Object.values(tree[cont]).reduce((acc,citiesByCountry)=>acc+Object.values(citiesByCountry).reduce((a,b)=>a+b,0),0);
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
      const s = getComputedStyle(contChildren).display==="none";
      contChildren.style.display = s ? "" : "none";
      if(s && contChildren.childElementCount===0){
        // render countries
        Object.keys(tree[cont]).sort().forEach(country=>{
          if(q && !(country.toLowerCase().includes(q) || cont.toLowerCase().includes(q))) return;
          const countryNode = document.createElement("div");
          countryNode.className="h-node";
          const totalC = Object.values(tree[cont][country]).reduce((a,b)=>a+b,0);
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
            const s2 = getComputedStyle(cChildren).display==="none";
            cChildren.style.display = s2 ? "" : "none";
            if(s2 && cChildren.childElementCount===0){
              // render cities
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
            // Klick på land sätter filter land
            H_SELECTED = { continent:cont, country:country, city:null };
            updateCrumbs(); render();
          });

          contChildren.appendChild(countryNode);
        });
      }
      // Klick på kontinent sätter filter kontinent
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

  if(showCards){ renderCards(list); }
  else { renderTable(list); }
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
  if(s.continent){
    arr.push(`<span class="badge b-continent">🌍 ${esc(s.continent)}</span>`);
  }
  return arr.join(" ");
}

function cardImageSrc(s){
  // Prefer Google API if we have a reference
  if (s.photo_reference) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(s.photo_reference)}&key=${GOOGLE_BROWSER_KEY}`;
  }
  // If photo_url exists but is a temporary Google URL, ignore it
  if (s.photo_url && !s.photo_url.includes('PhotoService.GetPhoto')) {
    return s.photo_url;
  }
  // Fallbacks (your GitHub images)
  const tt = (s.types && s.types.length ? s.types : (s.type? [s.type] : [])).map(x=>String(x||"").toLowerCase());
  return tt.includes("lounge") ? "images/lounge.jpg" : "images/store.jpg";
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
      <input class="full" data-k="photo_url" value="${esc(s.photo_url||"")}" placeholder="Photo URL">
      <input type="hidden" data-k="photo_reference" value="${esc(s.photo_reference||"")}">
      <input type="hidden" data-k="place_id" value="${esc(s.place_id||"")}">
    </div>

    <div class="edit-help">Tip: If Google <code>place_id</code> exists we will load its photos to choose from. Otherwise paste a direct image URL or tick “Use default image”.</div>

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

    return `
    <div class="card" data-id="${s.id}">
      <img class="card-img" src="${esc(img)}" alt="${esc(s.name||'')}" onerror="this.src='images/store.jpg'">
      <div class="card-body">
        <div class="title">
          ${s.flagged ? '🚩' : ''}${esc(s.name||"–")}
        </div>
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

        <!-- Inline edit form -->
        <div class="edit-zone" style="display:none">
          ${renderEditFormHTML(s)}
        </div>

        <div class="row muted">Status: <strong>${status}</strong></div>
        <div class="actions">${actions}</div>
      </div>
    </div>`;
  }).join("");

  // bind actions
  c.querySelectorAll("[data-act]").forEach(b=>b.addEventListener("click", onCardAction));
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

  if(act==="approve") return setApproved(id,true);
  if(act==="unapprove") return setApproved(id,false);
  if(act==="flag") return openFlagModal(id);
  if(act==="unflag") return setFlagged(id,false);
  if(act==="delete") return setDeleted(id,true);
  if(act==="restore") return setDeleted(id,false);

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
    return saveEdit(id, payload, card);
  }
}

/* ====== Table (list view with row-expander edit) ====== */
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
  tb.querySelectorAll("[data-rowact]").forEach(b=>b.addEventListener("click", onRowEditAction));
}

function editStore(id) {
  const row = document.querySelector(`tr[data-edit="${id}"]`);
  if(!row) return;
  const show = row.style.display==="none";
  document.querySelectorAll('tr[data-edit]').forEach(r=>r.style.display='none');
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
    return saveEdit(id, payload, row);
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
  // Ensure continent if country changed or empty
  if(payload.country && !payload.continent){
    payload.continent = countryToContinent(payload.country);
  }
  // Default image checkbox
  const useDefault = ez.querySelector('[data-photo="default"]')?.checked;
  if(useDefault){
    payload.photo_url = null;
    payload.photo_reference = null;
  }
  return payload;
}

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

async function saveEdit(id, payload){
  // If nothing set, keep nulls for default fallback
  if (!payload.photo_url && !payload.photo_reference) {
    payload.photo_url = null;
    payload.photo_reference = null;
  }

  // If we got a reference but a temp URL, normalize URL to API endpoint
  if (payload.photo_reference && (!payload.photo_url || payload.photo_url.includes('PhotoService.GetPhoto'))) {
    payload.photo_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${payload.photo_reference}&key=${GOOGLE_BROWSER_KEY}`;
  }

  const { error } = await supabase.from("stores").update(payload).eq("id", id);
  if(error){ console.error(error); toast("Save failed","error"); return; }

  toast("Saved ✔","success");
  editingId = null;
  await reloadData();
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

/* ====== Photo picker (Google Places) ====== */
function ensurePlacesService(){
  return !!placesService;
}

function initPhotoPicker(scopeEl, id){
  const ez = scopeEl.querySelector(".edit-zone");
  if(!ez) return;
  const placeId = ez.querySelector('[data-k="place_id"]')?.value || "";
  const prev = ez.querySelector('[data-photo="prev"]');
  const next = ez.querySelector('[data-photo="next"]');
  const useBtn = ez.querySelector('[data-photo="use"]');
  const defChk = ez.querySelector('[data-photo="default"]');
  const img = ez.querySelector(".photo-preview");
  const meta = ez.querySelector(".photo-meta");
  const urlInput = ez.querySelector('[data-k="photo_url"]');
  const refInput = ez.querySelector('[data-k="photo_reference"]');

  hPhotosById[id] = hPhotosById[id] || { photos:[], index:0 };

  function updatePhotoPreview(){
    const st = hPhotosById[id];
    if(!st.photos.length){
      meta.textContent = "No photos loaded";
      return;
    }
    const p = st.photos[st.index];
    const url = p.getUrl({maxWidth:800});
    img.src = url;
    meta.textContent = `Photo ${st.index+1}/${st.photos.length}`;
  }

  function nav(delta){
    const st = hPhotosById[id];
    if(!st.photos.length) return;
    st.index = (st.index + delta + st.photos.length) % st.photos.length;
    updatePhotoPreview();
  }

  prev.addEventListener("click", ()=>nav(-1));
  next.addEventListener("click", ()=>nav(+1));

  useBtn.addEventListener("click", ()=>{
    const st = hPhotosById[id];
    if(!st.photos.length){ toast("No Google photos to use","info"); return; }
    const p = st.photos[st.index];

    // Try to get a persistent photo_reference
    const ref = p.photo_reference || (p.html_attributions?.[0] ?? "").match(/photoreference=([^&]+)/)?.[1] || "";

    if(ref){
      refInput.value = ref;
      urlInput.value = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${GOOGLE_BROWSER_KEY}`;
    } else {
      // fallback to temporary URL if no ref (rare)
      urlInput.value = p.getUrl({maxWidth:800});
    }
    toast("Photo selected","success");
  });

  defChk.addEventListener("change", ()=>{
    if(defChk.checked){
      const tt = (urlInput.value||"").toLowerCase();
      img.src = tt.includes("lounge") ? "images/lounge.jpg" : "images/store.jpg";
      meta.textContent = "Default image selected";
    } else {
      updatePhotoPreview();
    }
  });

  if(!placeId){
    meta.textContent = "No place_id — paste a Photo URL or tick default.";
    return;
  }
  if(ensurePlacesService()){
    placesService.getDetails({placeId, fields:["photos"]}, (res, status)=>{
      if(status==="OK" && res && res.photos && res.photos.length){
        hPhotosById[id] = { photos:res.photos, index:0 };
        updatePhotoPreview();
      } else {
        meta.textContent = "No Google photos found";
      }
    });
  } else {
    meta.textContent = "Loading Google photos…";
    const t = setInterval(()=>{
      if(ensurePlacesService()){
        clearInterval(t);
        initPhotoPicker(scopeEl, id);
      }
    }, 400);
    setTimeout(()=>clearInterval(t), 6000);
  }
}

/* ====== Convenience for table buttons ====== */
async function approveStore(id){ await setApproved(id,true); }
async function unflagStore(id){ await setFlagged(id,false); }
function editStoreRowToggle(id){ editStore(id); }
async function deleteStore(id){ 
  if(!confirm("Are you sure you want to delete this store?")) return;
  await setDeleted(id,true); 
}
