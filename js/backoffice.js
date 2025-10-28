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

// 🔁 GitHub-bild-backup
const GITHUB_STORE_FALLBACK  = "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
const GITHUB_LOUNGE_FALLBACK = "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

/* ====== State ====== */
let ALL = [];
let currentTab  = "pending";
let currentView = "cards";
let editingId   = null;
let H_SELECTED = { continent:null, country:null, city:null };
let hPhotosById = {};
let FLAG_TARGET_ID = null;

/* ====== DOM utils ====== */
const $  = (s,p=document)=>p.querySelector(s);
const $$ = (s,p=document)=>Array.from(p.querySelectorAll(s));

function toast(msg,type="info"){
  const c=$("#toast-container");
  const t=document.createElement("div");
  t.className=`toast ${type}`;
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>t.remove(),3400);
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(s){if(!s)return"–";const d=new Date(s);if(isNaN(d))return s;return d.toISOString().slice(0,16).replace("T"," ");}
function stars(n){const v=Math.round(Number(n)||0);return"★★★★★".slice(0,v)+"☆☆☆☆☆".slice(0,5-v);}

/* ====== Country → Continent ====== */
function countryToContinent(country){
  if(!country)return"Other";
  const c=country.trim().toLowerCase();
  const m={
    "sweden":"Europe","norway":"Europe","denmark":"Europe","finland":"Europe","iceland":"Europe",
    "usa":"North America","united states":"North America","canada":"North America","mexico":"North America",
    "france":"Europe","germany":"Europe","italy":"Europe","spain":"Europe","portugal":"Europe","netherlands":"Europe","belgium":"Europe","poland":"Europe","czechia":"Europe","czech republic":"Europe","austria":"Europe","switzerland":"Europe","united kingdom":"Europe","ireland":"Europe",
    "brazil":"South America","argentina":"South America","chile":"South America","peru":"South America","colombia":"South America",
    "australia":"Oceania","new zealand":"Oceania",
    "japan":"Asia","china":"Asia","india":"Asia","south korea":"Asia","singapore":"Asia","thailand":"Asia","vietnam":"Asia","taiwan":"Asia",
    "south africa":"Africa","morocco":"Africa","egypt":"Africa","kenya":"Africa"
  };
  return m[c]||"Other";
}

/* ====== Image helpers ====== */
function googleCdnFromPhotoRef(ref,w=800,h=600,variant=0){
  const tails=[`=w${w}-h${h}`,`=w${w}-h${h}-k-no`,`=w${w}-h${h}-no`];
  const idx=Math.max(0,Math.min(variant,tails.length-1));
  return `https://lh3.googleusercontent.com/p/${ref}${tails[idx]}`;
}
function githubFallbackForTypes(typesOrType){
  const arr=(Array.isArray(typesOrType)&&typesOrType.length?typesOrType:(typesOrType?[typesOrType]:[])).map(x=>String(x||"").toLowerCase());
  return arr.includes("lounge")?GITHUB_LOUNGE_FALLBACK:GITHUB_STORE_FALLBACK;
}
function cardImageSrc(s){
  if(s.photo_reference)return googleCdnFromPhotoRef(s.photo_reference);
  if(s.photo_url&&!s.photo_url.includes("PhotoService.GetPhoto"))return s.photo_url;
  return githubFallbackForTypes(s.types?.length?s.types:s.type);
}

/* ====== Load ====== */
document.addEventListener("DOMContentLoaded",async()=>{
  bindUI();
  await reloadData();
});

/* ====== Load & render all stores ====== */
async function reloadData(){
  try{
    const {data,error}=await supabase.from("stores").select("*").order("id",{ascending:false});
    if(error){console.error("Supabase fetch error:",error);toast("❌ Error loading stores","error");return;}
    ALL=data;
    renderAll(data||[]);
    toast(`✅ Loaded ${data.length} stores`,"success");
  }catch(e){console.error("Reload error:",e);toast("⚠️ Could not load stores","error");}
}

/* ====== Render all cards ====== */
function renderAll(data){
  const c=$("#cards");
  c.innerHTML="";
  if(!data||!data.length){c.innerHTML='<div class="empty">No stores found</div>';return;}
  data.forEach(s=>{if(!s.deleted){const card=renderCard(s);c.appendChild(card);}});
}

/* ====== Filters & View ====== */
function bindUI(){
  $$(".pill").forEach(p=>{
    p.addEventListener("click",()=>{
      $$(".pill").forEach(x=>x.classList.remove("active"));
      p.classList.add("active");
      currentTab=p.dataset.tab;
      if(currentTab==="approved")$("#hierarchyPanel").style.display="";
      else{$("#hierarchyPanel").style.display="none";H_SELECTED={continent:null,country:null,city:null};updateCrumbs();}
      setView(currentView);render();
    });
  });
  $$(".viewtoggle .seg").forEach(seg=>{
    seg.addEventListener("click",()=>{
      $$(".viewtoggle .seg").forEach(x=>x.classList.remove("active"));
      seg.classList.add("active");
      setView(seg.dataset.view);
      render();
    });
  });
  $("#searchInput").addEventListener("input",render);
  $("#hSearch")?.addEventListener("input",buildHierarchy);
  $("#hCloseAll")?.addEventListener("click",()=>$$(".h-children").forEach(el=>el.style.display="none"));
  $("#hClearSel")?.addEventListener("click",()=>{H_SELECTED={continent:null,country:null,city:null};updateCrumbs();render();});
  $("#flagCancel")?.addEventListener("click",()=>toggleFlagModal(false));
  $("#flagConfirm")?.addEventListener("click",onConfirmFlag);
}
function setView(v){
  currentView=v;
  $$(".viewtoggle .seg").forEach(x=>x.classList.toggle("active",x.dataset.view===v));
  if(currentTab==="approved")$("#hierarchyPanel").style.display="";
}

/* ====== Filtering ====== */
function filtered(){
  let arr=[...ALL];
  if(currentTab==="all")arr=arr.filter(s=>!s.deleted);
  if(currentTab==="approved")arr=arr.filter(s=>s.approved&&!s.deleted);
  if(currentTab==="pending")arr=arr.filter(s=>!s.approved&&!s.deleted);
  if(currentTab==="flagged")arr=arr.filter(s=>s.flagged&&!s.deleted);
  if(currentTab==="deleted")arr=arr.filter(s=>s.deleted);

  if(currentTab==="approved"){
    if(H_SELECTED.continent)arr=arr.filter(s=>(s.continent||"")===H_SELECTED.continent);
    if(H_SELECTED.country)arr=arr.filter(s=>(s.country||"")===H_SELECTED.country);
    if(H_SELECTED.city)arr=arr.filter(s=>(s.city||"")===H_SELECTED.city);
  }

  const q=$("#searchInput").value.trim().toLowerCase();
  if(q){
    arr=arr.filter(s=>(s.name||"").toLowerCase().includes(q)||(s.city||"").toLowerCase().includes(q)||(s.country||"").toLowerCase().includes(q)||(s.address||"").toLowerCase().includes(q));
  }
  return arr;
}

/* ====== Hierarchy ====== */
function updateCrumbs(){
  const parts=[];
  if(H_SELECTED.continent)parts.push(H_SELECTED.continent);
  if(H_SELECTED.country)parts.push(H_SELECTED.country);
  if(H_SELECTED.city)parts.push(H_SELECTED.city);
  $("#hCrumbs").innerHTML=parts.length?`Showing: <b>${esc(parts.join(" → "))}</b>`:`Showing: <b>All Approved</b>`;
}
function buildHierarchy(){
  if(currentTab!=="approved")return;
  const q=$("#hSearch").value.trim().toLowerCase();
  const data=filtered();
  const tree={};
  data.forEach(s=>{
    const cont=s.continent||"Other";
    const ctry=s.country||"Unknown";
    const city=s.city||"Unknown";
    tree[cont]??={};
    tree[cont][ctry]??={};
    tree[cont][ctry][city]??=0;
    tree[cont][ctry][city]++;
  });
  const h=$("#hTree");
  h.innerHTML="";
  Object.keys(tree).sort().forEach(cont=>{
    const contNode=document.createElement("div");
    const totalCont=Object.values(tree[cont]).reduce((acc,citiesByCountry)=>acc+Object.values(citiesByCountry).reduce((a,b)=>a+b,0),0);
    contNode.className="h-node";
    contNode.innerHTML=`
      <div class="h-line" data-lv="continent" data-key="${esc(cont)}">
        <div class="h-toggle">▶</div>
        <div class="h-label">🌍 ${esc(cont)}</div>
        <div class="h-pill">${totalCont}</div>
      </div>
      <div class="h-children" style="display:none"></div>
    `;
    const contLine=contNode.querySelector(".h-line");
    const contChildren=contNode.querySelector(".h-children");
    contLine.addEventListener("click",()=>{
      const opened=getComputedStyle(contChildren).display==="none";
      contChildren.style.display=opened?"":"none";
      if(opened&&contChildren.childElementCount===0){
        Object.keys(tree[cont]).sort().forEach(country=>{
          if(q&&!(country.toLowerCase().includes(q)||cont.toLowerCase().includes(q)))return;
          const totalC=Object.values(tree[cont][country]).reduce((a,b)=>a+b,0);
          const countryNode=document.createElement("div");
          countryNode.className="h-node";
          countryNode.innerHTML=`
            <div class="h-line" data-lv="country" data-cont="${esc(cont)}" data-key="${esc(country)}">
              <div class="h-toggle">▶</div>
              <div class="h-label">🏳️ ${esc(country)}</div>
              <div class="h-pill">${totalC}</div>
            </div>
            <div class="h-children" style="display:none"></div>
          `;
          const cLine=countryNode.querySelector(".h-line");
          const cChildren=countryNode.querySelector(".h-children");
          cLine.addEventListener("click",ev=>{
            ev.stopPropagation();
            const opened2=getComputedStyle(cChildren).display==="none";
            cChildren.style.display=opened2?"":"none";
            if(opened2&&cChildren.childElementCount===0){
              Object.keys(tree[cont][country]).sort((a,b)=>tree[cont][country][b]-tree[cont][country][a]).forEach(city=>{
                if(q&&!(city.toLowerCase().includes(q)))return;
                const cityNode=document.createElement("div");
                cityNode.className="h-node";
                cityNode.innerHTML=`
                  <div class="h-line" data-lv="city" data-cont="${esc(cont)}" data-cty="${esc(country)}" data-key="${esc(city)}">
                    <div class="h-label">🏙️ ${esc(city)}</div>
                    <div class="h-pill">${tree[cont][country][city]}</div>
                  </div>`;
                const cityLine=cityNode.querySelector(".h-line");
                cityLine.addEventListener("click",e=>{
                  e.stopPropagation();
                  H_SELECTED={continent:cont,country:country,city:city};
                  updateCrumbs();render();
                });
                cChildren.appendChild(cityNode);
              });
            }
            H_SELECTED={continent:cont,country:country,city:null};
            updateCrumbs();render();
          });
          contChildren.appendChild(countryNode);
        });
      }
      H_SELECTED={continent:cont,country:null,city:null};
      updateCrumbs();render();
    });
    h.appendChild(contNode);
  });
}

/* ====== Render ====== */
function render(){
  const list=filtered();
  const showCards=(currentView==="cards");
  if(currentTab==="approved"){$("#hierarchyPanel").style.display="";buildHierarchy();}
  else{$("#hierarchyPanel").style.display="none";}
  $("#cards").style.display=showCards?"":"none";
  $("#table").style.display=!showCards?"":"none";
  if(showCards)renderCards(list);else renderTable(list);
}

/* ====== Card builder ====== */
function renderCard(s){
  const card=document.createElement("div");
  card.className="card";

  const img=document.createElement("img");
  img.className="photo";
  img.alt=s.name||"Store photo";
  const baseRef=s.photo_reference||null;
  const fallbackUrl=githubFallbackForTypes(s.types?.length?s.types:s.type);
  let variantTry=0;
  if(baseRef){img.src=googleCdnFromPhotoRef(baseRef,800,600,variantTry);}
  else if(s.photo_url&&!s.photo_url.includes("PhotoService.GetPhoto")){img.src=s.photo_url;}
  else{img.src=fallbackUrl;}
  img.onerror=()=>{if(baseRef&&variantTry<2){variantTry+=1;img.src=googleCdnFromPhotoRef(baseRef,800,600,variantTry);}else{img.src=fallbackUrl;}};

  const info=document.createElement("div");
  info.className="info";
  info.innerHTML=`
    <h3>${s.name||"Unnamed"}</h3>
    <p>${s.city||""}, ${s.country||""}</p>
    <p><b>Type:</b> ${s.type||"–"}${s.access?` • ${s.access}`:""}</p>
    ${s.rating?`<p><b>Rating:</b> ⭐ ${s.rating}</p>`:""}
  `;

  const actions=document.createElement("div");
  actions.className="actions";
  actions.innerHTML=`
    <button class="btn small approve">Approve</button>
    <button class="btn small flag">Flag</button>
    <button class="btn small delete">Delete</button>`;
  actions.querySelector(".approve").onclick=()=>setApproved(s.id,true);
  actions.querySelector(".flag").onclick=()=>openFlagModal(s.id);
  actions.querySelector(".delete").onclick=()=>setDeleted(s.id,true);

  card.appendChild(img);
  card.appendChild(info);
  card.appendChild(actions);
  return card;
}

/* ====== Flag Modal ====== */
function openFlagModal(id){FLAG_TARGET_ID=id;$("#flagReason").value="";toggleFlagModal(true);}
function toggleFlagModal(show){$("#flagModal").style.display=show?"flex":"none";}
async function onConfirmFlag(){
  const reason=$("#flagReason").value.trim();
  toggleFlagModal(false);
  if(!FLAG_TARGET_ID)return;
  await setFlagged(FLAG_TARGET_ID,true,reason||null);
  FLAG_TARGET_ID=null;
}

/* ====== Database actions ====== */
async function saveEdit(id,payload){
  if(payload.photo_reference){
    payload.photo_url=null;
    payload.photo_cdn_url=googleCdnFromPhotoRef(payload.photo_reference);
  }
  const {error}=await supabase.from("stores").update(payload).eq("id",id);
  if(error){console.error(error);toast("Save failed","error");return;}
  toast("Saved ✔","success");
  editingId=null;
  await reloadData();
}
async function setApproved(id,val){
  const updates=val?{approved:true,flagged:false}:{approved:false};
  const {error}=await supabase.from("stores").update(updates).eq("id",id);
  if(error){console.error(error);toast("Update failed","error");return;}
  toast(val?"Approved ✅":"Unapproved","success");
  await reloadData();
}
async function setFlagged(id,val,reason=null){
  const upd=val?{flagged:true,flag_reason:(reason||'manual | flagged by admin')}:{flagged:false,flag_reason:null};
  const {error}=await supabase.from("stores").update(upd).eq("id",id);
  if(error){console.error(error);toast("Update failed","error");return;}
  toast(val?"Flagged 🚩":"Unflagged","success");
  await reloadData();
}
async function setDeleted(id,val){
  const {error}=await supabase.from("stores").update({deleted:val}).eq("id",id);
  if(error){console.error(error);toast("Update failed","error");return;}
  toast(val?"Moved to Trash 🗑️":"Restored","success");
  await reloadData();
}

/* ====== Photo Picker ====== */
function ensurePlacesService(){return !!(window.google&&window.google.maps&&window.google.maps.places);}
function initPhotoPicker(scopeEl,id){
  const ez=scopeEl.querySelector(".edit-zone");
  if(!ez)return;
  const placeId=ez.querySelector('[data-k="place_id"]')?.value||"";
  const prev=ez.querySelector('[data-photo="prev"]');
  const next=ez.querySelector('[data-photo="next"]');
  const useBtn=ez.querySelector('[data-photo="use"]');
  const defChk=ez.querySelector('[data-photo="default"]');
  const img=ez.querySelector(".photo-preview");
  const meta=ez.querySelector(".photo-meta");
  const urlInput=ez.querySelector('[data-k="photo_url"]');
  const refInput=ez.querySelector('[data-k="photo_reference"]');
  if(!hPhotosById[id])hPhotosById[id]={refs:[],index:0};
  function updatePhotoPreview(){
    const st=hPhotosById[id];
    if(!st.refs.length){meta.textContent="No photos loaded";img.src=urlInput.value||githubFallbackForTypes((ez.querySelector('[data-k="type"]')?.value)||"");return;}
    const ref=st.refs[st.index];img.src=googleCdnFromPhotoRef(ref);meta.textContent=`Photo ${st.index+1}/${st.refs.length}`;
  }
  function nav(delta){const st=hPhotosById[id];if(!st.refs.length)return;st.index=(st.index+delta+st.refs.length)%st.refs.length;updatePhotoPreview();}
  prev.addEventListener("click",()=>nav(-1));next.addEventListener("click",()=>nav(+1));
  useBtn.addEventListener("click",()=>{const st=hPhotosById[id];if(!st.refs.length){toast("No Google photos to use","info");return;}const ref=st.refs[st.index];refInput.value=ref;urlInput.value="";toast("Photo selected","success");});
  defChk.addEventListener("change",()=>{if(defChk.checked){refInput.value="";urlInput.value="";const fb=githubFallbackForTypes((ez.querySelector('[data-k="type"]')?.value)||"");img.src=fb;meta.textContent="Default image selected";}else{updatePhotoPreview();}});
  if(!placeId){meta.textContent="No place_id — paste a Photo URL or tick default.";return;}
  meta.textContent="Loading Google photos…";
  fetchPhotoRefs(placeId).then(refs=>{if(refs&&refs.length){hPhotosById[id]={refs,index:0};updatePhotoPreview();}else{meta.textContent="No Google photos found";}}).catch(()=>{meta.textContent="No Google photos found";});
}

/* ====== Fetch Google Photo References ====== */
async function fetchPhotoRefs(placeId){
  if(!placeId)return[];
  try{
    const urlV1=`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=photos&key=${encodeURIComponent(GOOGLE_BROWSER_KEY)}`;
    let res=await fetch(urlV1);
    if(res.ok){const j=await res.json();const refs=(j.photos||[]).map(p=>p?.name?.split("/").pop()).filter(Boolean);if(refs.length)return refs;}
    const urlLegacy=`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${encodeURIComponent(GOOGLE_BROWSER_KEY)}`;
    res=await fetch(urlLegacy);
    if(res.ok){const j=await res.json();const refs=(j.result?.photos||[]).map(p=>p.photo_reference).filter(Boolean);return refs;}
  }catch(e){console.warn("fetchPhotoRefs error",e);}
  return [];
}

/* ====== Google Maps bootstrap ====== */
window._mapsReady=function(){};
