import { jsPDF } from "jspdf";
import type { IllustrationData } from "./illustration";
import { parseMoney, formatMoney } from "./illustration";

type RGB = [number, number, number];

export interface AdvisorInfo {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface IllustrationPdfInput {
  clientName: string;
  productName: string;
  carrier: string | null;
  productType: string | null;
  data: IllustrationData;
  advisor?: AdvisorInfo;
}

// Palette gone fully monochrome 9/7, fifth round. Karina noticed the previous round ("Not yet
// done — the header rule color" below, now resolved) still left GREEN/BLUE/GOLD doing exactly the
// thing that round had just fixed for the header: colors this document invented that aren't
// actually part of the real generationalplaybook.com brand (her screenshot showed a strictly
// neutral site — cream/off-white and near-black, no hue at all). She asked to talk it through
// before any more building: I explained GREEN/BLUE/GOLD weren't decorative, they were functional
// — letting a client tell Cash Value numbers apart from Death Benefit numbers at a glance across
// the tables and charts — but agreed that's still an invented color, just for a different reason.
// Asked her to choose between keeping that functional color-coding, going fully monochrome (data
// series told apart by weight/line-style/section-header instead of hue), or one muted accent used
// sparingly. She chose fully monochrome.
//
// So GREEN, BLUE, GOLD, LIGHT_GREEN, and LIGHT_BLUE are retired. Every box, chart, and section
// label in this file now draws from the same four neutrals below. Where two data series used to
// be told apart by color within the SAME chart or box pair (Non-Guaranteed vs. Guaranteed, Level
// vs. Increasing, Accumulation Value vs. Income Value), they're now told apart by OBSIDIAN-solid
// vs. GRAY-dashed instead — the dash pattern was already doing part of that job for the
// Guaranteed/Increasing lines; the Accumulation/Income annuity chart didn't have a dash difference
// before (it relied entirely on GOLD vs. BLUE), so that one call site adds `dashed: true` to Income
// Value now that it can't lean on color. NEUTRAL_FILL replaces every box's tinted fill (the old
// green/blue/gold-tinted rounded rects) with one light cream fill sampled from Karina's screenshot
// — every box now reads as the same "highlighted number" treatment regardless of what it's about.
const OBSIDIAN: RGB = [42, 45, 47]; // primary text/headings, emphasized numbers, solid data lines — matches the site's near-black
const CHARCOAL: RGB = [78, 81, 83]; // body/secondary text, italic caveats
const SAND: RGB = [229, 223, 211]; // hairline rules, muted borders — matches the site's beige swatch
const GRAY: RGB = [155, 155, 152]; // de-emphasized labels, and now also the secondary/dashed line in any two-series chart or box pair
const NEUTRAL_FILL: RGB = [244, 241, 235]; // light cream box fill — sampled from the site's own "Colors" screenshot, replaces every green/blue/gold-tinted box

function formatShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 0) + "K";
  return String(Math.round(n));
}

function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const normalized = n / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function drawLegend(doc: jsPDF, x: number, y: number, items: { label: string; color: RGB; dashed?: boolean }[]) {
  let lx = x;
  doc.setFontSize(7.5);
  items.forEach((item) => {
    doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
    doc.setLineWidth(2);
    if (item.dashed) doc.setLineDashPattern([2, 1.5], 0);
    doc.line(lx, y, lx + 12, y);
    doc.setLineDashPattern([], 0);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, lx + 16, y + 2.5);
    lx += 16 + doc.getTextWidth(item.label) + 14;
  });
}

function drawLineChart(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    series: { values: number[]; color: RGB; dashed?: boolean }[];
    xLabels: string[];
  }
) {
  const { x, y, width, height, series, xLabels } = opts;
  const padLeft = 38;
  const padBottom = 14;
  const padTop = 4;
  const plotW = width - padLeft;
  const plotH = height - padBottom - padTop;
  const plotX = x + padLeft;
  const plotY = y + padTop;

  const allValues = series.flatMap((s) => s.values);
  const niceMax = niceCeil(Math.max(1, ...allValues));
  const steps = 4;

  doc.setLineWidth(0.4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  for (let i = 0; i <= steps; i++) {
    const v = (niceMax / steps) * i;
    const ly = plotY + plotH - (v / niceMax) * plotH;
    doc.setDrawColor(232, 227, 217);
    doc.line(plotX, ly, plotX + plotW, ly);
    doc.setTextColor(150, 150, 150);
    doc.text("$" + formatShort(v), plotX - 3, ly + 2, { align: "right" });
  }

  const n = xLabels.length;
  const stepX = n > 1 ? plotW / (n - 1) : 0;

  series.forEach((s) => {
    doc.setDrawColor(s.color[0], s.color[1], s.color[2]);
    doc.setLineWidth(1.4);
    if (s.dashed) doc.setLineDashPattern([2.5, 1.5], 0);
    for (let i = 0; i < s.values.length - 1; i++) {
      const x1 = plotX + stepX * i;
      const y1 = plotY + plotH - (s.values[i] / niceMax) * plotH;
      const x2 = plotX + stepX * (i + 1);
      const y2 = plotY + plotH - (s.values[i + 1] / niceMax) * plotH;
      doc.line(x1, y1, x2, y2);
    }
    doc.setLineDashPattern([], 0);
    doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    s.values.forEach((v, i) => {
      const px = plotX + stepX * i;
      const py = plotY + plotH - (v / niceMax) * plotH;
      doc.circle(px, py, 1.3, "F");
    });
  });

  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  xLabels.forEach((lbl, i) => {
    const px = plotX + stepX * i;
    doc.text(lbl, px, plotY + plotH + 9, { align: "center", maxWidth: stepX || width });
  });

  doc.setDrawColor(200, 190, 170);
  doc.setLineWidth(0.7);
  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
}

// `action` (Karina, 9/5): "download" saves the PDF to disk as before; "view" opens the same PDF
// in a new browser tab (the browser's built-in PDF viewer) instead — for a quick glance without
// forcing a file onto disk every time. Defaults to "download" so every existing caller is
// unaffected unless it opts in.
export function generateIllustrationPDF(input: IllustrationPdfInput, action: "download" | "view" = "download") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = 612;
  const M = 50;
  let y = 0;

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  // Page-break-aware layout — added 9/7 per Karina: "dont try to cram everyrhing on one page if
  // it doesnt fit." Before this, the ONLY page-break check in this generator ran once at the very
  // end (see the comment further down, near the advisor/disclaimer block), so nothing mid-page
  // ever stopped a chart, box, or table from starting near the bottom and running off the physical
  // page edge — which is exactly what happened once the Death Benefit Milestones boxes (added
  // earlier the same day) pushed a typical cash_value scenario tall enough to clip the Death
  // Benefit Over Time chart. ensureSpace(needed) is called right before each block whose height is
  // knowable ahead of drawing it (boxes, tables, charts) — if it wouldn't fit in what's left on the
  // current page, it starts a fresh page for that whole block instead of letting it spill across
  // the boundary and get cut off.
  const PAGE_MAX_Y = 770;
  function ensureSpace(needed: number) {
    if (y + needed > PAGE_MAX_Y) {
      doc.addPage();
      y = 60;
    }
  }

  // Header — reworked again 9/7 per Karina, same day: "heading the product name can be much
  // smaller... so that can move everything up higher... does it have to be in a block? Can we
  // just put it on the right side in the header?" Product name is back down to 13pt (smaller than
  // even the original 14pt — it's the wordmark/subtitle stack's third line now, not the headline),
  // and the separate cream client-info box is gone entirely: client name and product type/carrier
  // now sit inline in the header, right-aligned opposite the wordmark. This is shorter than the
  // old header+box combined (which ran to y=104 before any content started), so everything below
  // starts noticeably higher on the page.
  // Wordmark + subtitle recolored 9/7, fourth round, per Karina: "Generational playbook should be
  // in black and the text udner it should be darker but not black just a bit darker to its easier
  // to read." Wordmark is OBSIDIAN (was WARM/sage-green — she doesn't want the brand name itself
  // colored). Subtitle reuses CHARCOAL (already defined, dark gray rather than true black) instead
  // of GRAY — GRAY stays reserved for genuinely secondary text (placeholders, footer disclaimer)
  // elsewhere in this file, so this doesn't darken those too.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(OBSIDIAN);
  doc.text("GENERATIONAL PLAYBOOK", M, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(CHARCOAL);
  doc.text("Policy Illustration Summary", M, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(OBSIDIAN);
  doc.text(input.productName, M, 52);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(OBSIDIAN);
  doc.text(input.clientName, W - M, 26, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  doc.text(
    [input.productType, input.carrier].filter(Boolean).join("  ·  ") || "—",
    W - M,
    40,
    { align: "right" }
  );

  doc.setDrawColor(OBSIDIAN[0], OBSIDIAN[1], OBSIDIAN[2]);
  doc.setLineWidth(1.5);
  doc.line(M, 62, W - M, 62);
  y = 82;

  const data = input.data;

  if (data.kind === "cash_value") {
    const milestones = data.milestones.filter((m) => m.label.trim());
    if (milestones.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      setText(GRAY);
      doc.text("No milestones entered yet.", M, y);
      y += 20;
    } else {
      // Table — same page-break reasoning as generateScenarioIllustrationPDF's identical check.
      ensureSpace(20 + 14 + milestones.length * 16 + 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      const colX = [M, M + 105, M + 220, M + 335, M + 450];
      const headers = ["", "Cash Value\n(Guaranteed)", "Cash Value\n(Non-Guar.)", "Death Benefit\n(Guaranteed)", "Death Benefit\n(Non-Guar.)"];
      headers.forEach((h, i) => doc.text(h, colX[i], y, { maxWidth: 110 }));
      y += 20;
      doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
      doc.setLineWidth(1);
      doc.line(M, y, W - M, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      milestones.forEach((m) => {
        setText(OBSIDIAN);
        doc.setFont("helvetica", "bold");
        doc.text(m.label, colX[0], y);
        doc.setFont("helvetica", "normal");
        setText(CHARCOAL);
        doc.text(m.cvGuaranteed ? "$" + formatMoney(m.cvGuaranteed) : "—", colX[1], y);
        doc.text(m.cvNonGuaranteed ? "$" + formatMoney(m.cvNonGuaranteed) : "—", colX[2], y);
        doc.text(m.dbGuaranteed ? "$" + formatMoney(m.dbGuaranteed) : "—", colX[3], y);
        doc.text(m.dbNonGuaranteed ? "$" + formatMoney(m.dbNonGuaranteed) : "—", colX[4], y);
        y += 16;
      });
      // 26, not 14 — Karina, 9/7: "the cash value over time, I feel like there needs to be a
      // little bit more space, so it's pushed down." Same treatment for the Death Benefit chart's
      // own lead-in below.
      y += 26;

      const xLabels = milestones.map((m) => m.label);

      // Cash value chart — same page-break reasoning as generateScenarioIllustrationPDF's charts.
      ensureSpace(146);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("CASH VALUE OVER TIME", M, y);
      y += 4;
      drawLegend(doc, M + 150, y - 2.5, [
        { label: "Non-Guaranteed", color: OBSIDIAN },
        { label: "Guaranteed", color: GRAY, dashed: true },
      ]);
      y += 12;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 110,
        xLabels,
        series: [
          { values: milestones.map((m) => parseMoney(m.cvNonGuaranteed)), color: OBSIDIAN },
          { values: milestones.map((m) => parseMoney(m.cvGuaranteed)), color: GRAY, dashed: true },
        ],
      });
      // 142, not 130 — same "pushed down" request as the Cash Value chart's lead-in above, applied
      // to the Death Benefit chart too.
      y += 142;

      // Death benefit chart — same page-break reasoning as the Cash Value chart's check above.
      ensureSpace(146);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("DEATH BENEFIT OVER TIME", M, y);
      y += 4;
      drawLegend(doc, M + 165, y - 2.5, [
        { label: "Non-Guaranteed", color: OBSIDIAN },
        { label: "Guaranteed", color: GRAY, dashed: true },
      ]);
      y += 12;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 110,
        xLabels,
        series: [
          { values: milestones.map((m) => parseMoney(m.dbNonGuaranteed)), color: OBSIDIAN },
          { values: milestones.map((m) => parseMoney(m.dbGuaranteed)), color: GRAY, dashed: true },
        ],
      });
      y += 130;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      ensureSpace(nl.length * 12 + 10);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else if (data.kind === "term") {
    setFill(NEUTRAL_FILL);
    doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    setText(OBSIDIAN);
    doc.text(data.deathBenefit ? "$" + formatMoney(data.deathBenefit) : "—", M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    doc.text("Death Benefit", M + 14, y + 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(OBSIDIAN);
    if (data.termLength) doc.text(data.termLength + " term", M + 280, y + 26);
    if (data.levelPremium) doc.text("$" + formatMoney(data.levelPremium) + " level premium", M + 280, y + 44);
    if (data.conversionDeadline) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(CHARCOAL);
      doc.text("Convertible without exam until " + data.conversionDeadline, M + 280, y + 60);
    }
    y += 96;

    if (data.riders.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("LIVING BENEFITS & RIDERS INCLUDED", M, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      data.riders.forEach((r) => {
        doc.text("— " + r, M, y);
        y += 14;
      });
      y += 8;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      ensureSpace(nl.length * 12 + 10);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else if (data.kind === "final_expense") {
    setFill(NEUTRAL_FILL);
    doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    setText(OBSIDIAN);
    doc.text(data.deathBenefit ? "$" + formatMoney(data.deathBenefit) : "—", M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    doc.text("Guaranteed Death Benefit", M + 14, y + 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(OBSIDIAN);
    if (data.levelPremium) doc.text("$" + formatMoney(data.levelPremium) + " — guaranteed level for life", M + 280, y + 26);
    y += 96;

    if (data.riders.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("LIVING BENEFITS & RIDERS INCLUDED", M, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      data.riders.forEach((r) => {
        doc.text("— " + r, M, y);
        y += 14;
      });
      y += 8;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      ensureSpace(nl.length * 12 + 10);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else {
    // annuity
    if (data.initialPremium) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(OBSIDIAN);
      doc.text("Initial Premium: $" + formatMoney(data.initialPremium), M, y);
      y += 22;
    }

    const milestones = data.milestones.filter((m) => m.label.trim());
    if (milestones.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      setText(GRAY);
      doc.text("No milestones entered yet.", M, y);
      y += 20;
    } else {
      // Table + chart together: header/rule/rows (16 + 14 + rows*16 + 14) plus the chart block
      // itself (~156, same reasoning as the cash_value charts elsewhere in this file but this
      // one's 120pt tall instead of 110). Checked as one combined block since an annuity scenario
      // is rarely long enough to need a break between its table and its single chart.
      ensureSpace(16 + 14 + milestones.length * 16 + 14 + 156);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      const colX = [M, M + 140, M + 290, M + 430];
      const headers = ["", "Accumulation Value", "Income Value", "Death Benefit"];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 16;
      doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
      doc.setLineWidth(1);
      doc.line(M, y, W - M, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      milestones.forEach((m) => {
        setText(OBSIDIAN);
        doc.setFont("helvetica", "bold");
        doc.text(m.label, colX[0], y);
        doc.setFont("helvetica", "normal");
        setText(CHARCOAL);
        doc.text(m.accumulationValue ? "$" + formatMoney(m.accumulationValue) : "—", colX[1], y);
        doc.text(m.incomeValue ? "$" + formatMoney(m.incomeValue) : "—", colX[2], y);
        doc.text(m.deathBenefit ? "$" + formatMoney(m.deathBenefit) : "—", colX[3], y);
        y += 16;
      });
      y += 14;

      const xLabels = milestones.map((m) => m.label);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("PROJECTED VALUE OVER TIME", M, y);
      y += 4;
      drawLegend(doc, M + 175, y - 2.5, [
        { label: "Accumulation Value", color: OBSIDIAN },
        { label: "Income Value", color: GRAY, dashed: true },
      ]);
      y += 12;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 120,
        xLabels,
        series: [
          { values: milestones.map((m) => parseMoney(m.accumulationValue)), color: OBSIDIAN },
          { values: milestones.map((m) => parseMoney(m.incomeValue)), color: GRAY, dashed: true },
        ],
      });
      y += 140;
    }

    // Income rider — added 9/6 per Karina. Only shown when the annuity has one checked.
    if (data.hasIncomeRider) {
      // Conservative estimate (header + amount line + the wrapped tax-treatment note, which runs
      // ~4-5 lines at this width/size) — same reasoning as the Policy Premium check above.
      ensureSpace(120);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("Income Rider", M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const timing =
        data.incomeStartTiming === "deferred"
          ? "Starts at age " + (data.incomeStartAge || "—")
          : "Starts immediately";
      const amount = data.incomeMonthlyAmount ? "$" + formatMoney(data.incomeMonthlyAmount) + "/mo" : "amount not entered";
      doc.text(timing + " — " + amount, M, y);
      y += 16;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setText(CHARCOAL);
      const incomeNote = doc.splitTextToSize(
        "Whatever accumulation value is left unused when the client passes goes to the beneficiary as a death benefit — but unlike a life insurance death benefit, this isn't automatically fully tax-free. Only the return of principal passes tax-free; any growth above that is taxed to the beneficiary as ordinary income (a qualified/IRA annuity is generally taxed in full). Confirm the specifics on the carrier's illustration and with a tax advisor for the client's situation.",
        W - 2 * M
      );
      doc.text(incomeNote, M, y);
      y += incomeNote.length * 10 + 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      ensureSpace(nl.length * 12 + 10);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  }

  if (input.advisor && (input.advisor.name || input.advisor.phone || input.advisor.email)) {
    doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(OBSIDIAN);
    doc.text("Prepared by", M, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    const advisorLine = [input.advisor.name, input.advisor.phone, input.advisor.email].filter(Boolean).join("   ·   ");
    doc.text(advisorLine, M, y);
    y += 16;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  setText(GRAY);
  doc.text(
    "For agent use only. Figures shown are illustrative, entered by the advisor from the carrier's own policy illustration — not a formal projection. Non-guaranteed values are based on current assumptions and are not guaranteed to occur. See the full carrier illustration for complete terms.",
    M,
    770,
    { maxWidth: 612 - 2 * M }
  );

  // Site URL moved out of the header and into a page footer — Karina, 9/7: "the generational
  // playbook dot com that is right next to policy illustration summary should move to the bottom
  // of each page in the center, like, as a footer." Looped across every page (not just the last,
  // where the disclaimer above lands) since a multi-page illustration should carry it on each one.
  // Placed at y=787, just below the disclaimer's lowest possible line on the last page (baseline
  // 770 plus one wrapped line at this font size lands around 778-780), well inside the 792pt page.
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(GRAY);
    doc.text("GenerationalPlaybook.com", W / 2, 787, { align: "center" });
  }

  if (action === "view") {
    window.open(doc.output("bloburl"), "_blank");
    return;
  }
  const filename = "Illustration_" + input.clientName.replace(/\s+/g, "_") + "_" + input.productName.replace(/\s+/g, "_") + ".pdf";
  doc.save(filename);
}

// Duplicated from generateIllustrationPDF above rather than shared — same pattern used throughout
// this app (see CashValueMilestonesEditor duplication note in ScenarioForm.tsx) so the original,
// already-working per-product Illustration Summary PDF can never be affected by scenario-specific
// changes. Only the cash_value layout actually differs (Age/Cash Value/Death Benefit, one number
// each, plus an optional "death benefit increases at age X" callout) — term/final_expense/annuity
// are identical to the original. Used only by the Illustration Scenarios editor.
export function generateScenarioIllustrationPDF(input: IllustrationPdfInput, action: "download" | "view" = "download") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = 612;
  const M = 50;
  let y = 0;

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  // Page-break-aware layout — added 9/7 per Karina: "dont try to cram everyrhing on one page if
  // it doesnt fit." Before this, the ONLY page-break check in this generator ran once at the very
  // end (see the comment further down, near the advisor/disclaimer block), so nothing mid-page
  // ever stopped a chart, box, or table from starting near the bottom and running off the physical
  // page edge — which is exactly what happened once the Death Benefit Milestones boxes (added
  // earlier the same day) pushed a typical cash_value scenario tall enough to clip the Death
  // Benefit Over Time chart. ensureSpace(needed) is called right before each block whose height is
  // knowable ahead of drawing it (boxes, tables, charts) — if it wouldn't fit in what's left on the
  // current page, it starts a fresh page for that whole block instead of letting it spill across
  // the boundary and get cut off.
  const PAGE_MAX_Y = 770;
  function ensureSpace(needed: number) {
    if (y + needed > PAGE_MAX_Y) {
      doc.addPage();
      y = 60;
    }
  }

  // Header — reworked again 9/7 per Karina, same day: "heading the product name can be much
  // smaller... so that can move everything up higher... does it have to be in a block? Can we
  // just put it on the right side in the header?" Product name is back down to 13pt (smaller than
  // even the original 14pt — it's the wordmark/subtitle stack's third line now, not the headline),
  // and the separate cream client-info box is gone entirely: client name and product type/carrier
  // now sit inline in the header, right-aligned opposite the wordmark. This is shorter than the
  // old header+box combined (which ran to y=104 before any content started), so everything below
  // starts noticeably higher on the page.
  // Wordmark + subtitle recolored 9/7, fourth round, per Karina: "Generational playbook should be
  // in black and the text udner it should be darker but not black just a bit darker to its easier
  // to read." Wordmark is OBSIDIAN (was WARM/sage-green — she doesn't want the brand name itself
  // colored). Subtitle reuses CHARCOAL (already defined, dark gray rather than true black) instead
  // of GRAY — GRAY stays reserved for genuinely secondary text (placeholders, footer disclaimer)
  // elsewhere in this file, so this doesn't darken those too.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(OBSIDIAN);
  doc.text("GENERATIONAL PLAYBOOK", M, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(CHARCOAL);
  doc.text("Policy Illustration Summary", M, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(OBSIDIAN);
  doc.text(input.productName, M, 52);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(OBSIDIAN);
  doc.text(input.clientName, W - M, 26, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  doc.text(
    [input.productType, input.carrier].filter(Boolean).join("  ·  ") || "—",
    W - M,
    40,
    { align: "right" }
  );

  doc.setDrawColor(OBSIDIAN[0], OBSIDIAN[1], OBSIDIAN[2]);
  doc.setLineWidth(1.5);
  doc.line(M, 62, W - M, 62);
  y = 82;

  const data = input.data;

  if (data.kind === "cash_value") {
    const hasMonthlyPremium = !!(data.monthlyPremium && data.monthlyPremium.trim());
    const hasMinimumPremiumLevel = !!(data.minimumPremium && data.minimumPremium.trim());
    const hasMinimumPremiumIncreasing = !!(data.minimumPremiumIncreasing && data.minimumPremiumIncreasing.trim());
    if (hasMonthlyPremium || hasMinimumPremiumLevel || hasMinimumPremiumIncreasing) {
      // Rough upper-bound estimate (header + up to 3 dollar lines + the wrapped Increasing note +
      // trailing gap) — doesn't need to be exact like the boxes/table/chart checks below, just
      // enough to keep this whole block from starting so close to the bottom that it'd split.
      ensureSpace(140);
      // Recolored 9/7, fourth round, per Karina: "the polciy premium should be black and bold" —
      // was GRAY (already bold). Matches the DEATH BENEFIT MILESTONES label below for consistency.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      doc.text("POLICY PREMIUM", M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      setText(OBSIDIAN);
      if (hasMonthlyPremium) {
        doc.text("Monthly Premium: $" + formatMoney(data.monthlyPremium) + "/mo", M, y);
        y += 14;
      }
      // Minimum to avoid lapse varies by election (cost of insurance differs between Level and
      // Increasing) — label each line with its election whenever at least one side is filled in,
      // same two-part convention as everywhere else in this rework, so the number is never
      // ambiguous about which election it belongs to.
      if (hasMinimumPremiumLevel) {
        doc.text("Minimum to Avoid Lapse (Level): $" + formatMoney(data.minimumPremium) + "/mo", M, y);
        y += 14;
      }
      if (hasMinimumPremiumIncreasing) {
        doc.text(
          "Minimum to Avoid Lapse (Increasing): $" + formatMoney(data.minimumPremiumIncreasing) + "/mo",
          M,
          y
        );
        y += 14;
        // Karina, 9/5: asked whether this minimum actually climbs over time under Increasing —
        // researched (Option A/Level's net amount at risk shrinks as cash value grows, so its
        // cost of insurance can be partly offset; Option B/Increasing's net amount at risk stays
        // at the full face amount for life, and COI rates also rise with attained age regardless
        // of election, so the two compound and this minimum typically keeps climbing).
        // Karina, 9/6: asked us to re-verify this before trusting it — re-researched against
        // additional independent sources (confirmed the mechanism), then asked to soften the
        // Level side of the wording since "levels off" overstated what Level actually guarantees
        // (underperforming cash value or no such offset at all can still leave Level climbing
        // too — Level just has a mechanism that CAN offset it, not a promise that it will).
        // Flagged on the PDF so a client doesn't read this single number as fixed either way.
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        setText(CHARCOAL);
        const nl = doc.splitTextToSize(
          "Increasing keeps the full face amount at risk for life, so this minimum typically keeps climbing every year. Level's net amount at risk shrinks as cash value grows, which can help offset that rise but isn't a guarantee it stops — confirm the year-by-year schedule on the carrier's illustration.",
          W - 2 * M
        );
        doc.text(nl, M, y);
        y += nl.length * 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        setText(OBSIDIAN);
      }
      y += 10;
    }

    // Initial Death Benefit — Level and Increasing each get their own box, side by side
    // when both are filled in (a carrier can quote a different starting face amount for each
    // election), full-width when only one is (keeps older, single-election scenarios looking the
    // same as before this split).
    const hasInitialDbLevel = !!(data.initialDeathBenefit && data.initialDeathBenefit.trim());
    const hasInitialDbIncreasing = !!(data.initialDeathBenefitIncreasing && data.initialDeathBenefitIncreasing.trim());
    if (hasInitialDbLevel || hasInitialDbIncreasing) {
      ensureSpace(62); // exact height of this block, see the trailing `y += 62` below
      const both = hasInitialDbLevel && hasInitialDbIncreasing;
      const boxW = both ? (W - 2 * M - 12) / 2 : W - 2 * M;
      const drawInitialDbBox = (x: number, amount: string, label: string) => {
        // Re-set the fill immediately before each rect, not once up front: jsPDF's text draws
        // (setText below) use the same underlying fill color as shapes, so drawing this box's own
        // label text would otherwise clobber NEUTRAL_FILL before the second box gets to use it —
        // bit us on the first render of this two-box layout (second box came out near-black, the
        // leftover CHARCOAL label-text color from the first box's draw).
        // Colors retired entirely 9/7, fifth round (see the palette comment at the top of this
        // file) — this box used to be blue (death-benefit boxes were blue, Cash Value was green);
        // now every box in this document, regardless of what it's about, uses the same neutral
        // cream fill and the same black text, per Karina's "fully monochrome" call.
        setFill(NEUTRAL_FILL);
        doc.roundedRect(x, y, boxW, 50, 4, 4, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(both ? 15 : 18);
        setText(OBSIDIAN);
        doc.text("$" + formatMoney(amount), x + 14, y + 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(CHARCOAL);
        doc.text(label, x + 14, y + 42);
      };
      if (hasInitialDbLevel) {
        drawInitialDbBox(M, data.initialDeathBenefit as string, both ? "Initial Death Benefit (Level)" : "Initial Death Benefit (Face Value)");
      }
      if (hasInitialDbIncreasing) {
        drawInitialDbBox(
          both ? M + boxW + 12 : M,
          data.initialDeathBenefitIncreasing as string,
          both ? "Initial Death Benefit (Increasing)" : "Initial Death Benefit (Increasing, Face Value)"
        );
      }
      y += 62;
    }

    if (data.dbIncreaseAge && data.dbIncreaseAge.trim()) {
      // 66, not 52 — Karina, 9/7: the "If cash value is left untouched..." box needed more room
      // below it before Death Benefit Milestones starts ("it's too close to that box"). Box itself
      // is still 40pt tall; the extra 14pt is trailing whitespace, matched here and in the trailing
      // `y += 66` below so pagination still reserves exactly what this block now uses.
      ensureSpace(66);
      setFill(NEUTRAL_FILL);
      doc.roundedRect(M, y, W - 2 * M, 40, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text(
        "If cash value is left untouched, death benefit begins increasing at age " + data.dbIncreaseAge.trim() + ".",
        M + 12,
        y + 16
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setText(CHARCOAL);
      doc.text(
        "This can be changed at any time by calling the carrier — we recommend periodic policy reviews, which we schedule as part of our service.",
        M + 12,
        y + 29
      );
      y += 66;
    }

    // Death Benefit Milestones — added 9/7 per Karina: a quick "hits $X at age Y" highlight,
    // separate from the detailed age-by-age table below. Only targets with an amount actually
    // filled in are shown; an age left blank on one side (Level vs. Increasing) prints as "—"
    // rather than being silently dropped, so it's clear that side just wasn't entered.
    // Reworked 9/7, same day, per Karina: "can the death benefit milestones be more visual in
    // layout?" — the plain text-line version blended into the page next to the Initial Death
    // Benefit boxes above it. Now each target gets its own box, two per row (matching the Initial
    // Death Benefit boxes' side-by-side pattern), with Level as a solid marker and Increasing as a
    // dashed one, same dash convention as the Death Benefit Over Time chart's legend further down
    // this same page, so a client can visually connect the two sections. (This box, and the
    // Initial Death Benefit boxes above it, used to also share a blue fill/text color to make that
    // connection — retired 9/7, fifth round, along with every other color in this document; see
    // the palette comment up top. The dashed-vs-solid convention alone still does that job.)
    const dbTargets = (data.deathBenefitTargets ?? []).filter((t) => t.targetAmount && t.targetAmount.trim());
    if (dbTargets.length > 0) {
      const twoUp = dbTargets.length > 1;
      const dbBoxW = twoUp ? (W - 2 * M - 12) / 2 : W - 2 * M;
      // 68, not 58 — Karina, 9/7: "the blue boxes need more space at the bottom like the green
      // ones." The green Initial Death Benefit boxes (50pt tall) have their last text baseline 8pt
      // above the bottom edge; these boxes stack 4 lines instead of 2, so at the old 58pt they only
      // had 5pt below the last line — tighter than the green boxes despite having more content.
      const dbBoxH = 68;
      const dbRows = twoUp ? Math.ceil(dbTargets.length / 2) : dbTargets.length;
      // Exact height: the section header (8) plus every row of boxes — computed up front so the
      // header and its boxes are guaranteed to land on the same page rather than the header
      // printing at the very bottom of one page with its boxes stranded on the next.
      ensureSpace(8 + dbRows * (dbBoxH + 10));

      // Recolored 9/7, fourth round — same as POLICY PREMIUM above, matching section-label pattern.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      doc.text("DEATH BENEFIT MILESTONES", M, y);
      // 8, not 12 — Karina, 9/7, same round as the extra space above: the label should sit closer
      // to its own boxes below it, not float between the note box above and the boxes below.
      y += 8;
      const drawAgeMarker = (x: number, markerY: number, color: RGB, dashed: boolean, label: string) => {
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(2);
        if (dashed) doc.setLineDashPattern([2, 1.5], 0);
        doc.line(x, markerY, x + 12, markerY);
        doc.setLineDashPattern([], 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setText(CHARCOAL);
        doc.text(label, x + 16, markerY + 2.5);
      };
      dbTargets.forEach((t, i) => {
        const col = twoUp ? i % 2 : 0;
        const row = twoUp ? Math.floor(i / 2) : i;
        const boxX = col === 0 ? M : M + dbBoxW + 12;
        const boxY = y + row * (dbBoxH + 10);
        // Re-set the fill immediately before each box for the same reason as drawInitialDbBox
        // above — text draws in between would otherwise clobber the fill color for the next box.
        setFill(NEUTRAL_FILL);
        doc.roundedRect(boxX, boxY, dbBoxW, dbBoxH, 4, 4, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        setText(OBSIDIAN);
        doc.text("$" + formatMoney(t.targetAmount), boxX + 14, boxY + 22);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setText(CHARCOAL);
        doc.text("Death Benefit Reached", boxX + 14, boxY + 33);
        const levelLabel = "Level: " + (t.levelAge && t.levelAge.trim() ? "age " + t.levelAge.trim() : "—");
        const increasingLabel =
          "Increasing: " + (t.increasingAge && t.increasingAge.trim() ? "age " + t.increasingAge.trim() : "—");
        drawAgeMarker(boxX + 14, boxY + 44, OBSIDIAN, false, levelLabel);
        drawAgeMarker(boxX + 14, boxY + 53, GRAY, true, increasingLabel);
      });
      // 22, not 4 — Karina, 9/7: "the stuff that is under those blue boxes they're too close to
      // the boxes." The old 4pt gap put the milestones table header almost flush against the
      // bottom of the boxes; this gives it real breathing room before the next section starts.
      y += dbRows * (dbBoxH + 10) + 22;
    }

    const milestones = data.milestones.filter((m) => m.label.trim());
    if (milestones.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      setText(GRAY);
      doc.text("No milestones entered yet.", M, y);
      y += 20;
    } else {
      // A track (Level / Increasing) only gets a line on the chart (and a legend entry) if at
      // least one milestone actually has a number for it — added 9/2. Bug found while testing: an
      // entirely-blank track used to still draw as a flat line sitting at $0 with its label in the
      // legend, which reads to a client as "Level pays $0" rather than "we didn't enter this
      // side." Doesn't affect the table — a blank cell there already showed a plain "—", which was
      // always clear.
      const hasAnyValue = (values: (string | undefined)[]) => values.some((v) => !!(v && String(v).trim()));
      const cvLevelHas = hasAnyValue(milestones.map((m) => m.cvNonGuaranteed));
      const cvIncHas = hasAnyValue(milestones.map((m) => m.cvIncreasing));
      const dbLevelHas = hasAnyValue(milestones.map((m) => m.dbGuaranteed));
      const dbIncHas = hasAnyValue(milestones.map((m) => m.dbIncreasing));

      // Table — two-part Level vs. Increasing, same column layout as the original per-product
      // Illustration's Guaranteed/Non-Guaranteed table (proven to fit at this width).
      // Exact height: header row (20) + rule gap (14) + one line per milestone (16 each) + trailing
      // gap before the chart (14) — keeps the header from landing alone at the bottom of a page
      // with its rows stranded on the next.
      ensureSpace(20 + 14 + milestones.length * 16 + 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      const colX = [M, M + 105, M + 220, M + 335, M + 450];
      const colMaxW = 110;
      const headers = ["", "Cash Value\n(Level)", "Cash Value\n(Increasing)", "Death Benefit\n(Level)", "Death Benefit\n(Increasing)"];
      headers.forEach((h, i) => doc.text(h, colX[i], y, { maxWidth: colMaxW }));
      y += 20;
      doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
      doc.setLineWidth(1);
      doc.line(M, y, W - M, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      milestones.forEach((m) => {
        setText(OBSIDIAN);
        doc.setFont("helvetica", "bold");
        doc.text("Age " + m.label, colX[0], y);
        doc.setFont("helvetica", "normal");
        setText(CHARCOAL);
        doc.text(m.cvNonGuaranteed ? "$" + formatMoney(m.cvNonGuaranteed) : "—", colX[1], y);
        doc.text(m.cvIncreasing ? "$" + formatMoney(m.cvIncreasing) : "—", colX[2], y);
        doc.text(m.dbGuaranteed ? "$" + formatMoney(m.dbGuaranteed) : "—", colX[3], y);
        doc.text(m.dbIncreasing ? "$" + formatMoney(m.dbIncreasing) : "—", colX[4], y);
        y += 16;
      });
      // 26, not 14 — Karina, 9/7: "the cash value over time, I feel like there needs to be a
      // little bit more space, so it's pushed down." Same treatment for the Death Benefit chart's
      // own lead-in below.
      y += 26;

      const xLabels = milestones.map((m) => "Age " + m.label);

      // Cash value chart — Level solid, Increasing dashed — same legend pattern as the original
      // per-product Illustration's Guaranteed/Non-Guaranteed charts, plus each track above only
      // appears here if it actually has data (see hasAnyValue).
      // This is the block that was actually getting clipped before 9/7's page-break fix — a
      // title-height chart runs ~146pt (title + legend gap + the 110pt chart itself), so this
      // guarantees the whole chart, not just its title, starts on a page with room for it.
      ensureSpace(146);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("CASH VALUE OVER TIME", M, y);
      y += 4;
      const cvLegend: { label: string; color: RGB; dashed?: boolean }[] = [];
      const cvSeries: { values: number[]; color: RGB; dashed?: boolean }[] = [];
      if (cvLevelHas) {
        cvLegend.push({ label: "Level", color: OBSIDIAN });
        cvSeries.push({ values: milestones.map((m) => parseMoney(m.cvNonGuaranteed)), color: OBSIDIAN });
      }
      if (cvIncHas) {
        cvLegend.push({ label: "Increasing", color: GRAY, dashed: true });
        cvSeries.push({ values: milestones.map((m) => parseMoney(m.cvIncreasing)), color: GRAY, dashed: true });
      }
      drawLegend(doc, M + 150, y - 2.5, cvLegend);
      y += 12;
      drawLineChart(doc, { x: M, y, width: W - 2 * M, height: 110, xLabels, series: cvSeries });
      // 142, not 130 — same "pushed down" request as the Cash Value chart's lead-in above, applied
      // to the Death Benefit chart too.
      y += 142;

      // Death benefit chart — same Level/Increasing split.
      ensureSpace(146); // same reasoning as the Cash Value chart's check above
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("DEATH BENEFIT OVER TIME", M, y);
      y += 4;
      const dbLegend: { label: string; color: RGB; dashed?: boolean }[] = [];
      const dbSeries: { values: number[]; color: RGB; dashed?: boolean }[] = [];
      if (dbLevelHas) {
        dbLegend.push({ label: "Level", color: OBSIDIAN });
        dbSeries.push({ values: milestones.map((m) => parseMoney(m.dbGuaranteed)), color: OBSIDIAN });
      }
      if (dbIncHas) {
        dbLegend.push({ label: "Increasing", color: GRAY, dashed: true });
        dbSeries.push({ values: milestones.map((m) => parseMoney(m.dbIncreasing)), color: GRAY, dashed: true });
      }
      drawLegend(doc, M + 150, y - 2.5, dbLegend);
      y += 12;
      drawLineChart(doc, { x: M, y, width: W - 2 * M, height: 110, xLabels, series: dbSeries });
      y += 130;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      ensureSpace(nl.length * 12 + 10);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else if (data.kind === "term") {
    setFill(NEUTRAL_FILL);
    doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    setText(OBSIDIAN);
    doc.text(data.deathBenefit ? "$" + formatMoney(data.deathBenefit) : "—", M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    doc.text("Death Benefit", M + 14, y + 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(OBSIDIAN);
    if (data.termLength) doc.text(data.termLength + " term", M + 280, y + 26);
    if (data.levelPremium) doc.text("$" + formatMoney(data.levelPremium) + " level premium", M + 280, y + 44);
    if (data.conversionDeadline) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(CHARCOAL);
      doc.text("Convertible without exam until " + data.conversionDeadline, M + 280, y + 60);
    }
    y += 96;

    if (data.riders.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("LIVING BENEFITS & RIDERS INCLUDED", M, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      data.riders.forEach((r) => {
        doc.text("— " + r, M, y);
        y += 14;
      });
      y += 8;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      ensureSpace(nl.length * 12 + 10);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else if (data.kind === "final_expense") {
    // Budget options — added 9/2. Karina wants to show a client more than one face-value/premium
    // pairing on the same scenario. With just the one (original) option, keep the exact original
    // single big box — full backward compatibility for every existing Final Expense PDF. With 2
    // or 3, switch to smaller boxes side by side so there's room for each pairing.
    const hasOption2 = !!((data.deathBenefit2 && data.deathBenefit2.trim()) || (data.levelPremium2 && data.levelPremium2.trim()));
    const hasOption3 = !!((data.deathBenefit3 && data.deathBenefit3.trim()) || (data.levelPremium3 && data.levelPremium3.trim()));

    if (!hasOption2 && !hasOption3) {
      setFill(NEUTRAL_FILL);
      doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      setText(OBSIDIAN);
      doc.text(data.deathBenefit ? "$" + formatMoney(data.deathBenefit) : "—", M + 14, y + 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      doc.text("Guaranteed Death Benefit", M + 14, y + 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setText(OBSIDIAN);
      if (data.levelPremium) doc.text("$" + formatMoney(data.levelPremium) + " — guaranteed level for life", M + 280, y + 26);
      y += 96;
    } else {
      const options: { label: string; db?: string; prem?: string }[] = [
        { label: "Option 1", db: data.deathBenefit, prem: data.levelPremium },
      ];
      if (hasOption2) options.push({ label: "Option 2", db: data.deathBenefit2, prem: data.levelPremium2 });
      if (hasOption3) options.push({ label: "Option 3", db: data.deathBenefit3, prem: data.levelPremium3 });

      const gap = 12;
      const boxW = (W - 2 * M - gap * (options.length - 1)) / options.length;
      options.forEach((opt, i) => {
        const x = M + i * (boxW + gap);
        setFill(NEUTRAL_FILL);
        doc.roundedRect(x, y, boxW, 78, 4, 4, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        setText(GRAY);
        doc.text(opt.label.toUpperCase(), x + 12, y + 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        setText(OBSIDIAN);
        doc.text(opt.db ? "$" + formatMoney(opt.db) : "—", x + 12, y + 38);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setText(CHARCOAL);
        doc.text("Guaranteed Death Benefit", x + 12, y + 50);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        setText(OBSIDIAN);
        // Deliberately just "$X/mo" here, not the fuller "— guaranteed for life" phrasing the
        // single-option box above uses — bug caught while testing: that longer phrase wraps to a
        // second line in these narrower 3-across boxes and spills below the box's fixed height.
        // The intro paragraph above already establishes everything here is guaranteed/locked for
        // life, so it isn't lost by shortening this line.
        doc.text(opt.prem ? "$" + formatMoney(opt.prem) + "/mo" : "—", x + 12, y + 66, { maxWidth: boxW - 24 });
      });
      y += 96;
    }

    if (data.riders.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("LIVING BENEFITS & RIDERS INCLUDED", M, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      data.riders.forEach((r) => {
        doc.text("— " + r, M, y);
        y += 14;
      });
      y += 8;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      ensureSpace(nl.length * 12 + 10);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else {
    // annuity
    if (data.initialPremium) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(OBSIDIAN);
      doc.text("Initial Premium: $" + formatMoney(data.initialPremium), M, y);
      y += 22;
    }

    const milestones = data.milestones.filter((m) => m.label.trim());
    if (milestones.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      setText(GRAY);
      doc.text("No milestones entered yet.", M, y);
      y += 20;
    } else {
      // Table + chart together: header/rule/rows (16 + 14 + rows*16 + 14) plus the chart block
      // itself (~156, same reasoning as the cash_value charts elsewhere in this file but this
      // one's 120pt tall instead of 110). Checked as one combined block since an annuity scenario
      // is rarely long enough to need a break between its table and its single chart.
      ensureSpace(16 + 14 + milestones.length * 16 + 14 + 156);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      const colX = [M, M + 140, M + 290, M + 430];
      const headers = ["", "Accumulation Value", "Income Value", "Death Benefit"];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 16;
      doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
      doc.setLineWidth(1);
      doc.line(M, y, W - M, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      milestones.forEach((m) => {
        setText(OBSIDIAN);
        doc.setFont("helvetica", "bold");
        doc.text(m.label, colX[0], y);
        doc.setFont("helvetica", "normal");
        setText(CHARCOAL);
        doc.text(m.accumulationValue ? "$" + formatMoney(m.accumulationValue) : "—", colX[1], y);
        doc.text(m.incomeValue ? "$" + formatMoney(m.incomeValue) : "—", colX[2], y);
        doc.text(m.deathBenefit ? "$" + formatMoney(m.deathBenefit) : "—", colX[3], y);
        y += 16;
      });
      y += 14;

      const xLabels = milestones.map((m) => m.label);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("PROJECTED VALUE OVER TIME", M, y);
      y += 4;
      drawLegend(doc, M + 175, y - 2.5, [
        { label: "Accumulation Value", color: OBSIDIAN },
        { label: "Income Value", color: GRAY, dashed: true },
      ]);
      y += 12;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 120,
        xLabels,
        series: [
          { values: milestones.map((m) => parseMoney(m.accumulationValue)), color: OBSIDIAN },
          { values: milestones.map((m) => parseMoney(m.incomeValue)), color: GRAY, dashed: true },
        ],
      });
      y += 140;
    }

    // Income rider — added 9/6 per Karina. Only shown when the annuity has one checked.
    if (data.hasIncomeRider) {
      // Conservative estimate (header + amount line + the wrapped tax-treatment note, which runs
      // ~4-5 lines at this width/size) — same reasoning as the Policy Premium check above.
      ensureSpace(120);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(OBSIDIAN);
      doc.text("Income Rider", M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const timing =
        data.incomeStartTiming === "deferred"
          ? "Starts at age " + (data.incomeStartAge || "—")
          : "Starts immediately";
      const amount = data.incomeMonthlyAmount ? "$" + formatMoney(data.incomeMonthlyAmount) + "/mo" : "amount not entered";
      doc.text(timing + " — " + amount, M, y);
      y += 16;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setText(CHARCOAL);
      const incomeNote = doc.splitTextToSize(
        "Whatever accumulation value is left unused when the client passes goes to the beneficiary as a death benefit — but unlike a life insurance death benefit, this isn't automatically fully tax-free. Only the return of principal passes tax-free; any growth above that is taxed to the beneficiary as ordinary income (a qualified/IRA annuity is generally taxed in full). Confirm the specifics on the carrier's illustration and with a tax advisor for the client's situation.",
        W - 2 * M
      );
      doc.text(incomeNote, M, y);
      y += incomeNote.length * 10 + 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      ensureSpace(nl.length * 12 + 10);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  }

  // This generator doesn't do real multi-section pagination — everything above just keeps
  // drawing at increasing y. The two-part Level/Increasing table plus its extra chart legend
  // (added 9/1) made a typical cash_value page taller, and a long Notes entry on top of that can
  // run past a single page's usable area, which used to mean "Prepared by" and the disclaimer
  // below it would silently collide or get clipped off the bottom edge. The advisor block (line +
  // "Prepared by" + name/contact) takes ~45pt, plus a 14pt gap, plus the 2-line disclaimer and a
  // bottom margin — call it ~87pt of trailing content that has to fit below this point on a
  // 792pt-tall page, so anything past y=705 doesn't have room left. Note this means even a
  // short/typical 3-milestone cash_value scenario (measured around y≈727 with the new two-part
  // table+legend) now spills the advisor/disclaimer block onto its own second page — that's a
  // real, expected side effect of the added content, not a bug to chase away with tighter spacing.
  if (y > 705) {
    doc.addPage();
    y = 60;
  }

  if (input.advisor && (input.advisor.name || input.advisor.phone || input.advisor.email)) {
    doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(OBSIDIAN);
    doc.text("Prepared by", M, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    const advisorLine = [input.advisor.name, input.advisor.phone, input.advisor.email].filter(Boolean).join("   ·   ");
    doc.text(advisorLine, M, y);
    y += 16;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  setText(GRAY);
  doc.text(
    "For agent use only. Figures shown are illustrative, entered by the advisor from the carrier's own policy illustration — not a formal projection. Non-guaranteed values are based on current assumptions and are not guaranteed to occur. See the full carrier illustration for complete terms.",
    M,
    Math.max(770, y + 14),
    { maxWidth: 612 - 2 * M }
  );

  // Site URL moved out of the header and into a page footer — see the identical comment in
  // generateIllustrationPDF above.
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(GRAY);
    doc.text("GenerationalPlaybook.com", W / 2, 787, { align: "center" });
  }

  if (action === "view") {
    window.open(doc.output("bloburl"), "_blank");
    return;
  }
  const filename = "Illustration_" + input.clientName.replace(/\s+/g, "_") + "_" + input.productName.replace(/\s+/g, "_") + ".pdf";
  doc.save(filename);
}
