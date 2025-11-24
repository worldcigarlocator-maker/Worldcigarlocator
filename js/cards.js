/* ============================================================
   CARD GRID
============================================================ */
.store-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
  gap: 1.4rem;
  padding: 1rem 0;
}

/* ============================================================
   CARD CONTAINER
============================================================ */
.store-card {
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  transition: transform .15s ease, box-shadow .15s ease;
}

.store-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.10);
}

/* ============================================================
   PHOTO
============================================================ */
.store-photo-wrap {
  width: 100%;
  height: 165px;
  background: #111;
  overflow: hidden;
}

.store-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ============================================================
   CARD BODY
============================================================ */
.store-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: .6rem;
}

/* ============================================================
   TITLE
============================================================ */
.store-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  color: #222;
  min-height: 2.6rem; /* två rader stabilt */
}

/* ============================================================
   STARS
============================================================ */
.stars {
  color: var(--gold);
  font-size: 1rem;
  margin-top: -4px;
}

.no-rating {
  color: #bbb;
  font-size: .85rem;
}

/* ============================================================
   LOCATION ROW
============================================================ */
.locrow {
  display: flex;
  flex-direction: column;
}

.loc-top {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .95rem;
  color: #444;
  font-weight: 500;
}

.flag {
  width: 20px;
  height: 14px;
  object-fit: cover;
  border-radius: 2px;
  background: #eee;
}

/* ============================================================
   INFOBLOCK
============================================================ */
.infoblock {
  margin-top: .4rem;
}

.info-row {
  margin: 0;
  padding: 1px 0;
  font-size: .87rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.infoblock a {
  color: var(--gold);
  text-decoration: none;
}
.infoblock a:hover {
  text-decoration: underline;
}

/* ============================================================
   COMMENTS BUTTON
============================================================ */
.reviews-btn {
  margin-top: .6rem;
  padding: .5rem;
  width: 100%;
  background: var(--gold);
  color: #222;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s ease;
}

.reviews-btn:hover {
  background: #e3b300;
}
