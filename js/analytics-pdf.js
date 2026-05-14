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
     BACKGROUND
  ============================================================ */

  pdf.setFillColor(5, 5, 5);

  pdf.rect(
    0,
    0,
    210,
    297,
    "F"
  );

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
    79,
    209,
    255
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

renderPageHeader();

  /* ============================================================
   KPI CARDS
============================================================ */

const cards = [

  {
    label:"Views",
    value:global.views,
    color:[192,132,252]
  },

  {
    label:"Stores",
    value:global.stores,
    color:[110,231,183]
  },

  {
    label:"Users",
    value:global.users,
    color:[79,209,255]
  }

];

const cardWidth = 56;
const cardHeight = 24;
const gap = 8;

cards.forEach((card, index) => {

  const x =
    12 + ((cardWidth + gap) * index);

  // background
  pdf.setFillColor(12,16,28);

  pdf.roundedRect(
    x,
    y,
    cardWidth,
    cardHeight,
    6,
    6,
    "F"
  );

  // border glow
  pdf.setDrawColor(
    card.color[0],
    card.color[1],
    card.color[2]
  );

  pdf.roundedRect(
    x,
    y,
    cardWidth,
    cardHeight,
    6,
    6
  );

  // label
  pdf.setFontSize(9);

  pdf.setTextColor(150,150,150);

  pdf.text(
    card.label,
    x + 6,
    y + 7
  );

  // value
  pdf.setFontSize(18);

  pdf.setTextColor(
    card.color[0],
    card.color[1],
    card.color[2]
  );

  pdf.text(
    String(card.value),
    x + 6,
    y + 18
  );

});

y += 34;

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
   TABLE HEADER
============================================================ */

const columns = [
  "Name",
  "Views",
  "Clicks",
  "CTR"
];

const colX = [
  14,
  120,
  155,
  190
];

pdf.setFillColor(18,24,40);

pdf.roundedRect(
  margin,
  y,
  184,
  12,
  4,
  4,
  "F"
);

pdf.setFontSize(10);

pdf.setTextColor(170,180,200);

columns.forEach((col, i) => {

  pdf.text(
    col,
    colX[i],
    y + 8,
    {
      align:
        i === 0
          ? "left"
          : "right"
    }
  );

});

y += 18;

/* ============================================================
   ROWS
============================================================ */

const safeRows =
  Array.isArray(rows)
    ? rows
    : [];

safeRows
  .slice(0, 18)
  .forEach((row, index) => {

    // page break
    if (y > 250) {

      pdf.addPage();

      y = 20;
    }

    // alternating bg
    if (index % 2 === 0) {

      pdf.setFillColor(10,14,24);

    } else {

      pdf.setFillColor(15,20,32);

    }

    pdf.roundedRect(
      margin,
      y - 6,
      184,
      10,
      3,
      3,
      "F"
    );

    const views =
      Number(row.views || 0);

    const clicks =
      Number(row.clicks || 0);

    const ctr =
      views > 0
        ? (
            (clicks / views) * 100
          ).toFixed(1) + "%"
        : "0%";

    pdf.setFontSize(10);

    pdf.setTextColor(255,255,255);

    pdf.text(
      String(
        row.name ||
        row.country ||
        row.city ||
        "-"
      ),
      14,
      y
    );

    pdf.text(
      String(views),
      120,
      y,
      { align:"right" }
    );

    pdf.text(
      String(clicks),
      155,
      y,
      { align:"right" }
    );

    // ctr color
    if (Number.parseFloat(ctr) >= 20) {

      pdf.setTextColor(
        110,
        231,
        183
      );

    } else {

      pdf.setTextColor(
        245,
        158,
        11
      );

    }

    pdf.text(
      ctr,
      190,
      y,
      { align:"right" }
    );

    y += 14;

});

/* ============================================================
   CHART SECTION
============================================================ */

if (chartCanvas?.toDataURL) {

  // auto page
  if (y > 180) {

    pdf.addPage();

    y = 20;
  }

  /* ============================================================
     SECTION TITLE
  ============================================================ */

  pdf.setFontSize(16);

  pdf.setTextColor(255,255,255);

  pdf.text(
    "Performance Chart",
    margin,
    y
  );

  y += 10;

  /* ============================================================
     CHART CARD
  ============================================================ */

  pdf.setFillColor(12,16,28);

  pdf.roundedRect(
    margin,
    y,
    184,
    88,
    8,
    8,
    "F"
  );

  pdf.setDrawColor(
    79,
    209,
    255
  );

  pdf.roundedRect(
    margin,
    y,
    184,
    88,
    8,
    8
  );

  /* ============================================================
     IMAGE
  ============================================================ */

  const imgData =
    chartCanvas.toDataURL(
      "image/png",
      1
    );

  pdf.addImage(
    imgData,
    "PNG",
    margin + 6,
    y + 6,
    172,
    76
  );

  y += 100;
}

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
  "Generated by World Cigar Locator Analytics",
  105,
  287,
  { align:"center" }
);
   

  /* ============================================================
     SAVE
  ============================================================ */

  pdf.save(
    `wcl-${getKPI()}-analytics.pdf`
  );

}

/* ============================================================
   HEADER
============================================================ */

async function renderPdfHeader(
  pdf,
  margin,
  pageWidth,
  y
) {

  try {

    const img = new Image();

    img.src =
      "/images/wcl_brand_text.png";

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

    const png =
      canvas.toDataURL("image/png");

    pdf.addImage(
      png,
      "PNG",
      margin,
      y - 6,
      55,
      12
    );

  } catch (e) {

    console.warn(
      "PDF logo failed",
      e
    );

  }

  pdf.setTextColor(
    150,
    150,
    150
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(9);

  pdf.text(
    new Date().toLocaleString(),
    pageWidth - margin,
    y,
    { align: "right" }
  );

  y += 18;

  return y;

}

/* ============================================================
   KPI CARDS
============================================================ */

function renderPdfKpis(
  pdf,
  margin,
  pageWidth,
  y
) {

  const cards = [

    {
      label: "Views",
      value:
        document.getElementById(
          "globalMarket"
        )?.textContent || "0"
    },

    {
      label: "Stores",
      value:
        document.getElementById(
          "globalStores"
        )?.textContent || "0"
    },

    {
      label: "Users",
      value:
        document.getElementById(
          "globalUsers"
        )?.textContent || "0"
    }

  ];

  const boxWidth =
    (pageWidth - margin * 2 - 10) / 3;

  cards.forEach((k, i) => {

    const x =
      margin + (boxWidth + 5) * i;

    pdf.setFillColor(
      20,
      20,
      20
    );

    pdf.roundedRect(
      x,
      y,
      boxWidth,
      16,
      3,
      3,
      "F"
    );

    pdf.setTextColor(
      150,
      150,
      150
    );

    pdf.setFontSize(8);

    pdf.text(
      k.label,
      x + 4,
      y + 5
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(12);

    pdf.text(
      String(k.value),
      x + 4,
      y + 11
    );

  });

  y += 24;

  return y;

}

/* ============================================================
   TABLE
============================================================ */

function renderPdfTable(
  pdf,
  margin,
  pageWidth,
  y
) {

  const rows =
    window.WCL_MARKET_DATA || [];

  if (!rows.length) {

    pdf.setTextColor(
      180,
      180,
      180
    );

    pdf.text(
      "No data available.",
      margin,
      y
    );

    return y + 10;

  }

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(9);

  pdf.setTextColor(
    180,
    180,
    180
  );

  pdf.text(
    "Name",
    margin,
    y
  );

  pdf.text(
    "Views",
    120,
    y,
    { align: "right" }
  );

  pdf.text(
    "Clicks",
    150,
    y,
    { align: "right" }
  );

  pdf.text(
    "CTR",
    190,
    y,
    { align: "right" }
  );

  y += 3;

  pdf.setDrawColor(
    60,
    60,
    60
  );

  pdf.line(
    margin,
    y,
    pageWidth - margin,
    y
  );

  y += 6;

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setTextColor(
    230,
    230,
    230
  );

  rows.slice(0, 12).forEach(r => {

    const name =
      r.country ||
      r.city ||
      r.name ||
      r.source ||
      "-";

    const views =
      Number(
        r.views ||
        r.visitors ||
        0
      );

    const clicks =
      Number(
        r.clicks || 0
      );

    const ctr =
      views
        ? (
            (clicks / views) * 100
          ).toFixed(1) + "%"
        : "0%";

    pdf.text(
      String(name),
      margin,
      y
    );

    pdf.text(
      String(views),
      120,
      y,
      { align: "right" }
    );

    pdf.text(
      String(clicks),
      150,
      y,
      { align: "right" }
    );

    pdf.text(
      ctr,
      190,
      y,
      { align: "right" }
    );

    y += 6;

  });

  y += 8;

  return y;

}

/* ============================================================
   CHART
============================================================ */

function renderPdfChart(
  pdf,
  margin,
  pageWidth,
  y
) {

  const chartCanvas =
    document.getElementById(
      "marketChart"
    );

  if (
    !chartCanvas ||
    !chartCanvas.toDataURL
  ) {
    return y;
  }

  try {

    const imgData =
      chartCanvas.toDataURL(
        "image/png",
        1.0
      );

    pdf.addImage(
      imgData,
      "PNG",
      margin,
      y,
      pageWidth - margin * 2,
      80
    );

    y += 90;

  } catch (e) {

    console.warn(
      "Chart export failed",
      e
    );

  }

  return y;

}

/* ============================================================
   FOOTER
============================================================ */

function renderPdfFooter(
  pdf,
  pageWidth
) {

  pdf.setFontSize(8);

  pdf.setTextColor(
    120,
    120,
    120
  );

  pdf.text(
    "World Cigar Locator — Analytics Export",
    pageWidth / 2,
    290,
    { align: "center" }
  );

}
