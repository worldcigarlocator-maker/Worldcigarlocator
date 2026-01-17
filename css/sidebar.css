/* ============================================================
   SIDEBAR — CLEAN LIST HIERARCHY (INSPIRED BY REF IMAGE 2)
   Scope: sidebar menu only
   ============================================================ */

/* ROOT */
#sidebarMenu {
  font-size: 0.78rem;
  line-height: 1.2;
  user-select: none;
  max-height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
}

/* Scrollbar */
#sidebarMenu::-webkit-scrollbar {
  width: 6px;
}
#sidebarMenu::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.12);
  border-radius: 6px;
}

/* ============================================================
   BASE LINE — ALL ROWS
   ============================================================ */
#sidebarMenu .line {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 6px 6px;
  color: #ffffff;
  cursor: default;

  /* divider line */
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

/* hover = light clarity only */
#sidebarMenu .line:hover {
  background: rgba(255,255,255,0.04);
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
   COUNT (RIGHT COLUMN)
   ============================================================ */
#sidebarMenu .pill {
  font-size: 0.7rem;
  color: #bfbfbf;
  margin-left: auto;
}

/* ============================================================
   CHEVRON (NO COLOR DECORATION)
   ============================================================ */
#sidebarMenu .arrow {
  font-size: 0.6rem;
  opacity: 0.6;
  transition: transform 0.12s ease;
}

/* rotate when open */
#sidebarMenu .line.open .arrow {
  transform: rotate(90deg);
  opacity: 0.85;
}

/* ============================================================
   LEVEL SIZES — KEY PART
   ============================================================ */

/* Continents */
#sidebarMenu .continent .label {
  font-size: 0.9rem;
  font-weight: 600;
}

/* Countries — MUCH SMALLER (like ref) */
#sidebarMenu .country .label {
  font-size: 0.78rem;
  font-weight: 400;
}

/* States */
#sidebarMenu .state .label {
  font-size: 0.74rem;
  opacity: 0.9;
}

/* Cities */
#sidebarMenu .city .label {
  font-size: 0.72rem;
  opacity: 0.85;
}

/* ============================================================
   NESTING — PURE LIST FEEL
   ============================================================ */
#sidebarMenu .nested {
  display: none;
  margin-left: 12px;
}

#sidebarMenu .nested.show {
  display: block;
}

/* slightly tighter rows inside nests */
#sidebarMenu .nested .line {
  padding-top: 5px;
  padding-bottom: 5px;
}

/* ============================================================
   ACTIVE STATE — GOLD TEXT ONLY
   ============================================================ */
#sidebarMenu .line.active .label,
#sidebarMenu .line.active .pill {
  color: var(--gold);
}

/* chevron stays neutral */
#sidebarMenu .line.active .arrow {
  color: #fff;
  opacity: 0.8;
}

/* ============================================================
   REMOVE ALL LEFT DECORATIONS (SAFETY)
   ============================================================ */
#sidebarMenu .line::before {
  content: none !important;
}
