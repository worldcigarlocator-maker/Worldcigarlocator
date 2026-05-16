/* ============================================================
   WCL Analytics PDF Export
   Clean report layout for partner/admin review
============================================================ */

import { getKPI } from "./analytics-state.js";

const BRAND = {
  ink: [18, 18, 18],
  muted: [105, 110, 118],
  line: [222, 224, 228],
  soft: [247, 247, 245],
  gold: [115, 98, 75],
  goldSoft: [236, 231, 222],
  white: [255, 255, 255]
};

const PAGE = {
  width: 210,
  height: 297,
  margin: 16
};

export async function exportAnalyticsPDF({
  kpi,
  state = {},
  rows = [],
  chartCanvas,
  usersChartCanvas,
  global = {}
}) {
  const { jsPDF } = window.jspdf || {};

  if (!jsPDF) {
    throw new Error("jsPDF is not loaded");
  }

  const activeKpi = kpi || getKPI();
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  PDF_INSTANCE = pdf;

  const logo = await loadImageBase64("/images/wcl_brand_text.png");
  const cover = await loadImageBase64("/images/brand1.png");
  const reportRows = normalizeRows(rows);
  const chart = activeKpi === "users" ? usersChartCanvas : chartCanvas;
  const generated = new Date();
  let pageNo = 0;

  function addPage() {
    if (pageNo > 0) {
      pdf.addPage();
    }

    pageNo++;
    drawPageBase();
  }

  function drawPageBase() {
    pdf.setFillColor(...BRAND.white);
    pdf.rect(0, 0, PAGE.width, PAGE.height, "F");

    pdf.setDrawColor(...BRAND.line);
    pdf.line(PAGE.margin, 278, PAGE.width - PAGE.margin, 278);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...BRAND.muted);
    pdf.text("World Cigar Locator Analytics", PAGE.margin, 286);
    pdf.text(`Page ${pageNo}`, PAGE.width - PAGE.margin, 286, {
      align: "right"
    });
  }

  function drawBrandHeader(title, subtitle) {
    if (logo) {
      pdf.addImage(logo, "PNG", PAGE.margin, 13, 52, 12);
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...BRAND.gold);
      pdf.text("World Cigar Locator", PAGE.margin, 21);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...BRAND.ink);
    pdf.text(title, PAGE.margin, 40);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND.muted);
    pdf.text(subtitle, PAGE.margin, 47);

    pdf.setDrawColor(...BRAND.gold);
    pdf.setLineWidth(0.8);
    pdf.line(PAGE.margin, 54, PAGE.width - PAGE.margin, 54);
  }

  function drawCover() {
    addPage();

    pdf.setFillColor(8, 8, 8);
    pdf.rect(0, 0, PAGE.width, PAGE.height, "F");

    if (cover) {
      pdf.addImage(cover, "PNG", 0, 0, PAGE.width, 120);
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(new pdf.GState({ opacity: 0.58 }));
      pdf.rect(0, 0, PAGE.width, 120, "F");
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    }

    if (logo) {
      pdf.addImage(logo, "PNG", PAGE.margin, 22, 68, 16);
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(...BRAND.gold);
      pdf.text("World Cigar Locator", PAGE.margin, 32);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(30);
    pdf.setTextColor(...BRAND.white);
    pdf.text("Analytics Report", PAGE.margin, 154);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(220, 220, 220);
    pdf.text(reportTitle(activeKpi), PAGE.margin, 166);

    pdf.setFillColor(...BRAND.gold);
    pdf.rect(PAGE.margin, 184, 42, 1.5, "F");

    pdf.setFontSize(10);
    pdf.setTextColor(190, 190, 190);
    pdf.text(`Generated ${generated.toLocaleString()}`, PAGE.margin, 202);
    pdf.text("Prepared by World Cigar Locator", PAGE.margin, 211);
    pdf.text("Private admin and partner performance report", PAGE.margin, 220);

    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(
      "Human moderation remains separate from analytics. Reports are informational only.",
      PAGE.margin,
      266
    );
  }

  function drawSummary() {
    addPage();
    drawBrandHeader(
      "Executive Summary",
      contextLine(activeKpi, state, generated)
    );

    const cards = [
      {
        label: "Members",
        value: global.users || "0",
        note: "Known member activity"
      },
      {
        label: "Stores",
        value: global.stores || "0",
        note: "Approved public listings"
      },
      {
        label: "Market",
        value: global.views || "0",
        note: "Demand and visibility"
      }
    ];

    let y = 68;
    const gap = 5;
    const cardWidth =
      (PAGE.width - PAGE.margin * 2 - gap * 2) / 3;

    cards.forEach((card, index) => {
      const x = PAGE.margin + index * (cardWidth + gap);
      drawMetricCard(x, y, cardWidth, card);
    });

    y += 48;

    drawInsightBlock(
      y,
      "Report Notes",
      [
        `Current focus: ${reportTitle(activeKpi)}`,
        `${reportRows.length} rows are included from the active analytics view.`,
        "Analytics data is read-only and does not influence moderation or listing status."
      ]
    );

    y += 58;

    if (reportRows.length) {
      drawTablePreview(y, reportRows.slice(0, 6), activeKpi);
    } else {
      drawEmptyState(y, "No table rows were available for this export.");
    }
  }

  function drawChartPage() {
    if (!chart) return;

    const image = canvasToImage(chart);
    if (!image) return;

    addPage();
    drawBrandHeader(
      "Trend View",
      "Chart captured from the active analytics dashboard"
    );

    pdf.setFillColor(...BRAND.soft);
    pdf.roundedRect(PAGE.margin, 68, PAGE.width - PAGE.margin * 2, 128, 5, 5, "F");

    pdf.setDrawColor(...BRAND.line);
    pdf.roundedRect(PAGE.margin, 68, PAGE.width - PAGE.margin * 2, 128, 5, 5);

    pdf.addImage(
      image,
      "PNG",
      PAGE.margin + 7,
      78,
      PAGE.width - PAGE.margin * 2 - 14,
      108
    );

    drawInsightBlock(
      214,
      "Reading The Chart",
      [
        "Use the chart to understand movement over time, not for moderation decisions.",
        "Compare the trend with the table pages for the stores or markets driving the change."
      ]
    );
  }

  function drawTablePages() {
    if (!reportRows.length) return;

    const rowsPerPage = 20;

    for (let start = 0; start < reportRows.length; start += rowsPerPage) {
      const chunk = reportRows.slice(start, start + rowsPerPage);

      addPage();
      drawBrandHeader(
        start === 0 ? "Detailed Rows" : "Detailed Rows Continued",
        `${reportRows.length} rows exported from the active dashboard view`
      );

      drawTable(68, chunk, activeKpi, start);
    }
  }

  drawCover();
  drawSummary();
  drawChartPage();
  drawTablePages();

  pdf.save(`wcl-${activeKpi}-analytics-report.pdf`);
}

function drawMetricCard(x, y, width, card) {
  const pdf = currentPdf();
  pdf.setFillColor(...BRAND.soft);
  pdf.roundedRect(x, y, width, 34, 4, 4, "F");

  pdf.setDrawColor(...BRAND.line);
  pdf.roundedRect(x, y, width, 34, 4, 4);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(card.label.toUpperCase(), x + 5, y + 9);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...BRAND.ink);
  pdf.text(String(card.value), x + 5, y + 21);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(card.note, x + 5, y + 29);
}

let PDF_INSTANCE = null;

function currentPdf() {
  return PDF_INSTANCE;
}

function drawInsightBlock(y, title, items) {
  const pdf = currentPdf();
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;

  pdf.setFillColor(...BRAND.goldSoft);
  pdf.roundedRect(x, y, width, 42, 4, 4, "F");

  pdf.setDrawColor(220, 210, 196);
  pdf.roundedRect(x, y, width, 42, 4, 4);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...BRAND.ink);
  pdf.text(title, x + 6, y + 10);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...BRAND.muted);

  items.slice(0, 3).forEach((item, index) => {
    const lines = pdf.splitTextToSize(String(item), width - 18);
    pdf.text(lines.slice(0, 2), x + 6, y + 20 + index * 7);
  });
}

function drawEmptyState(y, message) {
  const pdf = currentPdf();
  const width = PAGE.width - PAGE.margin * 2;

  pdf.setFillColor(...BRAND.soft);
  pdf.roundedRect(PAGE.margin, y, width, 30, 4, 4, "F");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(message, PAGE.margin + 6, y + 17);
}

function drawTablePreview(y, rows, kpi) {
  const pdf = currentPdf();

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...BRAND.ink);
  pdf.text("Top Rows Preview", PAGE.margin, y);

  drawTable(y + 10, rows, kpi, 0);
}

function drawTable(y, rows, kpi, offset = 0) {
  const pdf = currentPdf();
  const width = PAGE.width - PAGE.margin * 2;
  const headers = tableHeaders(kpi);
  const col = {
    label: PAGE.margin + 6,
    first: PAGE.margin + width - 60,
    second: PAGE.margin + width - 35,
    third: PAGE.margin + width - 10
  };

  pdf.setFillColor(...BRAND.ink);
  pdf.roundedRect(PAGE.margin, y, width, 11, 3, 3, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.white);
  pdf.text(headers[0], col.label, y + 7);
  pdf.text(headers[1], col.first, y + 7, { align: "right" });

  if (headers[2]) {
    pdf.text(headers[2], col.second, y + 7, { align: "right" });
  }

  if (headers[3]) {
    pdf.text(headers[3], col.third, y + 7, { align: "right" });
  }

  let rowY = y + 16;

  rows.forEach((row, index) => {
    const isEven = index % 2 === 0;

    pdf.setFillColor(
      ...(isEven ? [252, 252, 250] : [246, 246, 244])
    );
    pdf.rect(PAGE.margin, rowY - 5, width, 8, "F");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...BRAND.ink);
    pdf.text(
      fitText(`${offset + index + 1}. ${row.label}`, 82),
      col.label,
      rowY
    );

    pdf.setTextColor(...BRAND.muted);
    pdf.text(row.first || "0", col.first, rowY, { align: "right" });

    if (headers[2]) {
      pdf.text(row.second || "0", col.second, rowY, { align: "right" });
    }

    if (headers[3]) {
      pdf.text(row.third || "0%", col.third, rowY, { align: "right" });
    }

    rowY += 9;
  });
}

function tableHeaders(kpi) {
  if (kpi === "users") {
    return ["Date / Location", "Members", "", ""];
  }

  return [
    kpi === "stores" ? "Store" : "Location",
    "Views",
    "Clicks",
    "CTR"
  ];
}

function normalizeRows(rowNodes) {
  return [...(rowNodes || [])]
    .map((row) => {
      const cells = [...row.querySelectorAll("td")]
        .map((cell) => cell.textContent.trim())
        .filter(Boolean);

      if (cells.length < 2) return null;

      const label = cells[0];

      if (/loading|no data/i.test(label)) {
        return null;
      }

      return {
        label,
        first: cells[1] || "0",
        second: cells[2] || "",
        third: cells[3] || ""
      };
    })
    .filter(Boolean);
}

function reportTitle(kpi) {
  const titles = {
    users: "Members and Audience Activity",
    stores: "Store Visibility and Engagement",
    views: "Market Demand and Traffic",
    clicks: "Website Visit Performance",
    ctr: "Engagement Rate Performance"
  };

  return titles[kpi] || "Analytics Performance";
}

function contextLine(kpi, state, generated) {
  const parts = [
    reportTitle(kpi),
    state?.country,
    state?.city,
    state?.sort ? `Sorted by ${state.sort}` : null,
    generated.toLocaleDateString()
  ].filter(Boolean);

  return parts.join(" / ");
}

function canvasToImage(canvas) {
  try {
    if (!canvas || typeof canvas.toDataURL !== "function") return null;
    return canvas.toDataURL("image/png", 1);
  } catch {
    return null;
  }
}

async function loadImageBase64(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitText(value, maxLength) {
  const text = String(value || "");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}...`;
}
