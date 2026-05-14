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

export async function exportAnalyticsPDF() {

  console.log("🔥 EXPORT PDF V2");

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF(
    "p",
    "mm",
    "a4"
  );

  const pageWidth = 210;
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
     HEADER
  ============================================================ */

  y = await renderPdfHeader(
    pdf,
    margin,
    pageWidth,
    y
  );

  /* ============================================================
     KPI CARDS
  ============================================================ */

  y = renderPdfKpis(
    pdf,
    margin,
    pageWidth,
    y
  );

  /* ============================================================
   TABLE DATA
============================================================ */

const safeRows = rows.filter(tr => {

  const cells = tr.querySelectorAll("td");

  if (!cells.length) return false;

  const first =
    cells[0]?.textContent?.trim();

  return first && first !== "-";

});

if (!safeRows.length) {

  pdf.setTextColor(140,140,140);

  pdf.text(
    "No analytics data available.",
    20,
    y
  );

  y += 10;

} else {

  pdf.setFontSize(11);
  pdf.setTextColor(255,255,255);

  safeRows.slice(0, 14).forEach((tr) => {

    const cells = [
      ...tr.querySelectorAll("td")
    ];

    const values = cells.map(td =>
      td.textContent.trim()
    );

    const rowText =
      values.join("   •   ");

    pdf.text(
      rowText,
      20,
      y
    );

    y += 8;

  });

}

  /* ============================================================
     CHART
  ============================================================ */
/* ============================================================
   CHART
============================================================ */

const activeChart =
  kpi === "users"
    ? usersChartCanvas
    : chartCanvas;

if (
  activeChart &&
  activeChart.toDataURL
) {

  try {

    const imgData =
      activeChart.toDataURL(
        "image/png",
        1.0
      );

    pdf.addImage(
      imgData,
      "PNG",
      20,
      y + 10,
      170,
      70
    );

    y += 90;

  } catch (err) {

    console.warn(
      "Chart export failed",
      err
    );

  }

}
  /* ============================================================
     FOOTER
  ============================================================ */

  renderPdfFooter(
    pdf,
    pageWidth
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
