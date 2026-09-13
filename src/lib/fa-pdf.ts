import { jsPDF } from "jspdf";
import { fmt, type FAState, type FAComputed } from "./fa";

// Client Report PDF for the Full Financial Analysis tool — added 9/11 per Karina, after being
// embarrassed mid-client-meeting: "where's the client... the client report isn't built? So I
// wasn't able to generate a client report. And that client report also needs to match the same
// aesthetic that I am describing to you." Same monochrome, light/airy palette and bottom-center
// branding as analyzer-pdf.ts and illustration-pdf.ts (see those files' own palette comments for
// the full history) — one consistent look across every PDF this app generates.

type RGB = [number, number, number];

// 9/11, re-pulled from Karina's actual "Edit Palette" screenshot (5 swatches, sampled pixel-exact
// from the image she sent) rather than colors this file invented — these ARE the real
// generationalplaybook.com neutrals, lightest to darkest. No hue in any of them, matching what she
// showed of the live site back when the monochrome decision was made (see illustration-pdf.ts's
// palette comment for that history) — this just replaces the approximated near-black/gray/sand
// this file was using with the exact confirmed values.
const CREAM: RGB = [250, 248, 245]; // lightest swatch — used for page/box backgrounds, too close to white to use as a chart fill
const PARCHMENT: RGB = [245, 241, 235]; // second swatch
const SAND: RGB = [236, 232, 223]; // third (center) swatch
const CHARCOAL: RGB = [46, 46, 46]; // fourth swatch
const OBSIDIAN: RGB = [28, 28, 28]; // fifth (darkest) swatch
const NEUTRAL_FILL: RGB = CREAM;
// Not one of the 5 confirmed swatches — kept only for small incidental text (disclaimer/footer)
// that was already using a lighter gray than CHARCOAL; the confirmed palette has no true mid-gray.
const GRAY: RGB = [155, 155, 152];

// 9/11 — Karina: "can there be some graphs on this maybe? To show, like, the shortfall and just
// really bring this up to speed and make it a bit more visual... a circle graph, like a pie chart
// with their financial need that is needed." jsPDF has no built-in pie-chart primitive, so each
// slice is drawn as its own filled polygon: the center point, then points sampled along the arc,
// via doc.lines() with closed+fill. Every slice also gets a legend swatch + label + dollar amount
// underneath, since a strictly grayscale pie (this report's established monochrome palette — no
// red/green, see the file header) genuinely can't be told apart by color alone.
//
// 9/11, follow-up — Karina: "the dominant color is black, that does not look good... can we play
// with the color palette I uploaded?" The first version hardcoded "Income replacement" (almost
// always the biggest slice, since it's years-of-income × income) to the darkest color, so the pie
// read as "mostly black" by default. assignPieColors below fixes that structurally: slices are
// ranked by size and colored light-to-dark as they get SMALLER, so the biggest wedge is always the
// lightest tone and black is reserved for slivers, which is also just better pie-chart practice —
// a large area can afford a subtle fill, a thin sliver needs contrast to still read at all.
//
// 9/11, second round — Karina, after seeing the neutral-palette version above: "let's go with
// brighter colors then, maybe that are not within the color palette range... income replacement
// should be green, because that's how much you need, the go-ahead... debt payoff, final expense —
// those could be a different color... currently covered can be green, but coverage gap may be a
// nice tone of red... this kinda looks dull and mundane and isn't striking enough." Explicit
// direction to drop the rank-based neutral assignment above in favor of fixed, semantic, vivid
// colors — scoped to just these two pie charts. Everything else in this report (text, dividers,
// boxes) stays the established neutral palette; this section is the one deliberate exception.
//
// 9/11, third round — Karina, after seeing the green/red/purple/blue version: "those colors are
// too Christmasy... I'm not a fan of the purple... the red and that green gotta go... the blue is
// okay, but it's still a little too corporate — let's find something a little different, like
// maybe a cobalt blue." Dropped literal red/green entirely (that was the "Christmasy" pairing),
// dropped purple, and swapped the flat corporate blue for an actual cobalt. Landed on a
// warm/cool pair that still reads as "good vs. needs attention" without leaning on stoplight
// colors: cobalt blue for the positive/covered side, a warm terracotta for the side that needs
// attention, plus a teal and a gold for the two categories that don't carry a
// good/bad connotation on their own (debt payoff, education funding).
//
// 9/11, fourth round — Karina sent 4 screenshots of colors she'd found (maroon/brick red/cream,
// a sage green swatch labeled "Earthy Tones," a sky blue, and a mustard/coral pin) with "what
// about these colors." Since two of those are a red and a green — the exact pairing she'd just
// said to drop — I checked first whether she wanted them combined anyway given how much more
// muted/earthy these are than the bright versions from round 2; she said yes, combine them.
// Pixel-sampled straight from her screenshots (not approximated) — maroon [110,18,11], brick red
// [177,42,41], sage green [62,109,76], sky blue [83,183,234], mustard [249,218,138]. Skipped the
// cream/ivory strip from the first screenshot (same problem as the original brand cream — too
// close to white to read as a chart fill) and didn't use the coral sliver from the mustard pin,
// since mustard + coral together read closer to the pin's own two-tone accent than a 4th distinct
// category color.
//
// 9/11, fifth round — Karina, after seeing round 4: the coverage-need pie's 4 colors stay
// (mustard/brick red/blue/sage green), but the gap pie should switch FROM blue+maroon TO the same
// red and green already used in the first pie — "not the blue" on this one. Also: "you're using
// the wrong tone of red, I want the same red tone that you used for the debt payoff red to be on
// this other graph" — round 4 used a separate darker maroon for the gap pie instead of reusing
// debt payoff's exact brick red; fixed to reuse the literal same RGB now. And a request to see a
// deeper option for the blue itself (still used for "final expenses" in the first pie, no longer
// used in the second) — this is one option, not a locked-in final answer; can go deeper/lighter
// again if this isn't quite it.
//
// 9/11, sixth round (final) — after the round-5 blue and green went into the pipeline-color
// discussion too (see CLIENT_STAGES in types.ts for that thread), Karina picked a final blue from
// two coolors.co swatches she sent ("Option B," #0096c7) and asked for the green "brightened just
// a touch" — confirmed both, plus sienna staying as Applied's color (not used in this file, see
// types.ts): "all these colors that we just confirmed, go ahead and build them into the charts,
// the pie charts, the pipeline... everywhere." Final expenses' blue and education funding's green
// (which the gap pie's "currently covered" already inherits via GAP_COLOR_COVERED above) both
// updated to match.
//
// 9/12 — Karina: "I feel like that yellow is a little bit too light on the portal on the lead
// list. So I want it a little bit deeper, not too too mustardy, but just just a touch deeper."
// Shown a preview against the current mustard before touching any code; she confirmed "the
// deeper yellow is good." Same hue, lightness/saturation nudged down slightly so it reads as gold
// rather than pale butter, short of tipping into a heavy mustard-brown.
const NEED_COLOR_INCOME: RGB = [245, 205, 102]; // mustard, a touch deeper (#f5cd66) — income replacement
const NEED_COLOR_DEBT: RGB = [177, 42, 41]; // brick red — debt payoff
const NEED_COLOR_FINAL: RGB = [0, 150, 199]; // coolors.co "Option B" (#0096c7) — final expenses
const NEED_COLOR_EDUCATION: RGB = [71, 140, 92]; // sage green, brightened a touch (#478c5c) — education funding

const GAP_COLOR_COVERED: RGB = NEED_COLOR_EDUCATION; // same brightened green as "education funding" — currently covered
const GAP_COLOR_GAP: RGB = NEED_COLOR_DEBT; // same exact brick red as "debt payoff" — coverage gap

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
  // White, not a palette neutral — a thin white gap between wedges stays visible no matter how
  // light or dark the two neighboring fills are (PARCHMENT-next-to-SAND needed this; the old
  // NEUTRAL_FILL/PARCHMENT stroke nearly vanished against its own fill).
  setDraw([255, 255, 255]);
  doc.setLineWidth(1);
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

  // Client info box — PARCHMENT rather than NEUTRAL_FILL/CREAM, so it reads as a subtly distinct
  // box from the score box above rather than the two blending into one another.
  setFill(PARCHMENT);
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

    // Fixed, semantic colors per category (see comment above drawPieChart's color constants) —
    // Karina's explicit ask, replacing the earlier rank-based neutral assignment.
    const needSlices = [
      { label: "Income replacement", value: computed.protection.needIncome, color: NEED_COLOR_INCOME },
      { label: "Debt payoff", value: computed.protection.needDebt, color: NEED_COLOR_DEBT },
      { label: "Final expenses", value: computed.protection.needFinal, color: NEED_COLOR_FINAL },
      { label: "Education funding", value: computed.protection.needEducation, color: NEED_COLOR_EDUCATION },
    ];
    drawPieChart(doc, setFill, setDraw, col1CenterX, pieCy, pieRadius, needSlices);
    const legend1Bottom = pieLegend(doc, setFill, setText, M, chartTop + pieRadius * 2 + 22, needSlices);

    // Sage green = covered, brick red = gap — reusing the exact same colors as "education
    // funding" and "debt payoff" in the pie above, per Karina's explicit round-5 request.
    const gapSlices = [
      { label: "Currently covered", value: Math.min(computed.protection.totalCoverage, computed.protection.totalNeed), color: GAP_COLOR_COVERED },
      { label: "Coverage gap", value: Math.max(0, computed.protection.gap), color: GAP_COLOR_GAP },
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
