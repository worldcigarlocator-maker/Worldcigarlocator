/* ============================================================
   WCL Analytics PDF Export
   Premium A4 report layout
============================================================ */

import { getKPI } from "./analytics-state.js";

const BRAND = {
  black: [4, 4, 4],
  panel: [14, 13, 12],
  panelSoft: [24, 22, 19],
  line: [79, 64, 43],
  gold: [196, 151, 78],
  goldSoft: [232, 203, 148],
  cream: [244, 237, 222],
  muted: [176, 166, 150],
  white: [255, 255, 255]
};

const PAGE = {
  width: 210,
  height: 297,
  margin: 18,
  footerY: 280
};

let PDF_INSTANCE = null;

export async function exportAnalyticsPDF({
  kpi,
  state = {},
  rows = [],
  chartCanvas,
  usersChartCanvas,
  global = {},
  store = null,
  dossier = null
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

  const hero = await loadImageBase64("/images/brand1.png");
  const logo = await loadImageBase64("/images/wcl_brand_text_no_url.png");
  const generated = new Date();
  const reportRows = normalizeRows(rows, activeKpi);
  const chart = selectChartCanvas(activeKpi, chartCanvas, usersChartCanvas, store);
  const chartImage = canvasToImage(chart);
  const dossierStore = dossier?.store || null;
  const reportStore = store || dossierStore;
  const title = reportTitle(activeKpi, reportStore);
  const subtitle = contextLine(activeKpi, state, generated, reportStore);
  let pageNo = 0;

  function addContentPage() {
    if (pageNo > 0) {
      pdf.addPage();
    }

    pageNo++;
    drawPageBase({ logo, title, subtitle, generated, pageNo });
  }

  drawCoverPage({
    hero,
    generated,
    title,
    subtitle,
    activeKpi,
    state,
    reportRows,
    store: reportStore
  });
  pageNo++;

  addContentPage();

  let y = 48;

  if (dossier) {
    drawDossierReport({
      dossier,
      addContentPage
    });

    drawClosingPage({ addContentPage });

    pdf.save(fileName(activeKpi, reportStore, generated));
    PDF_INSTANCE = null;
    return;
  }

  if (reportStore) {
    y = drawStoreSummary(y, reportStore);
  }

  y = drawMetricCards(
    y,
    metricCards({ activeKpi, global, reportRows, state, store: reportStore })
  );

  if (chartImage) {
    y = drawChartBlock(y + 8, chartImage);
  }

  if (reportRows.length) {
    if (y > 214) {
      addContentPage();
      y = 48;
    }

    y = drawRowsTable({
      y,
      rows: reportRows,
      kpi: activeKpi,
      store: reportStore,
      addContentPage
    });
  } else {
    y = drawNoRows(y + 8);
  }

  drawClosingPage({ addContentPage });

  pdf.save(fileName(activeKpi, reportStore, generated));
  PDF_INSTANCE = null;
}

function drawCoverPage({
  hero,
  generated,
  title,
  subtitle,
  activeKpi,
  state,
  reportRows,
  store
}) {
  const pdf = currentPdf();

  pdf.setFillColor(...BRAND.black);
  pdf.rect(0, 0, PAGE.width, PAGE.height, "F");

  if (hero) {
    safeAddImage(hero, "PNG", 31, 39, 148, 98);
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(formatDate(generated), PAGE.width - PAGE.margin, 24, {
    align: "right"
  });

  pdf.setDrawColor(...BRAND.line);
  pdf.setLineWidth(0.3);
  pdf.line(PAGE.margin, 31, PAGE.width - PAGE.margin, 31);

  pdf.setFont("times", "normal");
  pdf.setFontSize(24);
  pdf.setTextColor(...BRAND.goldSoft);
  pdf.text("Analytics Report", PAGE.width / 2, 158, {
    align: "center"
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...BRAND.cream);
  pdf.text(
    pdf.splitTextToSize(title, PAGE.width - PAGE.margin * 2),
    PAGE.width / 2,
    170,
    { align: "center" }
  );

  pdf.setTextColor(...BRAND.muted);
  pdf.setFontSize(9);
  pdf.text(
    pdf.splitTextToSize(subtitle, PAGE.width - PAGE.margin * 2),
    PAGE.width / 2,
    182,
    { align: "center" }
  );

  drawGoldDivider(198, 52);

  const overview = [
    `Scope: ${selectedView(activeKpi, state, store)}`,
    `Rows included: ${reportRows.length}`,
    "Prepared for business review and backoffice decision support"
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND.cream);
  overview.forEach((line, index) => {
    pdf.text(line, PAGE.width / 2, 213 + index * 8, {
      align: "center"
    });
  });

  const legal =
    "This report is generated from World Cigar Locator analytics data and reflects the selected view at the time of export. Analytics do not influence moderation, listing approval, or store visibility. Store and lounge information may change over time and should be verified before business decisions are made.";

  pdf.setFontSize(7.8);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(
    pdf.splitTextToSize(legal, 145),
    PAGE.width / 2,
    246,
    { align: "center" }
  );
}

function drawPageBase({
  title,
  subtitle,
  logo,
  generated,
  pageNo
}) {
  const pdf = currentPdf();

  pdf.setFillColor(...BRAND.black);
  pdf.rect(0, 0, PAGE.width, PAGE.height, "F");

  pdf.setFillColor(...BRAND.panel);
  pdf.rect(0, 0, PAGE.width, 35, "F");

  drawHeaderBrand(PAGE.margin, 6, logo);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.setTextColor(...BRAND.cream);
  pdf.text(safePdfText(fitText(title, 62)), 54, 16);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(safePdfText(fitText(subtitle, 82)), 54, 24);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.cream);
  pdf.text(formatDate(generated), PAGE.width - PAGE.margin, 16, {
    align: "right"
  });
  pdf.setTextColor(...BRAND.muted);
  pdf.text(`Page ${pageNo}`, PAGE.width - PAGE.margin, 24, {
    align: "right"
  });

  pdf.setDrawColor(...BRAND.gold);
  pdf.setLineWidth(0.45);
  pdf.line(PAGE.margin, 35, PAGE.width - PAGE.margin, 35);

  pdf.setDrawColor(...BRAND.line);
  pdf.setLineWidth(0.25);
  pdf.line(PAGE.margin, PAGE.footerY, PAGE.width - PAGE.margin, PAGE.footerY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.3);
  pdf.setTextColor(...BRAND.muted);
  pdf.text("World Cigar Locator Analytics", PAGE.margin, 288);
  pdf.text("worldcigarlocator.com", PAGE.width / 2, 288, {
    align: "center"
  });
  pdf.text(`Page ${pageNo}`, PAGE.width - PAGE.margin, 288, {
    align: "right"
  });
}

function drawHeaderBrand(x, y, logo) {
  const pdf = currentPdf();

  if (logo && safeAddImage(logo, "PNG", x, y, 31, 13.7)) {
    return;
  }

  pdf.setFont("times", "normal");
  pdf.setFontSize(16);
  pdf.setTextColor(...BRAND.goldSoft);
  pdf.text("WCL", x + 15, y + 10, { align: "center" });
}

function drawStoreSummary(y, store) {
  const pdf = currentPdf();
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;

  drawSectionTitle(y, store.name || "Selected Store / Lounge");

  pdf.setFillColor(...BRAND.panel);
  pdf.roundedRect(x, y + 8, width, 44, 4, 4, "F");
  pdf.setDrawColor(...BRAND.line);
  pdf.roundedRect(x, y + 8, width, 44, 4, 4);

  const details = [
    ["Location", [store.city, store.country].filter(Boolean).join(", ") || "-"],
    ["Type", normalizeType(store)],
    ["Access", store.access ? String(store.access).toUpperCase() : "-"],
    ["Website", store.website || "-"],
    ["Phone", store.phone || "-"],
    ["Address", store.address || "-"]
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.8);

  details.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const labelX = x + 7 + col * 86;
    const valueX = labelX + 24;
    const rowY = y + 22 + row * 8.5;

    pdf.setTextColor(...BRAND.goldSoft);
    pdf.text(item[0].toUpperCase(), labelX, rowY);

    pdf.setTextColor(...BRAND.cream);
    pdf.text(fitText(item[1], 36), valueX, rowY);
  });

  return y + 61;
}

function drawMetricCards(y, cards) {
  const pdf = currentPdf();
  const gap = 5;
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;
  const cardWidth = (width - gap * 2) / 3;

  cards.slice(0, 3).forEach((card, index) => {
    const xx = x + index * (cardWidth + gap);

    pdf.setFillColor(...BRAND.panel);
    pdf.roundedRect(xx, y, cardWidth, 31, 4, 4, "F");
    pdf.setDrawColor(...BRAND.line);
    pdf.roundedRect(xx, y, cardWidth, 31, 4, 4);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...BRAND.goldSoft);
    pdf.text(card.label.toUpperCase(), xx + 5, y + 8);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.setTextColor(...BRAND.cream);
    pdf.text(String(card.value), xx + 5, y + 20);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...BRAND.muted);
    pdf.text(fitText(card.note, 27), xx + 5, y + 27);
  });

  return y + 38;
}

function drawChartBlock(y, image) {
  const pdf = currentPdf();
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;
  const height = 76;

  if (y + height > PAGE.footerY - 8) {
    return y;
  }

  drawSectionTitle(y, "Active Chart");

  pdf.setFillColor(...BRAND.panel);
  pdf.roundedRect(x, y + 8, width, height, 4, 4, "F");
  pdf.setDrawColor(...BRAND.line);
  pdf.roundedRect(x, y + 8, width, height, 4, 4);

  const imageAdded = safeAddImage(
    image,
    imageFormat(image),
    x + 7,
    y + 14,
    width - 14,
    height - 16
  );

  if (!imageAdded) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...BRAND.muted);
    pdf.text("Chart unavailable for this export.", x + 7, y + 44);
  }

  return y + height + 18;
}

function drawRowsTable({
  y,
  rows,
  kpi,
  store,
  addContentPage
}) {
  const headers = tableHeaders(kpi, rows, store);
  const firstPageRows = rowsPerPage(y, headers.length);
  let offset = 0;
  let yy = y;

  drawSectionTitle(yy, tableTitle(kpi, store));
  yy += 9;
  yy = drawTableChunk(yy, rows.slice(0, firstPageRows), headers, offset);
  offset += firstPageRows;

  while (offset < rows.length) {
    addContentPage();
    yy = 48;
    drawSectionTitle(yy, "Detailed Rows Continued");
    yy += 9;

    const pageRows = rowsPerPage(yy, headers.length);
    yy = drawTableChunk(yy, rows.slice(offset, offset + pageRows), headers, offset);
    offset += pageRows;
  }

  return yy + 4;
}

function drawDossierReport({
  dossier,
  addContentPage
}) {
  let y = 48;

  y = drawDossierHeader(y, dossier);
  y = drawDossierMetrics(y + 6, dossier);
  y = drawDossierSources(y + 8, dossier);

  addContentPage();
  y = 48;
  y = drawDossierCardSection(y, "Trend Intelligence", [
    ["Momentum", dossier.trend?.momentumLabel],
    ["Avg Views / Day", dossier.trend?.avgViewsPerDay],
    ["Avg Clicks / Day", dossier.trend?.avgClicksPerDay],
    ["Trend Points", dossier.trend?.trendPoints]
  ]);

  y = drawDossierCardSection(y + 8, "Behavioral Intelligence", [
    ["Dominant Source", dossier.behavior?.dominantSource],
    ["User Discovery", dossier.behavior?.discoveryBehavior],
    ["Engagement Quality", dossier.behavior?.engagementQuality],
    ["Market Position", dossier.behavior?.marketPosition]
  ]);

  y = drawDossierCardSection(y + 8, "Local Market Intelligence", [
    ["Competition Level", dossier.localMarket?.localCompetitionLevel],
    ["Audience Type", dossier.localMarket?.audienceType],
    ["Loyalty Strength", dossier.localMarket?.loyaltyStrength],
    ["Reputation Strength", dossier.localMarket?.reputationStrength],
    ["Traffic Profile", dossier.localMarket?.trafficBalance]
  ]);

  if (y > 204) {
    addContentPage();
    y = 48;
  }

  y = drawDossierCardSection(y + 8, "Engagement Signals", [
    ["Loyalty", dossier.engagement?.loyalty],
    ["Reputation", dossier.engagement?.reputation],
    ["Community", dossier.engagement?.community]
  ]);

  drawDossierCardSection(y + 8, "Predictive Signals", [
    ["Growth Outlook", dossier.predictive?.growthOutlook],
    ["Breakout Potential", dossier.predictive?.breakoutPotential],
    ["Decay Risk", dossier.predictive?.decayRisk],
    ["Audience Trajectory", dossier.predictive?.audienceTrajectory]
  ]);
}

function drawDossierHeader(y, dossier) {
  const pdf = currentPdf();
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;

  drawSectionTitle(y, dossier.store?.name || "Store Intelligence");

  pdf.setFillColor(...BRAND.panel);
  pdf.roundedRect(x, y + 8, width, 34, 4, 4, "F");
  pdf.setDrawColor(...BRAND.line);
  pdf.roundedRect(x, y + 8, width, 34, 4, 4);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND.goldSoft);
  pdf.text("PRESTIGE", x + 7, y + 20);

  pdf.setFontSize(15);
  pdf.setTextColor(...BRAND.cream);
  pdf.text(safePdfText(dossier.prestigeLabel || "Developing"), x + 7, y + 31);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.muted);
  pdf.text("PERFORMANCE SCORE", x + width - 7, y + 20, { align: "right" });

  pdf.setFontSize(18);
  pdf.setTextColor(...BRAND.cream);
  pdf.text(String(dossier.performanceScore || 0), x + width - 7, y + 32, {
    align: "right"
  });

  return y + 50;
}

function drawDossierMetrics(y, dossier) {
  return drawDossierCardGrid(y, [
    ["Views", dossier.store?.views],
    ["Clicks", dossier.store?.clicks],
    ["CTR", dossier.store?.ctr],
    ["Favorites", dossier.store?.favorites],
    ["Rating", Number(dossier.store?.avg_rating || 0).toFixed(1)],
    ["Comments", dossier.store?.comments_count]
  ], 3);
}

function drawDossierSources(y, dossier) {
  const pdf = currentPdf();
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;
  const sources = dossier.sources || [];
  const max = Math.max(...sources.map((source) => Number(source.views || 0)), 1);

  drawSectionTitle(y, "Top Traffic Sources");

  pdf.setFillColor(...BRAND.panel);
  pdf.roundedRect(x, y + 8, width, 62, 4, 4, "F");
  pdf.setDrawColor(...BRAND.line);
  pdf.roundedRect(x, y + 8, width, 62, 4, 4);

  sources.slice(0, 5).forEach((source, index) => {
    const rowY = y + 21 + index * 10;
    const views = Number(source.views || 0);
    const fillWidth = ((width - 47) * views) / max;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...BRAND.cream);
    pdf.text(source.label || "Unknown", x + 7, rowY);

    pdf.setTextColor(...BRAND.cream);
    pdf.text(String(views), x + width - 7, rowY, { align: "right" });

    pdf.setFillColor(44, 48, 58);
    pdf.roundedRect(x + 34, rowY - 3.8, width - 47, 2.6, 1, 1, "F");
    pdf.setFillColor(80, 205, 235);
    pdf.roundedRect(x + 34, rowY - 3.8, fillWidth, 2.6, 1, 1, "F");
  });

  return y + 80;
}

function drawDossierCardSection(y, title, cards) {
  drawSectionTitle(y, title);
  return drawDossierCardGrid(y + 10, cards, cards.length > 4 ? 3 : 2);
}

function drawDossierCardGrid(y, cards, columns = 3) {
  const pdf = currentPdf();
  const gap = 5;
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = 27;

  cards.forEach((card, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const xx = x + col * (cardWidth + gap);
    const yy = y + row * (cardHeight + gap);

    pdf.setFillColor(...BRAND.panel);
    pdf.roundedRect(xx, yy, cardWidth, cardHeight, 4, 4, "F");
    pdf.setDrawColor(...BRAND.line);
    pdf.roundedRect(xx, yy, cardWidth, cardHeight, 4, 4);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...BRAND.muted);
    pdf.text(String(card[0]).toUpperCase(), xx + 4.5, yy + 8);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...BRAND.cream);
    pdf.text(safePdfText(fitText(card[1] ?? "-", 18)), xx + 4.5, yy + 19);
  });

  return y + Math.ceil(cards.length / columns) * (cardHeight + gap);
}

function drawTableChunk(y, rows, headers, offset) {
  const pdf = currentPdf();
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;
  const rowHeight = headers.length > 5 ? 7.2 : 8;
  const columns = tableColumns(headers.length, width);

  pdf.setFillColor(...BRAND.gold);
  pdf.roundedRect(x, y, width, 9, 2, 2, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(headers.length > 5 ? 6.4 : 7);
  pdf.setTextColor(...BRAND.black);
  headers.forEach((header, index) => {
    const column = columns[index];
    const align = index === 0 ? "left" : "right";
    pdf.text(header, column.x, y + 6.2, { align });
  });

  let rowY = y + 13;

  rows.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;

    pdf.setFillColor(...(isEven ? BRAND.panel : BRAND.panelSoft));
    pdf.rect(x, rowY - 5, width, rowHeight, "F");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(headers.length > 5 ? 6.5 : 7.2);

    const values = row.values.slice(0, headers.length);
    values[0] = `${offset + rowIndex + 1}. ${values[0] || "-"}`;

    headers.forEach((_, index) => {
      const column = columns[index];
      const align = index === 0 ? "left" : "right";
      const maxLength = index === 0 ? column.max : 12;

      pdf.setTextColor(...(index === 0 ? BRAND.cream : BRAND.muted));
      pdf.text(safePdfText(fitText(values[index] || "-", maxLength)), column.x, rowY, { align });
    });

    rowY += rowHeight;
  });

  return rowY + 5;
}

function drawNoRows(y) {
  const pdf = currentPdf();
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;

  drawSectionTitle(y, "Report Data");

  pdf.setFillColor(...BRAND.panel);
  pdf.roundedRect(x, y + 8, width, 32, 4, 4, "F");
  pdf.setDrawColor(...BRAND.line);
  pdf.roundedRect(x, y + 8, width, 32, 4, 4);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(
    "No exportable table rows were available in the selected view.",
    x + 7,
    y + 27
  );

  return y + 48;
}

function drawClosingPage({ addContentPage }) {
  const pdf = currentPdf();

  addContentPage();

  pdf.setFillColor(...BRAND.black);
  pdf.rect(0, 35, PAGE.width, PAGE.height - 35, "F");

  drawGoldDivider(94, 48);

  pdf.setFont("times", "normal");
  pdf.setFontSize(22);
  pdf.setTextColor(...BRAND.goldSoft);
  pdf.text("World Cigar Locator", PAGE.width / 2, 116, {
    align: "center"
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...BRAND.cream);
  pdf.text(
    "Global cigar store and lounge intelligence",
    PAGE.width / 2,
    130,
    { align: "center" }
  );

  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND.goldSoft);
  pdf.text("worldcigarlocator.com", PAGE.width / 2, 150, {
    align: "center"
  });
  pdf.text("analytics@worldcigarlocator.com", PAGE.width / 2, 160, {
    align: "center"
  });
}

function drawSectionTitle(y, title) {
  const pdf = currentPdf();

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...BRAND.cream);
  pdf.text(title, PAGE.margin, y);

  pdf.setDrawColor(...BRAND.gold);
  pdf.setLineWidth(0.45);
  pdf.line(PAGE.margin, y + 4, PAGE.margin + 31, y + 4);
}

function drawGoldDivider(y, width = 44) {
  const pdf = currentPdf();
  const center = PAGE.width / 2;

  pdf.setDrawColor(...BRAND.line);
  pdf.setLineWidth(0.25);
  pdf.line(center - width, y, center - 5, y);
  pdf.line(center + 5, y, center + width, y);

  pdf.setFont("times", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(...BRAND.goldSoft);
  pdf.text("*", center, y + 1.5, { align: "center" });
}

function metricCards({
  activeKpi,
  global,
  reportRows,
  state,
  store
}) {
  if (store) {
    return [
      {
        label: "Views",
        value: store.views || "0",
        note: "Selected range"
      },
      {
        label: "Clicks",
        value: store.clicks || "0",
        note: "Website engagement"
      },
      {
        label: "CTR",
        value: store.ctr || "0%",
        note: "Click-through rate"
      }
    ];
  }

  if (activeKpi === "users") {
    return [
      {
        label: "Members",
        value: global.users || "0",
        note: "Known member activity"
      },
      {
        label: "Rows",
        value: reportRows.length,
        note: "Exported from view"
      },
      {
        label: "Focus",
        value: "Members",
        note: "Audience analytics"
      }
    ];
  }

  if (activeKpi === "stores") {
    return [
      {
        label: "Stores",
        value: global.stores || "0",
        note: "Approved public listings"
      },
      {
        label: "Rows",
        value: reportRows.length,
        note: "Exported from view"
      },
      {
        label: "Sort",
        value: state?.sort || "Views",
        note: "Current ranking"
      }
    ];
  }

  return [
    {
      label: "Market",
      value: global.views || "0",
      note: "Demand and visibility"
    },
    {
      label: "Rows",
      value: reportRows.length,
      note: "Exported from view"
    },
    {
      label: "Sort",
      value: state?.sort || activeKpi,
      note: "Current market focus"
    }
  ];
}

function tableHeaders(kpi, rows, store) {
  if (store) {
    return ["Date / Source", "Views", "Clicks", "CTR"];
  }

  if (kpi === "users") {
    return ["Date / Location", "Members"];
  }

  if (kpi === "stores") {
    const maxValues = Math.max(...rows.map((row) => row.values.length), 0);

    if (maxValues >= 8) {
      return ["Store / Lounge", "Views", "Clicks", "CTR", "Fav", "Rating", "Ratings", "Comments"];
    }

    return ["Store / Lounge", "Views", "Clicks", "CTR"];
  }

  return ["Location", "Views", "Clicks", "CTR"];
}

function tableColumns(count, width) {
  const labelWidth = count > 5 ? 70 : 92;
  const restWidth = width - labelWidth;
  const restCount = Math.max(count - 1, 1);
  const columns = [
    {
      x: PAGE.margin + 5,
      max: count > 5 ? 36 : 50
    }
  ];

  for (let index = 1; index < count; index++) {
    columns.push({
      x: PAGE.margin + labelWidth + (restWidth / restCount) * index - 4,
      max: 12
    });
  }

  return columns;
}

function rowsPerPage(y, columnCount) {
  const rowHeight = columnCount > 5 ? 7.2 : 8;
  const available = PAGE.footerY - y - 24;
  return Math.max(Math.floor(available / rowHeight), 8);
}

function normalizeRows(rowNodes, kpi) {
  return [...(rowNodes || [])]
    .map((row) => {
      const cells = [...row.querySelectorAll("td")]
        .map((cell) => cell.textContent.trim().replace(/\s+/g, " "))
        .filter(Boolean);

      if (cells.length < 2) return null;

      const label = cells[0];

      if (/loading|no data|no events|failed/i.test(label)) {
        return null;
      }

      const max = kpi === "stores" && cells.length >= 8 ? 8 : 4;

      return {
        values: cells.slice(0, max)
      };
    })
    .filter(Boolean);
}

function selectChartCanvas(activeKpi, chartCanvas, usersChartCanvas, store) {
  if (store || activeKpi === "stores") {
    return null;
  }

  if (activeKpi === "users") {
    return usersChartCanvas || null;
  }

  return chartCanvas || null;
}

function reportTitle(kpi, store) {
  if (store) {
    return "World Cigar Locator Store Performance Report";
  }

  const titles = {
    users: "World Cigar Locator Member Analytics Report",
    stores: "World Cigar Locator Store Analytics Report",
    views: "World Cigar Locator Market Report",
    clicks: "World Cigar Locator Website Click Report",
    ctr: "World Cigar Locator Engagement Report"
  };

  return titles[kpi] || "World Cigar Locator Analytics Report";
}

function tableTitle(kpi, store) {
  if (store) return "Store Activity";
  if (kpi === "users") return "Member Activity";
  if (kpi === "stores") return "Store / Lounge Performance";
  return "Market Data";
}

function contextLine(kpi, state, generated, store) {
  if (store) {
    return [
      store.name,
      store.city,
      store.country,
      formatDate(generated)
    ].filter(Boolean).join(" / ");
  }

  return [
    selectedView(kpi, state, store),
    state?.country,
    state?.city,
    state?.sort ? `Sorted by ${state.sort}` : null,
    formatDate(generated)
  ].filter(Boolean).join(" / ");
}

function selectedView(kpi, state, store) {
  if (store) return store.name || "Selected store";
  if (kpi === "users") return "Members";
  if (kpi === "stores") return "Top stores";

  const scope = [state?.country, state?.city].filter(Boolean).join(", ");
  return scope ? `Market: ${scope}` : "Market";
}

function normalizeType(store) {
  if (Array.isArray(store?.types)) {
    return store.types.join(", ");
  }

  return store?.type || "-";
}

function canvasToImage(canvas) {
  try {
    if (!canvas || typeof canvas.toDataURL !== "function") return null;
    if (!canvas.width || !canvas.height) return null;
    if (!hasVisibleCanvasContent(canvas)) return null;

    const normalized = document.createElement("canvas");
    normalized.width = 1400;
    normalized.height = 620;

    const ctx = normalized.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#0e0d0c";
    ctx.fillRect(0, 0, normalized.width, normalized.height);

    const padding = 34;
    const sourceRatio = canvas.width / canvas.height;
    const targetWidth = normalized.width - padding * 2;
    const targetHeight = normalized.height - padding * 2;
    const targetRatio = targetWidth / targetHeight;
    let drawWidth = targetWidth;
    let drawHeight = targetHeight;

    if (sourceRatio > targetRatio) {
      drawHeight = drawWidth / sourceRatio;
    } else {
      drawWidth = drawHeight * sourceRatio;
    }

    const x = (normalized.width - drawWidth) / 2;
    const y = (normalized.height - drawHeight) / 2;

    ctx.drawImage(canvas, x, y, drawWidth, drawHeight);

    return normalized.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

function imageFormat(image) {
  if (typeof image !== "string") return "PNG";
  return image.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
}

function hasVisibleCanvasContent(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const width = Math.min(canvas.width, 240);
  const height = Math.min(canvas.height, 140);
  const sample = document.createElement("canvas");
  sample.width = width;
  sample.height = height;

  const sampleCtx = sample.getContext("2d");
  sampleCtx.drawImage(canvas, 0, 0, width, height);

  const data = sampleCtx.getImageData(0, 0, width, height).data;
  let visiblePixels = 0;

  for (let index = 0; index < data.length; index += 32) {
    const alpha = data[index + 3];
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    if (alpha > 8 && (red < 245 || green < 245 || blue < 245)) {
      visiblePixels++;
    }

    if (visiblePixels > 40) {
      return true;
    }
  }

  return false;
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

function currentPdf() {
  return PDF_INSTANCE;
}

function formatDate(value) {
  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function fileName(kpi, store, generated = new Date()) {
  const base = store
    ? `wcl-store-${slug(store.name || "performance")}`
    : `wcl-${slug(kpi || "analytics")}`;

  return `${base}-report-${timestamp(generated)}.pdf`;
}

function fitText(value, maxLength) {
  const text = String(value || "");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}...`;
}

function safePdfText(value) {
  return String(value ?? "-").replace(/[\u0000-\u001F\u007F]/g, " ");
}

function safeAddImage(image, format, x, y, width, height) {
  const pdf = currentPdf();
  const numbers = [x, y, width, height].map(Number);

  if (
    !pdf ||
    typeof image !== "string" ||
    !image.startsWith("data:image/") ||
    numbers.some((number) => !Number.isFinite(number)) ||
    numbers[2] <= 0 ||
    numbers[3] <= 0
  ) {
    return false;
  }

  try {
    pdf.addImage(image, format, numbers[0], numbers[1], numbers[2], numbers[3]);
    return true;
  } catch (error) {
    console.warn("PDF image skipped", error);
    return false;
  }
}

function timestamp(value) {
  const pad = (number) => String(number).padStart(2, "0");

  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate())
  ].join("-") + "-" + [
    pad(value.getHours()),
    pad(value.getMinutes()),
    pad(value.getSeconds())
  ].join("");
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "analytics";
}
