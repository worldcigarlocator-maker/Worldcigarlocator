/* ============================================================
   WCL Analytics — Search + Autocomplete (Phase 1)
   ============================================================ */

// ---- Supabase client (anon, read-only) ----
const supabase = window.supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "PUBLIC_ANON_KEY_HÄR"
);

// ---- DOM ----
const input = document.getElementById("analyticsSearch");
const btnSearch = document.getElementById("searchBtn");
const box = document.getElementById("autocomplete");

const storePanel = document.getElementById("storeSummary");
const storeName = document.getElementById("storeName");
const storeMeta = document.getElementById("storeMeta");

// ---- State ----
let AUTOCOMPLETE_RESULTS = [];
let SELECTED_STORE = null;
let TIMER = null;

// ============================================================
// AUTOCOMPLETE
// ============================================================

async function fetchAutocomplete(q) {
  if (!q || q.length < 2) return [];

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, city, country")
    .ilike("name", `%${q}%`)
    .limit(10);

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

function renderAutocomplete(list) {
  if (!list.length) {
    box.classList.add("hidden");
    return;
  }

  box.innerHTML = list
    .map(
      (s) => `
        <div class="ac-item" data-id="${s.id}">
          <strong>${s.name}</strong><br/>
          <small>${[s.city, s.country].filter(Boolean).join(", ")}</small>
        </div>
      `
    )
    .join("");

  box.classList.remove("hidden");
}

input.addEventListener("input", () => {
  const q = input.value.trim();

  clearTimeout(TIMER);

  TIMER = setTimeout(async () => {
    AUTOCOMPLETE_RESULTS = await fetchAutocomplete(q);
    renderAutocomplete(AUTOCOMPLETE_RESULTS);
  }, 250);
});

// Klick i autocomplete
box.addEventListener("click", (e) => {
  const row = e.target.closest(".ac-item");
  if (!row) return;

  const id = Number(row.dataset.id);
  const store = AUTOCOMPLETE_RESULTS.find((s) => s.id === id);
  if (!store) return;

  input.value = store.name;
  box.classList.add("hidden");

  runSearch(store.id);
});

// ============================================================
// SEARCH
// ============================================================

async function runSearch(storeIdOrText) {
  let store = null;

  // 1) Om ID
  if (typeof storeIdOrText === "number") {
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeIdOrText)
      .single();

    store = data;
  }

  // 2) Annars försök via namn
  if (!store) {
    const q = input.value.trim();
    if (!q) return;

    const { data } = await supabase
      .from("stores")
      .select("*")
      .ilike("name", `%${q}%`)
      .limit(1)
      .single();

    store = data;
  }

  if (!store) {
    alert("No matching store found.");
    return;
  }

  SELECTED_STORE = store;
  renderStoreSummary(store);
}

// Klick på Search
btnSearch.addEventListener("click", () => runSearch());

// Enter
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

// ============================================================
// STORE SUMMARY (ENDAST UI JUST NU)
// ============================================================

function renderStoreSummary(s) {
  storeName.textContent = s.name;
  storeMeta.textContent = [
    s.city,
    s.country,
    `ID: ${s.id}`,
  ].filter(Boolean).join(" • ");

  storePanel.classList.remove("hidden");
}

