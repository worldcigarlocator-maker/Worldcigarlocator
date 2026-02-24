/* ============================================================
   SIDEBAR.CSS — WCL
   CANONICAL · CLEAN STRUCTURE
   ============================================================ */

/* ================= ROOT ================= */

:root {
  --sidebar-bg: #050505;
  --border: rgba(255,255,255,0.12);
  --gold: #d4a017;
  --text: #f5f5f5;
}

/* ================= SIDEBAR SHELL ================= */

.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 260px;
  height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 3000;
}

/* ================= HEADER ================= */

.sidebar-header {
  padding: 2.2rem 1.2rem 1.4rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

/* ================= BRAND ================= */

.sidebar-brand {
  display: flex;
  align-items: center;
}

/* ================= ACTIONS ================= */

.sidebar-actions {
  display: flex;
  gap: 0.6rem;
}

.sidebar-btn {
  flex: 1;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

#addStoreBtn {
  background: var(--gold);
  border-color: var(--gold);
  color: #111;
}

/* ============================================================
   SIDEBAR TOTAL (GLOBAL COUNT ZONE)
   ============================================================ */

.sidebar-total {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.45rem 0;

  /* Divider under count (så det inte “flyter ihop” med hierarkin) */
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

#sidebarGlobalCount {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgb(var(--global));
  opacity: 0.65;
}

/* ================= NAV SCROLL AREA ================= */

#sidebarMenu {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0;
}

/* ================= BASE ROW ================= */

.line {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.6rem;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.82);
  cursor: pointer;
  user-select: none;
}

.line:hover {
  background: rgba(255,255,255,0.04);
}

.line.active {
  color: var(--gold);
}

/* ================= CONTINENT ================= */

.line.continent {
  font-size: 0.9rem;
  font-weight: 600;
  color: #766148;

  border-top: 1px solid rgba(255,255,255,0.14);
  border-bottom: 1px solid rgba(255,255,255,0.14);

  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}

/* ✅ VIKTIGT:
   Denna “padding-top: 6.4rem”-hack gjorde att hierarkin såg tom ut.
   Vi tar bort den helt så listan alltid startar direkt under count.
*/

/* ================= COUNTRY ================= */

.line.country {
  font-weight: 500;
}

/* ================= STATE / CITY ================= */

.line.state,
.line.city {
  font-size: 0.74rem;
  color: rgba(255,255,255,0.7);
}

.line.city {
  padding-left: 1.4rem;
}

/* ================= CHILDREN ================= */

.children {
  display: none;
}

.children.show {
  display: block;
}

/* ================= ARROW ================= */

.arrow {
  width: 14px;
  text-align: center;
  opacity: 0.55;
  font-size: 0.7rem;
}

.line.open > .arrow {
  opacity: 0.85;
}

/* ================= LABEL ================= */

.label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  overflow: hidden;
}

.label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ================= COUNT (PILL) ================= */

.pill {
  margin-left: 0.6rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
}

.pill::before { content: "("; }
.pill::after  { content: ")"; }

.line.active .pill {
  color: rgba(255,255,255,0.75);
}

/* ================= FOOTER ================= */

.sidebar-footer {
  margin-top: auto;
  padding: 1.1rem 1.2rem 1.25rem;
  border-top: 1px solid rgba(255,255,255,0.06);

  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.sidebar-footer a {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.01em;

  color: rgba(255,255,255,0.55);
  text-decoration: none;

  transition: color 0.18s ease, transform 0.18s ease;
}

.sidebar-footer a:hover {
  color: #766148; /* matchar continent-färgen */
  transform: translateX(2px);
}

/* subtle separation for the last link (Contact / Support) */
.sidebar-footer a[href^="mailto:"] {
  margin-top: 0.25rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-weight: 500;
  color: rgba(255,255,255,0.45);
}

.sidebar-footer a[href^="mailto:"]:hover {
  color: var(--gold);
}
