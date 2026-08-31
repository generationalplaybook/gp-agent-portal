import { jsPDF } from "jspdf";
import { formatPeriodicFunding, type AnalyzerResult, type GoalRecommendation } from "./analyzer";

type RGB = [number, number, number];

export interface AdvisorInfo {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

function buildClientPDF(d: AnalyzerResult, advisor?: AdvisorInfo): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = 612;
  const H = 792;
  const M = 50;
  let y = 0;

  const OBSIDIAN: RGB = [28, 28, 28];
  const CHARCOAL: RGB = [46, 46, 46];
  const SAND: RGB = [217, 207, 186];
  const GREEN: RGB = [30, 107, 60];
  const WARM: RGB = [250, 248, 244];
  const RED: RGB = [139, 26, 26];
  const GRAY: RGB = [102, 102, 102];
  const BLUE: RGB = [27, 79, 138];

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  const ensureRoom = (needed: number) => {
    if (y > H - needed) {
      doc.addPage();
      y = 50;
    }
  };

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
  doc.text("Client Needs Analysis  ·  GenerationalPlaybook.com", M, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(WARM);
  doc.text("Client Profile & Recommendation", M, 60);
  y = 95;

  // Client info box
  setFill([245, 240, 232]);
  doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(OBSIDIAN);
  doc.text(d.name, M + 14, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  doc.text("DOB: " + (d.dob || "—") + (d.age ? "   ·   Age: " + d.age : ""), M + 14, y + 38);
  doc.text("Phone: " + d.phone, M + 14, y + 52);
  doc.text("Email: " + d.email, M + 14, y + 66);
  doc.text(
    "Height: " + d.heightFt + "'" + (d.heightIn || "0") + '"   ·   Weight: ' + d.weight + " lbs",
    M + 280,
    y + 38
  );
  if (d.tobacco) doc.text("Tobacco: " + d.tobacco, M + 280, y + 52);
  if (d.health) doc.text("Health: " + d.health, M + 280, y + 66);
  y += 95;

  if (d.suggestedDB) {
    setFill([235, 245, 238]);
    doc.roundedRect(M, y, W - 2 * M, 55, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(GREEN);
    doc.text("Suggested Death Benefit: $" + d.suggestedDB.toLocaleString(), M + 14, y + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(CHARCOAL);
    doc.text("(10x annual income + total debt)", M + 14, y + 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(GREEN);
    doc.text(
      "Living Benefit Reserve: $" +
        (d.suggestedReserveLow ?? 0).toLocaleString() +
        " - $" +
        (d.suggestedReserveHigh ?? 0).toLocaleString(),
      M + 280,
      y + 20
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(CHARCOAL);
    doc.text("(6-12 months income if too sick to work)", M + 280, y + 32);
    y += 70;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(OBSIDIAN);
  doc.text("Client Profile Summary", M, y);
  y += 6;
  doc.setDrawColor(217, 207, 186);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  const goalsLabel =
    d.recommendations.length && d.recommendations.some((r) => r.goal)
      ? d.recommendations.map((r) => r.goalLabel).join(", ")
      : "Not specified";
  const fundingParts = [
    d.monthlyBudget && d.monthlyBudget + "/month",
    d.lumpSumAmount && d.lumpSumAmount + " lump sum",
    formatPeriodicFunding(d.periodicAmount, d.periodicFrequency),
  ].filter(Boolean);
  const summaryLines = [
    "Money Type: " + (d.money || "Not specified"),
    "Other Retirement Accounts: " + (d.hasRollover ? "Yes" : "No / Unsure"),
    "Funding Method: " + (fundingParts.length ? fundingParts.join(" + ") : "Not specified"),
    "Primary Goal(s): " + goalsLabel,
    "Time Horizon: " + (d.horizon || "Not specified"),
    "Risk Tolerance: " + (d.risk || "Not specified"),
    "Needs Access Before 59.5: " + (d.earlyAccess || "Not specified"),
  ];
  if (d.existingCoverage) {
    summaryLines.push("Existing Coverage: " + d.existingCoverage);
  }
  summaryLines.forEach((line) => {
    doc.text(line, M, y);
    y += 14;
  });
  y += 10;

  if (d.hasRollover && d.rolloverProduct && d.rolloverReasons) {
    ensureRoom(150);
    setFill([255, 251, 240]);
    doc.roundedRect(M, y, W - 2 * M, 20 + d.rolloverReasons.length * 13 + 14, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText([139, 106, 0]);
    doc.text("Also Recommended — Rollover Opportunity", M + 14, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(OBSIDIAN);
    doc.text(d.rolloverProduct, M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setText(CHARCOAL);
    let ry = y + 48;
    d.rolloverReasons.forEach((reason) => {
      const rl = doc.splitTextToSize("— " + reason, W - 2 * M - 28);
      doc.text(rl, M + 14, ry);
      ry += rl.length * 11;
    });
    y = ry + 14;
  }

  const drawRecommendationBlock = (rec: GoalRecommendation, multi: boolean) => {
    ensureRoom(180);

    if (multi) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setText(OBSIDIAN);
      doc.text("Goal: " + rec.goalLabel, M, y);
      y += 18;
    }

    setFill([235, 245, 238]);
    const primH = 20 + (rec.reasons?.length ?? 0) * 13 + 20;
    doc.roundedRect(M, y, W - 2 * M, primH, 4, 4, "F");
    doc.setDrawColor(30, 107, 60);
    doc.setLineWidth(2);
    doc.line(M, y, M, y + primH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(GREEN);
    doc.text("PRIMARY RECOMMENDATION" + (d.hasRollover ? " — Today's New Plan" : ""), M + 14, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setText(OBSIDIAN);
    doc.text(rec.primary, M + 14, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setText(CHARCOAL);
    let py = y + 48;
    (rec.reasons ?? []).forEach((reason) => {
      const rl = doc.splitTextToSize("— " + reason, W - 2 * M - 28);
      doc.text(rl, M + 14, py);
      py += rl.length * 11;
    });
    y = py + 16;

    ensureRoom(150);

    if (rec.secondary) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(CHARCOAL);
      doc.text("RUNNER-UP OPTION", M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const sl = doc.splitTextToSize(rec.secondary, W - 2 * M);
      doc.text(sl, M, y);
      y += sl.length * 12 + 14;
    }

    if (rec.talking?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText([27, 79, 138]);
      doc.text("CLIENT TALKING POINTS", M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(CHARCOAL);
      rec.talking.forEach((t) => {
        const tl = doc.splitTextToSize("— " + t, W - 2 * M - 14);
        doc.text(tl, M + 10, y);
        y += tl.length * 11;
      });
      y += 12;
    }

    if (rec.avoid) {
      ensureRoom(100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(RED);
      doc.text("AVOID FOR THIS CLIENT: " + rec.avoid, M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(CHARCOAL);
      (rec.avoidReasons ?? []).forEach((reason) => {
        const rl = doc.splitTextToSize("— " + reason, W - 2 * M - 14);
        doc.text(rl, M + 10, y);
        y += rl.length * 11;
      });
      y += 12;
    }

    if (rec.combo) {
      ensureRoom(100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(BLUE);
      doc.text("COMBO OPTION: " + rec.combo, M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(CHARCOAL);
      (rec.comboReasons ?? []).forEach((reason) => {
        const rl = doc.splitTextToSize("— " + reason, W - 2 * M - 14);
        doc.text(rl, M + 10, y);
        y += rl.length * 11;
      });
    }

    y += 20;
  };

  const multi = d.recommendations.length > 1;
  d.recommendations.forEach((rec) => drawRecommendationBlock(rec, multi));

  if (advisor && (advisor.name || advisor.phone || advisor.email)) {
    ensureRoom(60);
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
    const advisorLine = [advisor.name, advisor.phone, advisor.email].filter(Boolean).join("   ·   ");
    doc.text(advisorLine, M, y);
    y += 16;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  setText(GRAY);
  doc.text(
    "For agent use only. Generated by the Generational Playbook Client Analyzer. Not a formal insurance illustration. All figures and recommendations are approximations for discussion purposes only — final numbers depend on carrier underwriting, approval, and current rates.",
    M,
    H - 20,
    { maxWidth: W - 2 * M }
  );

  return doc;
}

// Downloads the file straight to disk.
export function generateClientPDF(d: AnalyzerResult, advisor?: AdvisorInfo) {
  const doc = buildClientPDF(d, advisor);
  const filename = "Client_Profile_" + d.name.replace(/\s+/g, "_") + ".pdf";
  doc.save(filename);
}

// Opens the PDF in a new tab for a quick look — nothing gets saved to disk unless the person
// chooses to from the browser's own viewer.
export function viewClientPDF(d: AnalyzerResult, advisor?: AdvisorInfo) {
  const doc = buildClientPDF(d, advisor);
  const url = doc.output("bloburl");
  window.open(url.toString(), "_blank");
}
