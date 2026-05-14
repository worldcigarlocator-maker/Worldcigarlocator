/* ============================================================
   WCL — ANALYTICS PDF ENGINE V2
   Canonical · Production Ready
============================================================ */

import {
  getKPI
} from "./analytics-state.js";

/* ============================================================
   EXPORT
============================================================ */

export async function exportAnalyticsPDF({

  kpi,
  state,
  rows,
  chartCanvas,
  usersChartCanvas,
  global

}) {

  /* ============================================================
   ORIENTATION ENGINE
============================================================ */

const landscape =
  rows?.length > 10 ||
  kpi === "stores";

const pdf = new jsPDF({

  orientation:
    landscape
      ? "landscape"
      : "portrait",

  unit:"mm",
  format:"a4"

});

/* ============================================================
   PAGE SIZE
============================================================ */

const pageWidth =
  landscape
    ? 297
    : 210;

const pageHeight =
  landscape
    ? 210
    : 297;

const margin = 12;

let y = 14;

   /* ============================================================
   KPI THEME ENGINE
============================================================ */

const KPI_THEME = {

  users: {
    primary: [79,209,255],
    secondary: [34,211,238],
    dark: [8,20,34]
  },

  views: {
    primary: [192,132,252],
    secondary: [147,51,234],
    dark: [18,12,34]
  },

  clicks: {
    primary: [251,146,60],
    secondary: [245,158,11],
    dark: [34,18,8]
  },

  ctr: {
    primary: [34,197,94],
    secondary: [22,163,74],
    dark: [8,26,18]
  },

  stores: {
    primary: [110,231,183],
    secondary: [16,185,129],
    dark: [8,24,18]
  }

};

const theme =
  KPI_THEME[kpi] ||
  KPI_THEME.views;

   const isMembers =
  kpi === "users";
   
   /* ============================================================
   ASSET LOADER
============================================================ */

async function loadImageBase64(src) {

  const img = new Image();

  img.src = src;

  await new Promise((resolve, reject) => {

    img.onload = resolve;
    img.onerror = reject;

  });

  const canvas =
    document.createElement("canvas");

  canvas.width =
    img.width;

  canvas.height =
    img.height;

  const ctx =
    canvas.getContext("2d");

  ctx.drawImage(
    img,
    0,
    0
  );

  return canvas.toDataURL("image/png");

}

/* ============================================================
   PDF ASSETS
============================================================ */

const logoBase64 =
  await loadImageBase64(
    "/images/wcl_brand_text.png"
  );

const coverBase64 =
  await loadImageBase64(
    "/images/brand1.png"
  );
  
const watermarkBase64 =
  await loadImageBase64(
    "/images/ab.svg"
  );
   
  /* ============================================================
     BACKGROUND
  ============================================================ */

pdf.setFillColor(5, 5, 5);

pdf.rect(
  0,
  0,
  pageWidth,
  pageHeight,
  "F"
);

/* ============================================================
   EXECUTIVE COVER PAGE
============================================================ */

function renderCoverPage() {

  /* ============================================================
     BACKGROUND
  ============================================================ */

pdf.setFillColor(
  5,
  8,
  16
);

pdf.rect(
  0,
  0,
  pageWidth,
  pageHeight,
  "F"
);

  /* ============================================================
     HERO IMAGE
  ============================================================ */

pdf.addImage(
  coverBase64,
  "PNG",
  0,
  0,
  pageWidth,
  120
);

  /* ============================================================
     DARK OVERLAY
  ============================================================ */

 pdf.setFillColor(
  0,
  0,
  0
);

pdf.setGState(
  new pdf.GState({ opacity: 0.45 })
);

pdf.rect(
  0,
  0,
  pageWidth,
  120,
  "F"
);

pdf.setGState(
  new pdf.GState({ opacity: 1 })
);

  /* ============================================================
     BRAND
  ============================================================ */

  pdf.addImage(
    logoBase64,
    "PNG",
    margin,
    20,
    72,
    16
  );

  /* ============================================================
     REPORT TITLE
  ============================================================ */

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setTextColor(
    255,
    255,
    255
  );

  pdf.setFontSize(28);

  pdf.text(
    "Analytics Report",
    margin,
    150
  );

  /* ============================================================
     SUBTITLE
  ============================================================ */

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(12);

  pdf.setTextColor(
    180,
    190,
    210
  );

  pdf.text(
    "Executive Intelligence Dashboard",
    margin,
    162
  );

  /* ============================================================
     KPI INFO
  ============================================================ */

  pdf.setFontSize(11);

  pdf.text(
    `Selected KPI: ${String(kpi).toUpperCase()}`,
    margin,
    188
  );

  pdf.text(
    `Generated: ${new Date().toLocaleString()}`,
    margin,
    196
  );

  pdf.text(
    `Rows Exported: ${rows.length}`,
    margin,
    204
  );

  /* ============================================================
     FOOTER LINE
  ============================================================ */

 pdf.setDrawColor(
  ...theme.primary
);

  pdf.line(
    margin,
    240,
    pageWidth - margin,
    240
  );

  /* ============================================================
     FOOTER
  ============================================================ */

  pdf.setFontSize(9);

  pdf.setTextColor(
    120,
    130,
    150
  );

  pdf.text(
    "WORLD CIGAR LOCATOR — CONFIDENTIAL ANALYTICS",
    margin,
    248
  );

  /* ============================================================
     NEXT PAGE
  ============================================================ */

  pdf.addPage();

  currentPage++;

  renderPageHeader();

}
   
/* ============================================================
   PAGE HEADER ENGINE
============================================================ */

let currentPage = 1;

function renderPageHeader() {

  /* ============================================================
     LOGO
  ============================================================ */

  pdf.addImage(
    logoBase64,
    "PNG",
    margin,
    10,
    52,
    12
  );

  /* ============================================================
     TITLE
  ============================================================ */

  pdf.setFontSize(22);

  pdf.setTextColor(
    255,
    255,
    255
  );

  pdf.text(
    "Analytics Report",
    margin,
    34
  );

  /* ============================================================
     META
  ============================================================ */

  pdf.setFontSize(9);

  pdf.setTextColor(
    140,
    150,
    170
  );

  pdf.text(
    `KPI: ${String(kpi).toUpperCase()}`,
    margin,
    41
  );

  pdf.text(
    new Date().toLocaleString(),
    pageWidth - margin,
    18,
    { align:"right" }
  );

  pdf.text(
    `Page ${currentPage}`,
    pageWidth - margin,
    24,
    { align:"right" }
  );

  /* ============================================================
     DIVIDER
  ============================================================ */

 pdf.setDrawColor(
  ...theme.primary
);

  pdf.line(
    margin,
    48,
    pageWidth - margin,
    48
  );

  y = 60;
}

/* ============================================================
   FIRST PAGE
============================================================ */

renderCoverPage();

  /* ============================================================
   EXECUTIVE KPI CARDS
============================================================ */

const cards = [

  {
    label: "Views",
    value: global.views || "0",
    color: [192,132,252]
  },

  {
    label: "Users",
    value: global.users || "0",
    color: [79,209,255]
  },

  {
    label: "Stores",
    value: global.stores || "0",
    color: [110,231,183]
  }

];

const cardWidth =
  (pageWidth - margin * 2 - 10) / 3;

cards.forEach((card, i) => {

  const x =
    margin + (cardWidth + 5) * i;

  /* ============================================================
     CARD BG
  ============================================================ */

pdf.setFillColor(
  ...theme.dark
);

  pdf.roundedRect(
    x,
    y,
    cardWidth,
    28,
    4,
    4,
    "F"
  );

  /* ============================================================
     GLOW TOP LINE
  ============================================================ */

  pdf.setDrawColor(
  ...theme.primary
);

  pdf.setLineWidth(1.2);

  pdf.line(
    x,
    y,
    x + cardWidth,
    y
  );

  /* ============================================================
     LABEL
  ============================================================ */

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(8);

  pdf.setTextColor(
    160,
    170,
    190
  );

  pdf.text(
    card.label.toUpperCase(),
    x + 5,
    y + 8
  );

  /* ============================================================
     VALUE
  ============================================================ */

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(20);

  pdf.setTextColor(
    255,
    255,
    255
  );

  pdf.text(
    String(card.value),
    x + 5,
    y + 20
  );

});

y += 38;
   
  /* ============================================================
   TABLE SECTION
============================================================ */

pdf.setFontSize(16);

pdf.setTextColor(255,255,255);

pdf.text(
  "Analytics Breakdown",
  margin,
  y
);

y += 10;

/* ============================================================
   EXECUTIVE TABLE HEADER
============================================================ */

pdf.setFillColor(
  12,
  18,
  30
);

pdf.roundedRect(
  margin,
  y - 6,
  pageWidth - (margin * 2),
  14,
  3,
  3,
  "F"
);

pdf.setFont(
  "helvetica",
  "bold"
);

pdf.setFontSize(9);

pdf.setTextColor(
  180,
  190,
  210
);

pdf.text(
  isMembers
    ? "MEMBER"
    : "NAME",
  margin + 5,
  y + 2
);

pdf.text(
  "VIEWS",
  120,
  y + 2,
  { align:"right" }
);

pdf.text(
  "CLICKS",
  150,
  y + 2,
  { align:"right" }
);

pdf.text(
  isMembers
    ? "LOGINS"
    : "CTR",
  190,
  y + 2,
  { align:"right" }
);

y += 16;

/* ============================================================
   EXECUTIVE TABLE ROWS
============================================================ */

pdf.setFont(
  "helvetica",
  "normal"
);

rows
  .filter(r => r)
  .slice(0, 14)
  .forEach((row, index) => {

    const rowY =
      y + (index * 10);

    /* ============================================================
       ROW BG
    ============================================================ */

    pdf.setFillColor(
      index % 2 === 0
        ? 16
        : 10,
      index % 2 === 0
        ? 24
        : 18,
      index % 2 === 0
        ? 40
        : 30
    );

    pdf.roundedRect(
      margin,
      rowY - 5,
      pageWidth - (margin * 2),
      8,
      2,
      2,
      "F"
    );

    /* ============================================================
       TEXT
    ============================================================ */

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFontSize(9);

    pdf.text(
      String(
        row.label || "—"
      ),
      margin + 5,
      rowY
    );

    pdf.text(
      String(
        row.views || 0
      ),
      120,
      rowY,
      { align:"right" }
    );

    pdf.text(
      String(
        row.clicks || 0
      ),
      150,
      rowY,
      { align:"right" }
    );

    pdf.text(
      String(
        row.ctr || "0%"
      ),
      190,
      rowY,
      { align:"right" }
    );

  });

y += (rows.length * 10) + 8;

/* ============================================================
   EXECUTIVE CHART SECTION
============================================================ */

if (chartCanvas) {

  /* ============================================================
     CHART FRAME
  ============================================================ */

  pdf.setFillColor(
    10,
    16,
    28
  );

  pdf.roundedRect(
    margin,
    y,
    pageWidth - (margin * 2),
    92,
    5,
    5,
    "F"
  );

  pdf.setDrawColor(
  ...theme.primary
);

  pdf.setLineWidth(0.6);

  pdf.roundedRect(
    margin,
    y,
    pageWidth - (margin * 2),
    92,
    5,
    5
  );

  /* ============================================================
     TITLE
  ============================================================ */

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(10);

  pdf.setTextColor(
    255,
    255,
    255
  );

  pdf.text(
    "Performance Visualization",
    margin + 6,
    y + 10
  );

  /* ============================================================
     CHART
  ============================================================ */

  const chartImage =
    chartCanvas.toDataURL(
      "image/png",
      1
    );

  pdf.addImage(
    chartImage,
    "PNG",
    margin + 4,
    y + 16,
    pageWidth - (margin * 2) - 8,
    68
  );

  y += 102;

}
   
  /* ============================================================
     SAVE
  ============================================================ */

  pdf.save(
    `wcl-${getKPI()}-analytics.pdf`
  );

}


