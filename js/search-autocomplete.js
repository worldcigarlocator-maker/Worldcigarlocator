// ============================================================
// SEARCH-AUTOCOMPLETE.JS — WCL global search assist
// Backend-sourced suggestions, frontend-only presentation.
// ============================================================

import { supabase } from "/js/globals.js";

const GEO_PAGE_SIZE = 1000;
const MAX_SUGGESTIONS = 8;
const STORE_SUGGESTION_LIMIT = 4;

const TYPE_LABELS = {
  continent: "Continent",
  country: "Country",
  state: "State",
  city: "City",
  store: "Store",
  id: "ID",
};

const TYPE_ORDER = {
  id: 0,
  country: 1,
  city: 2,
  state: 3,
  continent: 4,
  store: 5,
};

const MANUAL_ALIASES = {
  europa: "Europe",
  europe: "Europe",
  nordamerika: "North America",
  "north america": "North America",
  sydamerika: "South America",
  "south america": "South America",
  asien: "Asia",
  asia: "Asia",
  afrika: "Africa",
  africa: "Africa",
  oceanien: "Oceania",
  oceania: "Oceania",

  sverige: "Sweden",
  sweden: "Sweden",
  norge: "Norway",
  norway: "Norway",
  danmark: "Denmark",
  denmark: "Denmark",
  finland: "Finland",
  island: "Iceland",
  iceland: "Iceland",
  tyskland: "Germany",
  germany: "Germany",
  deutschland: "Germany",
  polen: "Poland",
  poland: "Poland",
  spanien: "Spain",
  spain: "Spain",
  frankrike: "France",
  france: "France",
  italien: "Italy",
  italy: "Italy",
  nederlanderna: "Netherlands",
  holland: "Netherlands",
  netherlands: "Netherlands",
  belgien: "Belgium",
  belgium: "Belgium",
  schweiz: "Switzerland",
  switzerland: "Switzerland",
  osterrike: "Austria",
  austria: "Austria",
  portugal: "Portugal",
  grekland: "Greece",
  greece: "Greece",
  turkiet: "Turkey",
  turkey: "Turkey",
  storbritannien: "United Kingdom",
  england: "United Kingdom",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  irland: "Ireland",
  ireland: "Ireland",

  usa: "United States",
  us: "United States",
  "u s a": "United States",
  amerika: "United States",
  america: "United States",
  "united states": "United States",
  "united states of america": "United States",
  "forenta staterna": "United States",
  "forenade staterna": "United States",

  canada: "Canada",
  kanada: "Canada",
  mexiko: "Mexico",
  mexico: "Mexico",
  brasilien: "Brazil",
  brazil: "Brazil",
  argentina: "Argentina",
  chile: "Chile",
  thailand: "Thailand",
  japan: "Japan",
  kina: "China",
  china: "China",
  singapore: "Singapore",
  australien: "Australia",
  australia: "Australia",
};

let geoRowsPromise = null;
let geoRowsCache = null;
let geoCandidatesCache = null;
let aliasCache = null;

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function numberLabel(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return "";

  return `${new Intl.NumberFormat().format(count)} ${
    count === 1 ? "listing" : "listings"
  }`;
}

function addAlias(map, alias, canonical) {
  const key = normalizeKey(alias);
  if (!key || !canonical) return;
  map.set(key, canonical);
}

function addDisplayNameAliases(map, iso2, canonical) {
  const code = String(iso2 || "").trim().toUpperCase();
  if (!code || !canonical || typeof Intl === "undefined") return;

  for (const locale of ["sv", "en"]) {
    try {
      const display = new Intl.DisplayNames([locale], { type: "region" }).of(code);
      addAlias(map, display, canonical);
    } catch {
      // Browser support and uncommon region codes can vary.
    }
  }
}

function getManualCanonical(raw) {
  return MANUAL_ALIASES[normalizeKey(raw)] || null;
}

export function canonicalizeKnownSearch(raw) {
  const trimmed = String(raw || "").trim();
  return getManualCanonical(trimmed) || trimmed;
}

async function fetchGeoRows() {
  if (geoRowsCache) return geoRowsCache;
  if (geoRowsPromise) return geoRowsPromise;

  geoRowsPromise = (async () => {
    const rows = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("sidebar_nodes_v3")
        .select("*")
        .order("continent")
        .order("country")
        .order("state", { nullsFirst: true })
        .order("city", { nullsFirst: true })
        .range(from, from + GEO_PAGE_SIZE - 1);

      if (error) throw error;

      rows.push(...(data || []));
      if (!data || data.length < GEO_PAGE_SIZE) break;
      from += GEO_PAGE_SIZE;
    }

    geoRowsCache = rows;
    return rows;
  })();

  return geoRowsPromise;
}

function getAliasMap(rows) {
  if (aliasCache) return aliasCache;

  const map = new Map();

  Object.entries(MANUAL_ALIASES).forEach(([alias, canonical]) => {
    addAlias(map, alias, canonical);
  });

  for (const row of rows || []) {
    const level = String(row.level || "").toLowerCase();

    if (level === "continent") {
      addAlias(map, row.continent, row.continent);
    }

    if (level === "country") {
      addAlias(map, row.country, row.country);
      addDisplayNameAliases(map, row.country_iso2, row.country);
    }
  }

  aliasCache = map;
  return map;
}

function makeGeoCandidate(row) {
  const level = String(row.level || "").toLowerCase();
  const continent = row.continent || null;
  const country = row.country || null;
  const state = row.state || null;
  const city = row.city || null;

  let label = null;
  if (level === "continent") label = continent;
  if (level === "country") label = country;
  if (level === "state") label = state;
  if (level === "city") label = city;

  if (!label) return null;

  const detailParts = [];
  if (level !== "continent" && continent) detailParts.push(continent);
  if (!["continent", "country"].includes(level) && country) {
    detailParts.push(country);
  }
  if (level === "city" && state) detailParts.push(state);

  return {
    kind: level,
    action: "location",
    label,
    detail: detailParts.filter(Boolean).join(", "),
    count: Number(row.count) || 0,
    path: {
      continent,
      country: level === "continent" ? null : country,
      state: ["state", "city"].includes(level) ? state : null,
      city: level === "city" ? city : null,
    },
  };
}

function getGeoCandidates(rows) {
  if (geoCandidatesCache) return geoCandidatesCache;

  const seen = new Set();
  const candidates = [];

  for (const row of rows || []) {
    const candidate = makeGeoCandidate(row);
    if (!candidate) continue;

    const key = [
      candidate.kind,
      candidate.path.continent,
      candidate.path.country,
      candidate.path.state,
      candidate.path.city,
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
  }

  geoCandidatesCache = candidates;
  return candidates;
}

function scoreGeoCandidate(candidate, queryKey, aliasCanonical) {
  const labelKey = normalizeKey(candidate.label);
  const detailKey = normalizeKey(candidate.detail);
  const aliasKey = normalizeKey(aliasCanonical);

  if (aliasKey && labelKey === aliasKey) return 0;
  if (labelKey === queryKey) return 1;
  if (labelKey.startsWith(queryKey)) return 2;
  if (labelKey.includes(queryKey)) return 5;
  if (detailKey.includes(queryKey)) return 7;

  return null;
}

async function buildGeoSuggestions(raw) {
  const queryKey = normalizeKey(raw);
  if (!queryKey || queryKey.length < 2) return [];

  const rows = await fetchGeoRows();
  const aliasMap = getAliasMap(rows);
  const aliasCanonical = aliasMap.get(queryKey) || null;

  return getGeoCandidates(rows)
    .map((candidate) => {
      const score = scoreGeoCandidate(candidate, queryKey, aliasCanonical);
      if (score === null) return null;
      return {
        ...candidate,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (TYPE_ORDER[a.kind] !== TYPE_ORDER[b.kind]) {
        return TYPE_ORDER[a.kind] - TYPE_ORDER[b.kind];
      }
      return String(a.label).localeCompare(String(b.label), undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, MAX_SUGGESTIONS);
}

async function buildIdSuggestion(raw) {
  const id = Number(String(raw || "").trim());
  if (!Number.isInteger(id) || id <= 0) return [];

  const { data, error } = await supabase
    .from("stores_frontend_public_v5")
    .select("id,name,city,country,state,continent")
    .eq("id", id)
    .limit(1);

  if (error || !Array.isArray(data) || !data.length) return [];

  const store = data[0];

  return [
    {
      kind: "id",
      action: "search",
      label: `ID ${store.id}`,
      detail: [store.name, store.city, store.country].filter(Boolean).join(" · "),
      searchText: String(store.id),
      score: 0,
    },
  ];
}

async function buildStoreSuggestions(raw) {
  const text = String(raw || "").trim();
  const queryKey = normalizeKey(text);

  if (queryKey.length < 2 || getManualCanonical(text)) return [];

  const { data, error } = await supabase.rpc("search_stores_v2", {
    p_q: text,
    p_continent: null,
    p_country: null,
    p_state: null,
    p_city: null,
    p_limit: STORE_SUGGESTION_LIMIT,
    p_cursor: null,
    p_sort: "relevance",
  });

  if (error || !Array.isArray(data)) return [];

  return data.slice(0, STORE_SUGGESTION_LIMIT).map((store, index) => ({
    kind: "store",
    action: "search",
    label: store.name || `Store ${store.id}`,
    detail: [store.city, store.country, store.id ? `ID ${store.id}` : null]
      .filter(Boolean)
      .join(" · "),
    searchText: store.name || String(store.id || text),
    score: 4 + index,
  }));
}

async function buildSuggestions(raw) {
  const queryKey = normalizeKey(raw);
  if (!queryKey || queryKey.length < 2) return [];

  const [idSuggestions, geoSuggestions, storeSuggestions] = await Promise.all([
    buildIdSuggestion(raw),
    buildGeoSuggestions(raw),
    buildStoreSuggestions(raw),
  ]);

  return [...idSuggestions, ...geoSuggestions, ...storeSuggestions]
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (TYPE_ORDER[a.kind] !== TYPE_ORDER[b.kind]) {
        return TYPE_ORDER[a.kind] - TYPE_ORDER[b.kind];
      }
      return String(a.label).localeCompare(String(b.label), undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, MAX_SUGGESTIONS);
}

function suggestionDetail(suggestion) {
  const parts = [
    TYPE_LABELS[suggestion.kind] || suggestion.kind,
    suggestion.detail,
    numberLabel(suggestion.count),
  ].filter(Boolean);

  return parts.join(" · ");
}

function renderSuggestions(box, suggestions, activeIndex) {
  if (!suggestions.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  box.innerHTML = suggestions
    .map((suggestion, index) => {
      const active = index === activeIndex ? " active" : "";

      return `
        <button
          class="ac-item${active}"
          type="button"
          data-index="${index}"
        >
          <span class="ac-copy">
            <strong>${escapeHtml(suggestion.label)}</strong>
            <small>${escapeHtml(suggestionDetail(suggestion))}</small>
          </span>
          <span class="ac-kind">${escapeHtml(TYPE_LABELS[suggestion.kind] || "")}</span>
        </button>
      `;
    })
    .join("");

  box.classList.remove("hidden");
}

export function attachSearchAutocomplete(input, options = {}) {
  if (!input || input.dataset.autocompleteAttached === "true") return;

  input.dataset.autocompleteAttached = "true";

  const wrap = input.parentElement;
  if (!wrap) return;

  wrap.classList.add("has-autocomplete");

  const box = document.createElement("div");
  box.className = "autocomplete wcl-search-autocomplete hidden";
  box.setAttribute("role", "listbox");
  wrap.appendChild(box);

  let timer = null;
  let sequence = 0;
  let suggestions = [];
  let activeIndex = -1;

  const close = () => {
    suggestions = [];
    activeIndex = -1;
    renderSuggestions(box, suggestions, activeIndex);
  };

  const selectSuggestion = (suggestion) => {
    if (!suggestion) return false;

    clearTimeout(timer);

    if (suggestion.action === "location") {
      input.value = suggestion.label;
      close();
      options.onLocation?.(suggestion.path);
      return true;
    }

    input.value = suggestion.searchText || suggestion.label;
    close();
    options.onSearch?.(suggestion.searchText || suggestion.label);
    return true;
  };

  const refresh = () => {
    clearTimeout(timer);
    const raw = input.value;
    const current = ++sequence;

    timer = setTimeout(async () => {
      try {
        const next = await buildSuggestions(raw);
        if (current !== sequence) return;

        suggestions = next;
        activeIndex = suggestions.length ? 0 : -1;
        renderSuggestions(box, suggestions, activeIndex);
      } catch (error) {
        console.warn("WCL autocomplete failed", error);
        close();
      }
    }, 140);
  };

  input.addEventListener("input", refresh);

  input.addEventListener("focus", () => {
    if (input.value.trim()) refresh();
  });

  input.addEventListener("blur", () => {
    setTimeout(close, 120);
  });

  input.addEventListener(
    "keydown",
    (event) => {
      const isOpen = !box.classList.contains("hidden") && suggestions.length;

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }

      if (!isOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopImmediatePropagation();
        activeIndex = (activeIndex + 1) % suggestions.length;
        renderSuggestions(box, suggestions, activeIndex);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        activeIndex =
          (activeIndex - 1 + suggestions.length) % suggestions.length;
        renderSuggestions(box, suggestions, activeIndex);
        return;
      }

      if (event.key === "Enter") {
        const handled = selectSuggestion(suggestions[activeIndex] || suggestions[0]);
        if (handled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    },
    true
  );

  box.addEventListener("mousedown", (event) => {
    const item = event.target.closest(".ac-item");
    if (!item) return;

    event.preventDefault();
    const index = Number(item.dataset.index);
    selectSuggestion(suggestions[index]);
  });
}
