import { jsPDF } from "jspdf";
import { fmt, type FAState, type FAComputed } from "./fa";

// Client Report PDF for the Full Financial Analysis tool — added 9/11 per Karina, after being
// embarrassed mid-client-meeting: "where's the client... the client report isn't built? So I
// wasn't able to generate a client report. And that client report also needs to match the same
// aesthetic that I am describing to you." Same monochrome, light/airy palette and bottom-center
// branding as analyzer-pdf.ts and illustration-pdf.ts (see those files' own palette comments for
// the full history) — one consistent look across every PDF this app generates.

type RGB = [number, number, number];

const OBSIDIAN: RGB = [42, 45, 47];
const CHARCOAL: RGB = [78, 81, 83];
const SAND: RGB = [229, 223, 211];
const GRAY: RGB = [155, 155, 152];
const NEUTRAL_FILL: RGB = [244, 241, 235];
// A fourth mid-tone, between SAND and GRAY, purely so a 4-slice pie chart (see drawPieChart below)
// has enough distinguishable shades without reaching outside the existing monochrome palette.
const TAUPE: RGB = [196, 188, 169];

// 9/11 — Karina: "can there be some graphs on this maybe? To show, like, the shortfall and just
// really bring this up to speed and make it a bit more visual... a circle graph, like a pie chart
// with their financial need that is needed." jsPDF has no built-in pie-chart primitive, so each
// slice is drawn as its own filled polygon: the center point, then points sampled along the arc,
// via doc.lines() with closed+fill. Every slice also gets a legend swatch + label + dollar amount
// underneath, since a strictly grayscale pie (this report's established monochrome palette — no
// red/green, see the file header) genuinely can't be told apart by color alone.
function drawPieChart(
  doc: jsPDF,
  setFill: (c: RGB) => void,
  setDraw: (c: RGB) => void,
  cx: number,
  cy: number,
  radius: number,
  slices: { label: string; value: number; color: RGB }[]
) {
  const total = slices.reduce((s, sl) => s + Math.max(0, sl.value), 0);
  if (total <= 0) return;
  setDraw(NEUTRAL_FILL);
  doc.setLineWidth(0.75);
  let startAngle = -Math.PI / 2;
  slices.forEach((slice) => {
    const value = Math.max(0, slice.value);
    if (value <= 0) return;
    const sweep = (value / total) * Math.PI * 2;
    const endAngle = startAngle + sweep;
    const steps = Math.max(1, Math.ceil((sweep / (Math.PI * 2)) * 72));
    const points: [number, number][] = [[cx, cy]];
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + (sweep * s) / steps;
      points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
    const segs: [number, number][] = [];
    for (let j = 1; j < points.length; j++) {
      segs.push([points[j][0] - points[j - 1][0], points[j][1] - points[j - 1][1]]);
    }
    setFill(slice.color);
    doc.lines(segs, points[0][0], points[0][1], [1, 1], "FD", true);
    startAngle = endAngle;
  });
}

function pieLegend(
  doc: jsPDF,
  setFill: (c: RGB) => void,
  setText: (c: RGB) => void,
  x: number,
  yStart: number,
  slices: { label: string; value: number; color: RGB }[]
): number {
  const total = slices.reduce((s, sl) => s + Math.max(0, sl.value), 0);
  let ly = yStart;
  slices.forEach((slice) => {
    if (slice.value <= 0) return;
    setFill(slice.color);
    doc.rect(x, ly - 7, 8, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(CHARCOAL);
    const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
    doc.text(`${slice.label} — ${fmt(slice.value)} (${pct}%)`, x + 13, ly);
    ly += 13;
  });
  return ly;
}

function buildFAReportPDF(state: FAState, computed: FAComputed): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = 612;
  const H = 792;
  const M = 50;
  let y = 0;

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  const ensureRoom = (needed: number) => {
    if (y > H - needed) {
      doc.addPage();
      y = 60;
    }
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(OBSIDIAN);
  doc.text("Financial Needs Analysis — Client Report", M, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  doc.text(state.profile.clientName || "—", W - M, 26, { align: "right" });
  if (state.profile.analysisDate) {
    doc.text(state.profile.analysisDate, W - M, 38, { align: "right" });
  }
  setDraw(OBSIDIAN);
  doc.setLineWidth(1.5);
  doc.line(M, 44, W - M, 44);
  y = 64;

  // Overall score
  setFill(NEUTRAL_FILL);
  doc.roundedRect(M, y, W - 2 * M, 56, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(OBSIDIAN);
  doc.text("Financial Wellness Score", M + 14, y + 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(String(computed.overallScore) + " / 100", W - M - 14, y + 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setText(CHARCOAL);
  doc.text("Blended across seven pillars: Cash Flow, Debt, Protection, Liquidity, Retirement, Education, Estate.", M + 14, y + 42);
  y += 76;

  // Client info box
  setFill(NEUTRAL_FILL);
  doc.roundedRect(M, y, W - 2 * M, 60, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(OBSIDIAN);
  doc.text(state.profile.clientName || "—", M + 14, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  const infoLine1 = [
    state.profile.spouseName ? "Spouse: " + state.profile.spouseName : "",
    state.profile.dependents ? state.profile.dependents + " dependent(s)" : "",
    state.profile.location ? state.profile.location : "",
  ]
    .filter(Boolean)
    .join("   ·   ");
  if (infoLine1) doc.text(infoLine1, M + 14, y + 36);
  if (state.advisor.advisorName) {
    doc.text(
      "Prepared by " + state.advisor.advisorName + [state.advisor.advisorPhone, state.advisor.advisorEmail].filter(Boolean).map((s) => "  ·  " + s).join(""),
      M + 14,
      y + 50
    );
  }
  y += 80;

  function sectionTitle(title: string, score?: number) {
    ensureRoom(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setText(OBSIDIAN);
    doc.text(title, M, y);
    if (score !== undefined) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      doc.text("Pillar Score: " + score + " / 100", W - M, y, { align: "right" });
    }
    y += 6;
    setDraw(SAND);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += 16;
  }

  function row(label: string, value: string) {
    ensureRoom(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    doc.text(label, M, y);
    doc.setFont("helvetica", "bold");
    setText(OBSIDIAN);
    doc.text(value, W - M, y, { align: "right" });
    y += 14;
  }

  // Financial Need at a Glance — two pie charts built from the Protection pillar's numbers
  // (detailed further down in III · Protection): what the total coverage need is made up of, and
  // how much of that need is currently covered vs. still a gap. Skipped entirely if no coverage
  // need has been entered yet, rather than drawing an empty chart.
  if (computed.protection.totalNeed > 0) {
    sectionTitle("Financial Need at a Glance");
    ensureRoom(170);
    const chartTop = y;
    const col1CenterX = M + 95;
    const col2CenterX = M + 340;
    const pieRadius = 44;
    const pieCy = chartTop + pieRadius + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(OBSIDIAN);
    doc.text("What the Coverage Need Is Made Of", M, chartTop);
    doc.text("Coverage Need vs. What's Covered", M + 245, chartTop);

    const needSlices: { label: string; value: number; color: RGB }[] = [
      { label: "Income replacement", value: computed.protection.needIncome, color: OBSIDIAN },
      { label: "Debt payoff", value: computed.protection.needDebt, color: CHARCOAL },
      { label: "Final expenses", value: computed.protection.needFinal, color: GRAY },
      { label: "Education funding", value: computed.protection.needEducation, color: TAUPE },
    ];
    drawPieChart(doc, setFill, setDraw, col1CenterX, pieCy, pieRadius, needSlices);
    const legend1Bottom = pieLegend(doc, setFill, setText, M, chartTop + pieRadius * 2 + 22, needSlices);

    const gapSlices: { label: string; value: number; color: RGB }[] = [
      { label: "Currently covered", value: Math.min(computed.protection.totalCoverage, computed.protection.totalNeed), color: TAUPE },
      { label: "Coverage gap", value: Math.max(0, computed.protection.gap), color: OBSIDIAN },
    ];
    drawPieChart(doc, setFill, setDraw, col2CenterX, pieCy, pieRadius, gapSlices);
    const legend2Bottom = pieLegend(doc, setFill, setText, M + 245, chartTop + pieRadius * 2 + 22, gapSlices);

    y = Math.max(legend1Bottom, legend2Bottom) + 12;
  }

  // Goals
  sectionTitle("Goals & Dreams");
  const goalsBlock = (label: string, text: string) => {
    if (!text.trim()) return;
    ensureRoom(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(OBSIDIAN);
    doc.text(label, M, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setText(CHARCOAL);
    const lines = doc.splitTextToSize(text, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 11 + 10;
  };
  goalsBlock("Short Term (1-3 Years)", state.goals.goalsShort);
  goalsBlock("Mid-Term (3-7 Years)", state.goals.goalsMedium);
  goalsBlock("Long Term (7+ Years)", state.goals.goalsLong);
  if (!state.goals.goalsShort.trim() && !state.goals.goalsMedium.trim() && !state.goals.goalsLong.trim()) {
    row("Goals captured", "None yet");
  }
  y += 6;

  // Cash Flow
  sectionTitle("I · Cash Flow", computed.cashflow.pillarScore);
  row("Total monthly income", fmt(computed.cashflow.totalIncome));
  row("Essential expenses", fmt(computed.cashflow.essential));
  row("Discretionary spending", fmt(computed.cashflow.discSpend));
  row("Monthly savings contribution", fmt(computed.cashflow.savingsContrib));
  row("Savings rate", computed.cashflow.savingsRate.toFixed(1) + "%");
  row(computed.cashflow.negative ? "Monthly shortfall" : "Monthly surplus", fmt(Math.abs(computed.cashflow.discretionaryIncome)));
  y += 10;

  // Net Worth
  sectionTitle("Net Worth");
  row("Total assets", fmt(computed.networth.totalAssets));
  row("Total liabilities", fmt(computed.networth.totalLiabilities));
  row("Net worth", fmt(computed.networth.netWorth));
  y += 10;

  // Debt
  sectionTitle("II · Debt", computed.debt.pillarScore);
  row("Total debt balance", fmt(computed.debt.totalBalance));
  row("Total monthly debt payments", fmt(computed.debt.totalPayment) + " / mo");
  row("Debt-to-income ratio", computed.debt.dti.toFixed(1) + "%");
  row("Consumer (high-cost) debt", fmt(computed.debt.badDebt));
  y += 10;

  // Protection
  sectionTitle("III · Protection", computed.protection.pillarScore);
  row("Total current coverage", fmt(computed.protection.totalCoverage));
  row("Total coverage need", fmt(computed.protection.totalNeed));
  row(computed.protection.gap > 0 ? "Coverage gap" : "Coverage surplus", fmt(Math.abs(computed.protection.gap)));
  computed.protection.warnings.forEach((w) => {
    ensureRoom(20);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    setText(CHARCOAL);
    const wl = doc.splitTextToSize("— " + w, W - 2 * M - 14);
    doc.text(wl, M + 10, y);
    y += wl.length * 10 + 2;
  });
  y += 8;

  // Liquidity
  sectionTitle("IV · Liquidity", computed.liquidity.pillarScore);
  row("Current liquid savings", fmt(state.liquidity.currentLiquidSavings));
  row("Target reserve (" + state.liquidity.targetMonths + " months)", fmt(computed.liquidity.targetReserve));
  row(computed.liquidity.gap > 0 ? "Reserve gap" : "Reserve surplus", fmt(Math.abs(computed.liquidity.gap)));
  y += 10;

  // Retirement
  sectionTitle("V · Retirement", computed.retirement.pillarScore);
  row("Current retirement assets", fmt(state.retirement.currentRetirementAssets));
  row("Years to retirement", computed.retirement.yearsToRetirement !== null ? String(computed.retirement.yearsToRetirement) : "—");
  row("Capital needed (4% rule)", fmt(computed.retirement.capitalNeeded));
  row("Projected assets at retirement", fmt(computed.retirement.projectedAssetsAtRetirement));
  row(computed.retirement.shortfall > 0 ? "Projected shortfall" : "Projected surplus", fmt(Math.abs(computed.retirement.shortfall)));
  ensureRoom(24);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  setText(GRAY);
  doc.text("Projection compounds the current balance only — does not assume future contributions.", M, y);
  y += 18;

  // Education
  sectionTitle("Education", computed.education.pillarScore);
  row("Current education savings", fmt(state.education.currentEducationSavings));
  row("Total projected cost", fmt(computed.education.totalCost));
  row(computed.education.gap > 0 ? "Funding gap" : "Fully funded", fmt(Math.abs(computed.education.gap)));
  y += 10;

  // Estate
  sectionTitle("VI · Estate", computed.estate.pillarScore);
  row("Marital status", computed.estate.married ? "Married" : "Single");
  row("Net worth", fmt(computed.estate.taxableEstate));
  row("Federal exemption (2026)", fmt(computed.estate.applicableExemption));
  row("Federal estate tax exposure", computed.estate.exposure > 0 ? fmt(computed.estate.exposure) : "None");
  row("Will on file", state.estate.hasWill === "yes" ? "Yes" : state.estate.hasWill === "unsure" ? "Unsure" : "No");
  row("Trust on file", state.estate.hasTrust === "yes" ? "Yes" : state.estate.hasTrust === "unsure" ? "Unsure" : "No");
  row(
    "Beneficiaries up to date",
    state.estate.beneficiariesUpdated === "yes" ? "Yes" : state.estate.beneficiariesUpdated === "unsure" ? "Unsure" : "No"
  );
  ensureRoom(24);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  setText(GRAY);
  const estateCaveat = doc.splitTextToSize(
    "Federal threshold only — state estate/inheritance taxes vary widely and are not reflected here. Confirm this household's specific state rules with an estate attorney/CPA.",
    W - 2 * M
  );
  doc.text(estateCaveat, M, y);
  y += estateCaveat.length * 10 + 10;

  // Action Plan
  sectionTitle("Action Plan");
  if (computed.actionPlan.length === 0) {
    row("Status", "No gaps flagged");
  } else {
    computed.actionPlan.forEach((item) => {
      ensureRoom(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setText(OBSIDIAN);
      doc.text(item.pillar + ":", M, y);
      doc.setFont("helvetica", "normal");
      setText(CHARCOAL);
      const il = doc.splitTextToSize(item.message, W - 2 * M - 80);
      doc.text(il, M + 80, y);
      y += Math.max(il.length * 11, 13) + 4;
    });
  }

  // Disclaimer + per-page footer, bottom center — same pattern as analyzer-pdf.ts /
  // illustration-pdf.ts (see those files' own comments for the full history).
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  setText(GRAY);
  doc.text(
    "For discussion purposes only. Figures and projections are estimates based on the assumptions entered by the advisor and are not guaranteed. Consult a qualified tax, legal, or financial professional before acting on any recommendation in this report.",
    M,
    Math.max(H - 34, y + 14),
    { maxWidth: W - 2 * M }
  );

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setText(OBSIDIAN);
    doc.text("GENERATIONAL PLAYBOOK", W / 2, H - 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(GRAY);
    doc.text("GenerationalPlaybook.com", W / 2, H - 4, { align: "center" });
  }

  return doc;
}

export function generateFAReportPDF(state: FAState, computed: FAComputed) {
  const doc = buildFAReportPDF(state, computed);
  const filename = "Financial_Analysis_" + (state.profile.clientName || "Client").replace(/\s+/g, "_") + ".pdf";
  doc.save(filename);
}

export function viewFAReportPDF(state: FAState, computed: FAComputed) {
  const doc = buildFAReportPDF(state, computed);
  const url = doc.output("bloburl");
  window.open(url.toString(), "_blank");
}
