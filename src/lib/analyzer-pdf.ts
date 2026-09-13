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

  // Palette rebuilt 9/11 per Karina, after a client meeting: "gotta fix the colors. All of the
  // PDFs need to match. I don't like the big black block at the top... make everything match the
  // illustrations page, the color scheme, the layout, the light and airy vibe." Reuses the exact
  // monochrome palette illustration-pdf.ts already settled on (see that file's own palette
  // comment for the full history) — OBSIDIAN/CHARCOAL/SAND/GRAY/NEUTRAL_FILL, no green/red/blue.
  // What used to be told apart by color (Primary vs. Avoid vs. Combo) is now told apart by label
  // text + weight instead, same principle illustration-pdf.ts used for its own chart series.
  const OBSIDIAN: RGB = [42, 45, 47];
  const CHARCOAL: RGB = [78, 81, 83];
  const SAND: RGB = [229, 223, 211];
  const GRAY: RGB = [155, 155, 152];
  const NEUTRAL_FILL: RGB = [244, 241, 235];

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  const ensureRoom = (needed: number) => {
    if (y > H - needed) {
      doc.addPage();
      y = 60;
    }
  };

  // Header — no more solid black block or top-of-page wordmark; see the per-page footer loop
  // near the bottom of this function for where "GENERATIONAL PLAYBOOK" and the site URL live now.
  // Client name isn't repeated up here — it's the first thing in the info box just below.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(OBSIDIAN);
  doc.text("Client Profile & Recommendation", M, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  doc.text("Client Needs Analysis", W - M, 26, { align: "right" });

  doc.setDrawColor(OBSIDIAN[0], OBSIDIAN[1], OBSIDIAN[2]);
  doc.setLineWidth(1.5);
  doc.line(M, 40, W - M, 40);
  y = 58;

  // Client info box
  setFill(NEUTRAL_FILL);
  doc.roundedRect(M, y, W - 2 * M, 78, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(OBSIDIAN);
  doc.text(d.name, M + 14, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(CHARCOAL);
  doc.text("DOB: " + (d.dob || "—") + (d.age ? "   ·   Age: " + d.age : ""), M + 14, y + 38);
  doc.text("Phone: " + (d.phone || "—"), M + 14, y + 52);
  doc.text("Email: " + (d.email || "—"), M + 14, y + 66);
  doc.text(
    "Height: " + d.heightFt + "'" + (d.heightIn || "0") + '"   ·   Weight: ' + d.weight + " lbs",
    M + 280,
    y + 38
  );
  // Tobacco and marijuana are now two independent questions (Karina, 9/9), but still share one
  // line here — the info box above has room for exactly 3 lines on this side and adding a 4th
  // would overflow it.
  const tobaccoLine = [d.tobacco ? "Tobacco: " + d.tobacco : "", d.marijuana ? "Marijuana: " + d.marijuana : ""]
    .filter(Boolean)
    .join("   ·   ");
  if (tobaccoLine) doc.text(tobaccoLine, M + 280, y + 52);
  if (d.health) doc.text("Health: " + d.health, M + 280, y + 66);
  y += 95;

  if (d.suggestedDB) {
    setFill(NEUTRAL_FILL);
    doc.roundedRect(M, y, W - 2 * M, 55, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(OBSIDIAN);
    doc.text("Suggested Death Benefit: $" + d.suggestedDB.toLocaleString(), M + 14, y + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(CHARCOAL);
    doc.text("(10x annual income + total debt)", M + 14, y + 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(OBSIDIAN);
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
  doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
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
    setFill(NEUTRAL_FILL);
    doc.roundedRect(M, y, W - 2 * M, 20 + d.rolloverReasons.length * 13 + 14, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(OBSIDIAN);
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

    setFill(NEUTRAL_FILL);
    const primH = 20 + (rec.reasons?.length ?? 0) * 13 + 20;
    doc.roundedRect(M, y, W - 2 * M, primH, 4, 4, "F");
    doc.setDrawColor(OBSIDIAN[0], OBSIDIAN[1], OBSIDIAN[2]);
    doc.setLineWidth(2);
    doc.line(M, y, M, y + primH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(OBSIDIAN);
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
      setText(OBSIDIAN);
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
      setText(OBSIDIAN);
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
      setText(OBSIDIAN);
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
    Math.max(H - 34, y + 14),
    { maxWidth: W - 2 * M }
  );

  // Per-page footer, bottom center — same pattern as illustration-pdf.ts (see that file's own
  // comment for the full history): Karina, 9/11, after a client meeting, re: the old top header:
  // "I don't like... the way that the Generation Playbook is in the header. It needs to be at the
  // bottom center of each page on a PDF." Looped across every page since a multi-page client
  // profile should carry it on each one, not just wherever the content happened to end.
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
