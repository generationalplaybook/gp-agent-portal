import { jsPDF } from "jspdf";
import type { IllustrationData } from "./illustration";
import { parseMoney } from "./illustration";

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

export function generateIllustrationPDF(input: IllustrationPdfInput) {
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
        doc.text(m.cvGuaranteed ? "$" + m.cvGuaranteed : "—", colX[1], y);
        doc.text(m.cvNonGuaranteed ? "$" + m.cvNonGuaranteed : "—", colX[2], y);
        doc.text(m.dbGuaranteed ? "$" + m.dbGuaranteed : "—", colX[3], y);
        doc.text(m.dbNonGuaranteed ? "$" + m.dbNonGuaranteed : "—", colX[4], y);
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
    doc.text(data.deathBenefit ? "$" + data.deathBenefit : "—", M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    doc.text("Death Benefit", M + 14, y + 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(OBSIDIAN);
    if (data.termLength) doc.text(data.termLength + " term", M + 280, y + 26);
    if (data.levelPremium) doc.text("$" + data.levelPremium + " level premium", M + 280, y + 44);
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
    doc.text(data.deathBenefit ? "$" + data.deathBenefit : "—", M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    doc.text("Guaranteed Death Benefit", M + 14, y + 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(OBSIDIAN);
    if (data.levelPremium) doc.text("$" + data.levelPremium + " — guaranteed level for life", M + 280, y + 26);
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
      doc.text("Initial Premium: $" + data.initialPremium, M, y);
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
        doc.text(m.accumulationValue ? "$" + m.accumulationValue : "—", colX[1], y);
        doc.text(m.incomeValue ? "$" + m.incomeValue : "—", colX[2], y);
        doc.text(m.deathBenefit ? "$" + m.deathBenefit : "—", colX[3], y);
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

  const filename = "Illustration_" + input.clientName.replace(/\s+/g, "_") + "_" + input.productName.replace(/\s+/g, "_") + ".pdf";
  doc.save(filename);
}

// Duplicated from generateIllustrationPDF above rather than shared — same pattern used throughout
// this app (see CashValueMilestonesEditor duplication note in ScenarioForm.tsx) so the original,
// already-working per-product Illustration Summary PDF can never be affected by scenario-specific
// changes. Only the cash_value layout actually differs (Age/Cash Value/Death Benefit, one number
// each, plus an optional "death benefit increases at age X" callout) — term/final_expense/annuity
// are identical to the original. Used only by the Illustration Scenarios editor.
export function generateScenarioIllustrationPDF(input: IllustrationPdfInput) {
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
    if (data.initialDeathBenefit && data.initialDeathBenefit.trim()) {
      setFill([235, 245, 238]);
      doc.roundedRect(M, y, W - 2 * M, 50, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      setText(GREEN);
      doc.text("$" + data.initialDeathBenefit.trim(), M + 14, y + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      doc.text("Initial Death Benefit (Face Value)", M + 14, y + 42);
      y += 62;
    }

    if (data.dbIncreaseAge && data.dbIncreaseAge.trim()) {
      setFill([245, 240, 220]);
      doc.roundedRect(M, y, W - 2 * M, 26, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(GOLD);
      doc.text("Death benefit begins increasing at age " + data.dbIncreaseAge.trim() + ".", M + 12, y + 17);
      y += 38;
    }

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
      const colX = [M, M + 130, M + 300];
      const headers = ["Age", "Cash Value", "Death Benefit\n(Guaranteed from Day One)"];
      headers.forEach((h, i) => doc.text(h, colX[i], y, { maxWidth: 160 }));
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
        doc.text(m.cvNonGuaranteed ? "$" + m.cvNonGuaranteed : "—", colX[1], y);
        doc.text(m.dbGuaranteed ? "$" + m.dbGuaranteed : "—", colX[2], y);
        y += 16;
      });
      y += 14;

      const xLabels = milestones.map((m) => "Age " + m.label);

      // Cash value chart
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(GREEN);
      doc.text("CASH VALUE OVER TIME", M, y);
      y += 16;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 110,
        xLabels,
        series: [{ values: milestones.map((m) => parseMoney(m.cvNonGuaranteed)), color: GREEN }],
      });
      y += 130;

      // Death benefit chart
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(BLUE);
      doc.text("DEATH BENEFIT OVER TIME (GUARANTEED)", M, y);
      y += 16;
      drawLineChart(doc, {
        x: M,
        y,
        width: W - 2 * M,
        height: 110,
        xLabels,
        series: [{ values: milestones.map((m) => parseMoney(m.dbGuaranteed)), color: BLUE }],
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
    doc.text(data.deathBenefit ? "$" + data.deathBenefit : "—", M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    doc.text("Death Benefit", M + 14, y + 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(OBSIDIAN);
    if (data.termLength) doc.text(data.termLength + " term", M + 280, y + 26);
    if (data.levelPremium) doc.text("$" + data.levelPremium + " level premium", M + 280, y + 44);
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
    doc.text(data.deathBenefit ? "$" + data.deathBenefit : "—", M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(CHARCOAL);
    doc.text("Guaranteed Death Benefit", M + 14, y + 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(OBSIDIAN);
    if (data.levelPremium) doc.text("$" + data.levelPremium + " — guaranteed level for life", M + 280, y + 26);
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
      doc.text("Initial Premium: $" + data.initialPremium, M, y);
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
        doc.text(m.accumulationValue ? "$" + m.accumulationValue : "—", colX[1], y);
        doc.text(m.incomeValue ? "$" + m.incomeValue : "—", colX[2], y);
        doc.text(m.deathBenefit ? "$" + m.deathBenefit : "—", colX[3], y);
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

  const filename = "Illustration_" + input.clientName.replace(/\s+/g, "_") + "_" + input.productName.replace(/\s+/g, "_") + ".pdf";
  doc.save(filename);
}
