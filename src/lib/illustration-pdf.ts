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

const OBSIDIAN: RGB = [28, 28, 28];
const CHARCOAL: RGB = [46, 46, 46];
const SAND: RGB = [217, 207, 186];
const GREEN: RGB = [30, 107, 60];
const WARM: RGB = [250, 248, 244];
const GRAY: RGB = [102, 102, 102];
const BLUE: RGB = [27, 79, 138];
const GOLD: RGB = [139, 106, 0];
const LIGHT_GREEN: RGB = [140, 190, 155]; // guaranteed line — muted twin of GREEN
const LIGHT_BLUE: RGB = [140, 170, 205]; // guaranteed twin of BLUE

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

  // Header
  setFill(OBSIDIAN);
  doc.rect(0, 0, W, 70, "F");
  setText(WARM);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("GENERATIONAL PLAYBOOK", M, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(SAND);
  doc.text("Policy Illustration Summary  ·  GenerationalPlaybook.com", M, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(WARM);
  doc.text(input.productName, M, 60);
  y = 95;

  // Client / product info box
  setFill([245, 240, 232]);
  doc.roundedRect(M, y, W - 2 * M, 60, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setText(OBSIDIAN);
  doc.text(input.clientName, M + 14, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  doc.text(
    [input.productType, input.carrier].filter(Boolean).join("  ·  ") || "—",
    M + 14,
    y + 38
  );
  y += 78;

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
      // Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      const colX = [M, M + 105, M + 220, M + 335, M + 450];
      const headers = ["", "Cash Value\n(Guaranteed)", "Cash Value\n(Non-Guar.)", "Death Benefit\n(Guaranteed)", "Death Benefit\n(Non-Guar.)"];
      headers.forEach((h, i) => doc.text(h, colX[i], y, { maxWidth: 110 }));
      y += 20;
      doc.setDrawColor(217, 207, 186);
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
      y += 14;

      const xLabels = milestones.map((m) => m.label);

      // Cash value chart
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(GREEN);
      doc.text("CASH VALUE OVER TIME", M, y);
      y += 4;
      drawLegend(doc, M + 150, y - 2.5, [
        { label: "Non-Guaranteed", color: GREEN },
        { label: "Guaranteed", color: LIGHT_GREEN, dashed: true },
      ]);
      y += 12;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 110,
        xLabels,
        series: [
          { values: milestones.map((m) => parseMoney(m.cvNonGuaranteed)), color: GREEN },
          { values: milestones.map((m) => parseMoney(m.cvGuaranteed)), color: LIGHT_GREEN, dashed: true },
        ],
      });
      y += 130;

      // Death benefit chart
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(BLUE);
      doc.text("DEATH BENEFIT OVER TIME", M, y);
      y += 4;
      drawLegend(doc, M + 165, y - 2.5, [
        { label: "Non-Guaranteed", color: BLUE },
        { label: "Guaranteed", color: LIGHT_BLUE, dashed: true },
      ]);
      y += 12;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 110,
        xLabels,
        series: [
          { values: milestones.map((m) => parseMoney(m.dbNonGuaranteed)), color: BLUE },
          { values: milestones.map((m) => parseMoney(m.dbGuaranteed)), color: LIGHT_BLUE, dashed: true },
        ],
      });
      y += 130;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else if (data.kind === "term") {
    setFill([235, 245, 238]);
    doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    setText(GREEN);
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
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else if (data.kind === "final_expense") {
    setFill([235, 245, 238]);
    doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    setText(GREEN);
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
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else {
    // annuity
    if (data.initialPremium) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(GOLD);
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      const colX = [M, M + 140, M + 290, M + 430];
      const headers = ["", "Accumulation Value", "Income Value", "Death Benefit"];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 16;
      doc.setDrawColor(217, 207, 186);
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
      setText(GOLD);
      doc.text("PROJECTED VALUE OVER TIME", M, y);
      y += 4;
      drawLegend(doc, M + 175, y - 2.5, [
        { label: "Accumulation Value", color: GOLD },
        { label: "Income Value", color: BLUE },
      ]);
      y += 12;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 120,
        xLabels,
        series: [
          { values: milestones.map((m) => parseMoney(m.accumulationValue)), color: GOLD },
          { values: milestones.map((m) => parseMoney(m.incomeValue)), color: BLUE },
        ],
      });
      y += 140;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  }

  if (input.advisor && (input.advisor.name || input.advisor.phone || input.advisor.email)) {
    doc.setDrawColor(217, 207, 186);
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

  // Header
  setFill(OBSIDIAN);
  doc.rect(0, 0, W, 70, "F");
  setText(WARM);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("GENERATIONAL PLAYBOOK", M, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(SAND);
  doc.text("Policy Illustration Summary  ·  GenerationalPlaybook.com", M, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(WARM);
  doc.text(input.productName, M, 60);
  y = 95;

  // Client / product info box
  setFill([245, 240, 232]);
  doc.roundedRect(M, y, W - 2 * M, 60, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setText(OBSIDIAN);
  doc.text(input.clientName, M + 14, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  doc.text(
    [input.productType, input.carrier].filter(Boolean).join("  ·  ") || "—",
    M + 14,
    y + 38
  );
  y += 78;

  const data = input.data;

  if (data.kind === "cash_value") {
    const hasMonthlyPremium = !!(data.monthlyPremium && data.monthlyPremium.trim());
    const hasMinimumPremiumLevel = !!(data.minimumPremium && data.minimumPremium.trim());
    const hasMinimumPremiumIncreasing = !!(data.minimumPremiumIncreasing && data.minimumPremiumIncreasing.trim());
    if (hasMonthlyPremium || hasMinimumPremiumLevel || hasMinimumPremiumIncreasing) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(GRAY);
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
        // cost of insurance can flatten; Option B/Increasing's net amount at risk stays at the
        // full face amount for life, and COI rates also rise with attained age regardless of
        // election, so the two compound and this minimum typically keeps climbing rather than
        // leveling off). Flagged on the PDF so a client doesn't read this single number as fixed.
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        setText(GOLD);
        const nl = doc.splitTextToSize(
          "Increasing keeps the full face amount at risk for life, so this minimum typically rises every year rather than leveling off — confirm the year-by-year schedule on the carrier's illustration.",
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

    // Initial Death Benefit — Level and Increasing each get their own green box, side by side
    // when both are filled in (a carrier can quote a different starting face amount for each
    // election), full-width when only one is (keeps older, single-election scenarios looking the
    // same as before this split).
    const hasInitialDbLevel = !!(data.initialDeathBenefit && data.initialDeathBenefit.trim());
    const hasInitialDbIncreasing = !!(data.initialDeathBenefitIncreasing && data.initialDeathBenefitIncreasing.trim());
    if (hasInitialDbLevel || hasInitialDbIncreasing) {
      const both = hasInitialDbLevel && hasInitialDbIncreasing;
      const boxW = both ? (W - 2 * M - 12) / 2 : W - 2 * M;
      const drawInitialDbBox = (x: number, amount: string, label: string) => {
        // Re-set the fill immediately before each rect, not once up front: jsPDF's text draws
        // (setText below) use the same underlying fill color as shapes, so drawing this box's own
        // label text would otherwise clobber the light-green fill before the second box gets to
        // use it — bit us on the first render of this two-box layout (second box came out
        // near-black, the leftover CHARCOAL label-text color from the first box's draw).
        setFill([235, 245, 238]);
        doc.roundedRect(x, y, boxW, 50, 4, 4, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(both ? 15 : 18);
        setText(GREEN);
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
      setFill([245, 240, 220]);
      doc.roundedRect(M, y, W - 2 * M, 40, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(GOLD);
      doc.text(
        "If cash value is left untouched, death benefit begins increasing at age " + data.dbIncreaseAge.trim() + ".",
        M + 12,
        y + 16
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(
        "This can be changed at any time by calling the carrier — we recommend periodic policy reviews, which we schedule as part of our service.",
        M + 12,
        y + 29
      );
      y += 52;
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      const colX = [M, M + 105, M + 220, M + 335, M + 450];
      const colMaxW = 110;
      const headers = ["", "Cash Value\n(Level)", "Cash Value\n(Increasing)", "Death Benefit\n(Level)", "Death Benefit\n(Increasing)"];
      headers.forEach((h, i) => doc.text(h, colX[i], y, { maxWidth: colMaxW }));
      y += 20;
      doc.setDrawColor(217, 207, 186);
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
      y += 14;

      const xLabels = milestones.map((m) => "Age " + m.label);

      // Cash value chart — Level solid, Increasing dashed — same legend pattern as the original
      // per-product Illustration's Guaranteed/Non-Guaranteed charts, plus each track above only
      // appears here if it actually has data (see hasAnyValue).
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(GREEN);
      doc.text("CASH VALUE OVER TIME", M, y);
      y += 4;
      const cvLegend: { label: string; color: RGB; dashed?: boolean }[] = [];
      const cvSeries: { values: number[]; color: RGB; dashed?: boolean }[] = [];
      if (cvLevelHas) {
        cvLegend.push({ label: "Level", color: GREEN });
        cvSeries.push({ values: milestones.map((m) => parseMoney(m.cvNonGuaranteed)), color: GREEN });
      }
      if (cvIncHas) {
        cvLegend.push({ label: "Increasing", color: LIGHT_GREEN, dashed: true });
        cvSeries.push({ values: milestones.map((m) => parseMoney(m.cvIncreasing)), color: LIGHT_GREEN, dashed: true });
      }
      drawLegend(doc, M + 150, y - 2.5, cvLegend);
      y += 12;
      drawLineChart(doc, { x: M, y, width: W - 2 * M, height: 110, xLabels, series: cvSeries });
      y += 130;

      // Death benefit chart — same Level/Increasing split.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(BLUE);
      doc.text("DEATH BENEFIT OVER TIME", M, y);
      y += 4;
      const dbLegend: { label: string; color: RGB; dashed?: boolean }[] = [];
      const dbSeries: { values: number[]; color: RGB; dashed?: boolean }[] = [];
      if (dbLevelHas) {
        dbLegend.push({ label: "Level", color: BLUE });
        dbSeries.push({ values: milestones.map((m) => parseMoney(m.dbGuaranteed)), color: BLUE });
      }
      if (dbIncHas) {
        dbLegend.push({ label: "Increasing", color: LIGHT_BLUE, dashed: true });
        dbSeries.push({ values: milestones.map((m) => parseMoney(m.dbIncreasing)), color: LIGHT_BLUE, dashed: true });
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
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else if (data.kind === "term") {
    setFill([235, 245, 238]);
    doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    setText(GREEN);
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
      setFill([235, 245, 238]);
      doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      setText(GREEN);
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
        setFill([235, 245, 238]);
        doc.roundedRect(x, y, boxW, 78, 4, 4, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        setText(GRAY);
        doc.text(opt.label.toUpperCase(), x + 12, y + 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        setText(GREEN);
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
      doc.text(nl, M, y);
      y += nl.length * 12 + 10;
    }
  } else {
    // annuity
    if (data.initialPremium) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(GOLD);
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(OBSIDIAN);
      const colX = [M, M + 140, M + 290, M + 430];
      const headers = ["", "Accumulation Value", "Income Value", "Death Benefit"];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 16;
      doc.setDrawColor(217, 207, 186);
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
      setText(GOLD);
      doc.text("PROJECTED VALUE OVER TIME", M, y);
      y += 4;
      drawLegend(doc, M + 175, y - 2.5, [
        { label: "Accumulation Value", color: GOLD },
        { label: "Income Value", color: BLUE },
      ]);
      y += 12;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 120,
        xLabels,
        series: [
          { values: milestones.map((m) => parseMoney(m.accumulationValue)), color: GOLD },
          { values: milestones.map((m) => parseMoney(m.incomeValue)), color: BLUE },
        ],
      });
      y += 140;
    }

    if (data.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      const nl = doc.splitTextToSize(data.notes, W - 2 * M);
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
    doc.setDrawColor(217, 207, 186);
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

  if (action === "view") {
    window.open(doc.output("bloburl"), "_blank");
    return;
  }
  const filename = "Illustration_" + input.clientName.replace(/\s+/g, "_") + "_" + input.productName.replace(/\s+/g, "_") + ".pdf";
  doc.save(filename);
}
