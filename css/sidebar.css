/* ============================================================
   SIDEBAR — COMPACT HIERARCHY (CANONICAL)
   Scope: sidebar ONLY
   Cards are NOT affected
   ============================================================ */

/* ============================================================
   ROOT LIST
   ============================================================ */
#sidebarMenu {
  font-size: 0.78rem;
  line-height: 1.15;
  user-select: none;
  max-height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
}

/* WebKit scrollbar */
#sidebarMenu::-webkit-scrollbar {
  width: 6px;
}
#sidebarMenu::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 6px;
}

/* ============================================================
   BASE LINE (ALL LEVELS)
   ============================================================ */
#sidebarMenu .line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 4px 6px;
  color: #e6e6e6;
  cursor: default;
}

/* Hover = subtle clarity, no layout shift */
#sidebarMenu .line:hover .label,
#sidebarMenu .line:hover .arrow {
  color: #ffffff;
}

/* ============================================================
   LABEL
   ============================================================ */
#sidebarMenu .label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ============================================================
   COUNT (RIGHT SIDE)
   ============================================================ */
#sidebarMenu .pill {
  margin-left: auto;
  font-size: 0.7rem;
  color: #9a9a9a;
  opacity: 0.9;
}

/* ============================================================
   CHEVRON
   ============================================================ */
#sidebarMenu .arrow {
  font-size: 0.65rem;
  opacity: 0.65;
  padding-right: 2px;
  cursor: pointer;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

/* Rotate when open */
#sidebarMenu .line.open .arrow {
  transform: rotate(90deg);
  opacity: 0.9;
}

/* ============================================================
   LEVEL TUNING (NO BOLD HIERARCHY)
   Only subtle opacity differences
   ============================================================ */
#sidebarMenu .continent .label {
  opacity: 1;
}

#sidebarMenu .country .label {
  opacity: 0.95;
}

#sidebarMenu .state .label,
#sidebarMenu .city .label {
  opacity: 0.9;
}

/* ============================================================
   NESTING
   ============================================================ */
#sidebarMenu .nested {
  display: none;
  margin-left: 10px; /* compact indent */
  border-left: 1px solid rgba(255,255,255,0.06); /* hierarchy line */
}

#sidebarMenu .nested.show {
  display: block;
}

/* Slight vertical rhythm tightening inside nests */
#sidebarMenu .nested .line {
  padding-top: 3px;
  padding-bottom: 3px;
}

/* ============================================================
   ACTIVE STATE — TEXT ONLY
   ============================================================ */
#sidebarMenu .line.active .label {
  color: var(--gold);
}

/* Optional: keep chevron readable on active row */
#sidebarMenu .line.active .arrow {
  color: var(--gold);
  opacity: 0.9;
}

/* ============================================================
   CITY GROUPING (UNDER ACTIVE COUNTRY)
   Applied via JS by toggling .group-active on nested container
   ============================================================ */
#sidebarMenu .nested.group-active {
  background: rgba(212,160,23,0.06);
  border-left-color: rgba(212,160,23,0.25);
  border-radius: 6px;
  padding-left: 2px;
}
