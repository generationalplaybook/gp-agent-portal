import { jsPDF } from "jspdf";
import type { IllustrationData, AnnuityIllustration, CashValueBudget } from "./illustration";
import { parseMoney, formatMoney, formatPercent, getCashValueBudgets } from "./illustration";
import { LOGO_MARK_ASPECT, LOGO_MARK_PNG_BASE64 } from "./logo-mark-asset";

type RGB = [number, number, number];

// Truncates text to fit a max width at the doc's CURRENT font/size (call after setFont/setFontSize,
// before doc.text) — added 9/13 for Final Expense's multi-product budget-option boxes, where a
// typed-in product name (e.g. "Mutual of Omaha Living Promise") can easily be wider than the
// narrow 3-across box that used to only ever hold a short "OPTION 2" label. jsPDF has no built-in
// single-line ellipsis, so this chops a character at a time until "<text>…" fits.
function fitLabel(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(s + "…") > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + "…";
}

// Appends a scenario's carrier to a product name for display, when it isn't already part of the
// name — added 9/13 per Karina, after the Final Expense multi-option rows shipped without it:
// "shouldn't the first one say Banner Life as that's the product it is." The primary option's
// label is just input.productName, with the carrier living separately in input.carrier — options
// 2/3 usually read as carrier-inclusive already because the advisor typed the carrier straight
// into those free-text fields (often picked from the KB, whose canonical names already do this,
// e.g. "...(TruStage)"), so without this the primary row was the only one of the three that ever
// looked "generic." Uses the same "(Carrier)" parenthetical the KB's own multi-carrier names
// already use, not an em dash — Karina's asked for those removed everywhere.
function withCarrier(name: string, carrier: string | null): string {
  if (!carrier || name.toLowerCase().includes(carrier.toLowerCase())) return name;
  return `${name} (${carrier})`;
}

// Formats a Term Length field for display — added 9/24 per Karina, after typing a bare "30"
// rendered as "30 term" on the summary ("the term should say 30 year the work eyar should be
// automatic"). The field is free text (so "Annual Renewable" or anything else still works
// unchanged), but the common case is an advisor just typing the number — this turns THAT case
// into "30-year term" automatically instead of requiring "30 years" to be typed by hand every
// time. Used everywhere a term length renders (both the primary field and options 2/3).
function formatTermLength(termLength: string): string {
  const trimmed = termLength.trim();
  if (/^\d+$/.test(trimmed)) return `${trimmed}-year`;
  return trimmed;
}

// Shared between Annuity (drawAnnuitySection) and Cash Value/IUL (generateScenarioIllustrationPDF's
// cash_value branch) — added 9/26 per Karina, after she pointed out that a bare cap-rate
// disclosure lets a client conflate two different numbers: "the cap is 9.75%, that's the most
// they can earn, but the illustration numbers that I'm running are at like seven-something
// percent... people are gonna assume they're getting 9.75% when that's the cap." illustratedRate
// is the actual assumed average annual return driving the milestone numbers on the page and is
// now the headline figure; capRate (if entered) is disclosed separately, explicitly labeled as a
// ceiling rather than a projection. Falls back to the original cap-only sentence when no
// illustratedRate is on record, so every existing Annuity scenario/illustration (all of which
// predate this field) reads exactly as it did before.
function buildRateDisclosure(data: { capRate?: string; capRateStrategy?: string; illustratedRate?: string }): string {
  const strategyPart = data.capRateStrategy ? ` on the ${data.capRateStrategy} strategy` : "";
  if (data.illustratedRate) {
    const capPart = data.capRate
      ? ` This strategy's cap rate is ${formatPercent(data.capRate)} — the maximum potential credited rate in any single period, not a projection of actual performance, and subject to change.`
      : "";
    return `Values assume a ${formatPercent(data.illustratedRate)} illustrated average annual return${strategyPart}, which is not guaranteed.${capPart}`;
  }
  if (data.capRate) {
    return `Values assume a ${formatPercent(data.capRate)} current cap rate${strategyPart}. Cap rates are declared periodically and are not guaranteed.`;
  }
  return "";
}

// Added 9/25 per Karina — advisors can now pick how the client pays (monthly/annual/semi-annual/
// quarterly) instead of the premium always being shown as an unlabeled or silently-monthly
// figure. Undefined (every scenario/illustration created before this) reads as "monthly" so
// nothing already generated changes appearance. Same terse "$X/mo" slash-suffix style everywhere
// now (Karina, 9/25: "it should be $__ level premium/mo. /annual /quarter or whatever it is") —
// Term reads "$X level premium/mo", Final Expense reads "$X/mo" (it never had the "level
// premium" words in the first place).
function premiumFreqSuffix(freq?: string): string {
  switch (freq) {
    case "annual":
      return "/yr";
    case "semi_annual":
      return "/6mo";
    case "quarterly":
      return "/qtr";
    default:
      return "/mo";
  }
}

// The header's big title used to just be input.productName — added 9/14 per Karina, after she
// saw the header showing the specific product's name/carrier (e.g. "Final Expense Whole Life —
// Banner Life," carried over from whatever the advisor typed into that scenario's product name
// field): "we don't need the product carrier... we just need to show, like, this is a final
// expense whole life scenario... if it's an IUL, we would say index universal life... we don't
// need the product name because the product name is going to show in the actual scenarios."
// So the header title is now the general product TYPE, not the specific named product — the
// specific product/carrier already shows on each option row below it. PRODUCT_TYPE_OPTIONS
// (src/lib/types.ts) stores a short code for two of its six values; expand just those two into
// the fuller phrasing Karina used ("Final Expense" -> "Final Expense Whole Life", "IUL" -> "Index
// Universal Life"). The rest ("Term Life", "Whole Life", "Annuity", "Other") are already
// full words, so they pass through unchanged. Falls back to the product name only if a scenario
// somehow has no product type set at all (shouldn't happen — it's required at creation — but
// better than a blank header).
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  "Final Expense": "Final Expense Whole Life",
  IUL: "Index Universal Life",
};
function productTypeLabel(input: IllustrationPdfInput): string {
  if (!input.productType) return input.productName;
  return PRODUCT_TYPE_LABELS[input.productType] ?? input.productType;
}

export interface AdvisorInfo {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface IllustrationPdfInput {
  clientName: string;
  // Added 9/13 (second pass) per Karina, for the restored branded header's client info card: "I
  // want it to have the client information at the top... the client's name and maybe like phone
  // number and email so that it's easily accessible to the advisor if they're looking at this."
  // Optional so every existing caller that hasn't been updated to pass these yet still compiles —
  // the header just shows the placeholder "—" glyph for whichever one is missing.
  clientPhone?: string | null;
  clientEmail?: string | null;
  productName: string;
  carrier: string | null;
  productType: string | null;
  data: IllustrationData;
  advisor?: AdvisorInfo;
}

// Header — rebuilt 9/25 per Karina, after she saw a screenshot of the plain-text 9/13 header and
// said "this feels plain i think the logo should be on it and meaybe hte clients name needs ot be
// at hte top? lets rediesng before building show me a mock." Per that same "mock before building"
// pattern the 9/13 header itself went through, I sent an HTML mock first; her follow-ups were
// "maybe the term life needs to be moved oteh right beause it feels heavily stakced on the left"
// (product type moved into the header's top-right, next to the "Policy Illustration Summary"
// label), font/sizing tweaks on the mock, then after seeing it in a REAL generated PDF for the
// first time she asked for 3 more changes in one message:
//   1. Show the specific product + carrier (e.g. "ADDvantage Term (North American)"), not just the
//      generic product type — she was explicit this is ALWAYS ONE product/carrier per illustration
//      ("I don't ever want to put more than one carrier per illustration, I want to do a different
//      illustration if it's a different product from a different carrier rather than mixing them
//      onto one sheet") — so this is a single line in the client info card, never a per-option
//      thing, and Term never needs the productName2/3-style carrier field Final Expense has.
//   2. Revert the client name from a bare heading + accent-rule underline (my first pass at
//      porting the mock) back to the ORIGINAL 9/13 treatment: name/phone/email inside the
//      off-white NEUTRAL_FILL rounded box — "I still like the old format with the person's name
//      being in that like off-white cream nude box rather than having that underline thing." The
//      box now holds a 3rd line for product/carrier (item 1 above).
//   3. More breathing room at the top and bottom of the page — the whole header shifted down
//      ~14pt, and every bottom-of-page boundary (PAGE_MAX_Y, the disclaimer, the footer, the
//      continued-page top margin) shifted to leave more clearance from the physical page edge.
// What DID carry over from the mock: the actual vector logo instead of plain "GENERATIONAL
// PLAYBOOK" text (jsPDF can't render arbitrary SVG, so this is a manual redraw of Logo.tsx's 4
// shapes — a diamond + 3 chevron strokes — at its exact pixel-sampled opacities, via jsPDF's
// moveTo/lineTo/close/fill/stroke path API and setGState for per-shape opacity, plus the
// Georgia-esque wordmark — "times" is jsPDF's built-in serif, there's no Georgia embedded in this
// doc), and "Policy Illustration Summary" + product type right-aligned in the top-right.
// Shared by both generateIllustrationPDF and generateScenarioIllustrationPDF (previously each had
// its own copy of the old plain-text header, byte-identical) — returns the y position to resume
// drawing the rest of the page from.
function drawBrandedHeader(doc: jsPDF, input: IllustrationPdfInput): number {
  const W = 612;
  const M = 50;
  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  // Logo — after 3 rounds of hand-redrawing this in jsPDF (moveTo/lineTo/stroke path math ported
  // from Logo.tsx's SVG) kept producing subtle-but-real discrepancies that were hard to pin down —
  // tapered/pointed stroke ends instead of flat-cut ones (fixed via setLineCap/setLineJoin), then a
  // "lines are thinner" complaint on top of that — Karina sent the actual icon mark as a transparent
  // PNG directly ("can you just use this in the places") and we switched to embedding that real
  // asset instead of re-deriving it from path coordinates. See logo-mark-asset.ts. This guarantees
  // pixel-for-pixel fidelity to the brand asset and ends the redraw-and-compare cycle for good.
  // `lx/ly` still convert the OLD viewBox="0 0 560 100" coordinate space to PDF points, at the same
  // 26pt-tall scale as before — kept only for positioning the wordmark text below, which was never
  // the problem and didn't need to change.
  const logoH = 26;
  const s = logoH / 100;
  const lx = (vx: number) => M + vx * s;
  const ly = (vy: number) => 24 + vy * s;

  // Icon image box, sized/positioned to land in the same visual spot the old vector icon did:
  // 20pt tall (was ~17.55pt of visible content inside a nominal 26pt box), width derived from the
  // asset's own aspect ratio so it's never stretched, vertically centered against the 2-line
  // wordmark next to it (baselines at ly(42) and ly(72), i.e. roughly y 29–43).
  const iconH = 20;
  const iconW = iconH * LOGO_MARK_ASPECT;
  const iconX = M;
  const iconY = 36.2 - iconH / 2;
  doc.addImage(LOGO_MARK_PNG_BASE64, "PNG", iconX, iconY, iconW, iconH);

  // Font sizes ported directly from the SVG's own font-size values (33 and 11, out of the
  // viewBox's 100-unit height), scaled by the same `s` factor as everything else — NOT an
  // arbitrary multiplier. An earlier version used logoH * 0.66 / logoH * 0.22 here, which came out
  // roughly 2x too large and, combined with wrongly using "bold" for "Generational" (the real
  // wordmark is normal weight — Logo.tsx sets no fontWeight), produced an oversized, overly heavy
  // wordmark that swamped the icon and threw off the icon/text vertical balance the real lockup
  // has. Flagged by Karina, 9/25: "the logo is incorrect... I don't know why you changed the shape
  // of it" — the icon shape itself was always correct; it was the text next to it that was wrong.
  doc.setFont("times", "normal");
  doc.setFontSize(33 * s);
  setText([27, 27, 27]);
  doc.text("Generational", lx(104), ly(42));
  doc.setFont("times", "normal");
  doc.setFontSize(11 * s);
  setText(GOLD);
  doc.text("PLAYBOOK", lx(105), ly(72), { charSpace: 2.6 * s });

  // Header-right — "Policy Illustration Summary" + product type, right-aligned. Baselines 34/50
  // (were 20/36) — shifted down the same ~14pt as the logo, to stay level with it.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(GRAY);
  doc.text("POLICY ILLUSTRATION SUMMARY", W - M, 34, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setText(OBSIDIAN);
  doc.text(productTypeLabel(input), W - M, 50, { align: "right" });

  setDraw(OBSIDIAN);
  doc.setLineWidth(1.5);
  doc.line(M, 64, W - M, 64);

  // Client info card — reverted to the original 9/13 boxed treatment per Karina, 9/25: "I still
  // like the old format with the person's name being in that like off-white cream nude box rather
  // than having that underline thing." Now 3 lines instead of 2 — name, phone/email, and the
  // specific product + carrier (Karina, same message: "it should say like advantage nine North
  // American term life... I don't ever want to put more than one carrier per illustration" — one
  // product/carrier for the whole sheet, reusing the same withCarrier() formatting Final Expense's
  // option rows already use elsewhere in this file).
  setFill(NEUTRAL_FILL);
  doc.roundedRect(M, 82, W - 2 * M, 64, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(OBSIDIAN);
  doc.text(input.clientName, M + 16, 106);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(CHARCOAL);
  doc.text([input.clientPhone, input.clientEmail].filter(Boolean).join("   ·   ") || "—", M + 16, 122);
  doc.text(withCarrier(input.productName, input.carrier), M + 16, 138);

  return 164;
}

// Annuity section — shared by both generateIllustrationPDF and generateScenarioIllustrationPDF
// (previously each had its own byte-identical copy of this whole block, same reasoning as
// drawBrandedHeader above). Owns its own page-break bookkeeping (PAGE_MAX_Y/ensureSpace) exactly
// like each caller's outer copy did, since a long annuity section (income rider note, notes field)
// can still run past one page on its own. Returns the y position to resume drawing from.
function drawAnnuitySection(doc: jsPDF, data: AnnuityIllustration, startY: number): number {
  const W = 612;
  const M = 50;
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const PAGE_MAX_Y = 752;
  let y = startY;
  function ensureSpace(needed: number) {
    if (y + needed > PAGE_MAX_Y) {
      doc.addPage();
      y = 68;
    }
  }

  // Initial Premium + term length on one line — termLength added 9/25 per Karina: "we need a spot
  // for how many year annuity it is" (carriers commonly sell the same FIA in several term-length
  // variants — Athene Performance Elite 7 vs 10 vs 15 — with different caps, so this is part of
  // identifying which variant is being illustrated, not just trivia). Run through the same
  // formatTermLength() helper Term Life uses, and labeled the same way ("N-year term") — fixed
  // 9/26 per Karina, after a bare "7" typed into the field (instead of the "10-Year" placeholder
  // hint) rendered as a lone, unlabeled "7" next to Initial Premium on the summary: "this should
  // say term 7 year or soemthing not jsut a random 7."
  const premiumParts = [
    data.initialPremium ? "Initial Premium: $" + formatMoney(data.initialPremium) : null,
    data.termLength ? formatTermLength(data.termLength) + " term" : null,
  ].filter(Boolean);
  if (premiumParts.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(OBSIDIAN);
    doc.text(premiumParts.join("   ·   "), M, y);
    y += 22;
  }

  // Rate disclosure — added 9/25 per Karina (cap rate only at the time), extended 9/26 to also
  // cover illustratedRate via the shared buildRateDisclosure() above. The Accumulation Value
  // milestones below are driven by an assumed rate the client otherwise never sees, so this
  // discloses it right above the numbers it explains (same placement Karina picked for the IUL
  // side's equivalent assumption line, see the cash_value branch of generateScenarioIllustrationPDF).
  if (buildRateDisclosure(data)) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    setText(GRAY);
    const capNote = doc.splitTextToSize(buildRateDisclosure(data), W - 2 * M);
    doc.text(capNote, M, y);
    y += capNote.length * 10 + 10;
  }

  const milestones = data.milestones.filter((m) => m.label.trim());
  if (milestones.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    setText(GRAY);
    doc.text("No milestones entered yet.", M, y);
    y += 20;
  } else {
    // Income Value column/series only shown when there's actually an income rider — added 9/25
    // per Karina: "for non income annuities we shouldnt show income on the exported pdf." Before
    // this the column always rendered (as "—" for every row on a pure accumulation annuity),
    // which was clutter for a value that doesn't apply. 3-column layout below spreads Age/
    // Accumulation/Death Benefit wider across the same page width the 4-column layout used.
    const showIncome = !!data.hasIncomeRider;
    const colX = showIncome ? [M, M + 140, M + 290, M + 430] : [M, M + 180, M + 380];
    const headers = showIncome ? ["", "Accumulation Value", "Income Value", "Death Benefit"] : ["", "Accumulation Value", "Death Benefit"];

    // Table + chart together: header/rule/rows (16 + 14 + rows*16 + 14) plus the chart block
    // itself (~156, same reasoning as the cash_value charts elsewhere in this file but this
    // one's 120pt tall instead of 110). Checked as one combined block since an annuity scenario
    // is rarely long enough to need a break between its table and its single chart.
    ensureSpace(16 + 14 + milestones.length * 16 + 14 + 156);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(OBSIDIAN);
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
      if (showIncome) {
        doc.text(m.incomeValue ? "$" + formatMoney(m.incomeValue) : "—", colX[2], y);
        doc.text(m.deathBenefit ? "$" + formatMoney(m.deathBenefit) : "—", colX[3], y);
      } else {
        doc.text(m.deathBenefit ? "$" + formatMoney(m.deathBenefit) : "—", colX[2], y);
      }
      y += 16;
    });
    y += 14;

    const xLabels = milestones.map((m) => m.label);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(OBSIDIAN);
    doc.text("PROJECTED VALUE OVER TIME", M, y);
    y += 4;
    if (showIncome) {
      drawLegend(doc, M + 175, y - 2.5, [
        { label: "Accumulation Value", color: OBSIDIAN },
        { label: "Income Value", color: GRAY, dashed: true },
      ]);
    }
    y += 12;
    drawLineChart(doc, {
      x: M,
      y,
      width: W - 2 * M,
      height: 120,
      xLabels,
      series: showIncome
        ? [
            { values: milestones.map((m) => parseMoney(m.accumulationValue)), color: OBSIDIAN },
            { values: milestones.map((m) => parseMoney(m.incomeValue)), color: GRAY, dashed: true },
          ]
        : [{ values: milestones.map((m) => parseMoney(m.accumulationValue)), color: OBSIDIAN }],
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
    doc.text(timing + ": " + amount, M, y);
    y += 16;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    setText(CHARCOAL);
    const incomeNote = doc.splitTextToSize(
      "Whatever accumulation value is left unused when the client passes goes to the beneficiary as a death benefit. Unlike a life insurance death benefit, though, this isn't automatically fully tax-free: only the return of principal passes tax-free, and any growth above that is taxed to the beneficiary as ordinary income (a qualified/IRA annuity is generally taxed in full). Confirm the specifics on the carrier's illustration and with a tax advisor for the client's situation.",
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

  return y;
}

// One cash-value BUDGET's worth of section — extracted 9/25 per Karina: "i am doing 3 different
// budgets for the same product... add additional budget section." Used only by
// generateScenarioIllustrationPDF (the per-product Illustration flow's cash_value layout is the
// older, simpler Age/Cash Value/Death Benefit table with no Policy Premium/Initial Death
// Benefit/Death Benefit Milestones section at all — see the comment on generateScenarioIllustrationPDF
// itself for why that stays separate). Called once per budget in getCashValueBudgets(data) order;
// the caller draws a budget-label heading between calls when there's more than one. Deliberately
// does NOT render `notes` — the Illustration Scenarios editor's Notes field is shared across every
// budget on the scenario (it's bound to the scenario's own top-level notes, not this data), so the
// caller renders that once, after every budget section, instead of per-budget here. Owns its own
// page-break bookkeeping (PAGE_MAX_Y/ensureSpace), same reasoning as drawAnnuitySection above.
//
// 9/26: Policy Premium used to also show "Minimum to Avoid Lapse" (Level/Increasing) with its own
// disclaimer paragraph and an IUL-only "(may increase yearly)" callout — Karina: "we dont need
// that section... just have the actual premium section only that say monthly premium." Removed;
// Policy Premium is Monthly Premium alone now. minimumPremium/minimumPremiumIncreasing stay on
// CashValueBudget/CashValueIllustration (optional/additive, same as everywhere else in this file)
// so nothing already saved is lost, but nothing reads them here anymore.
function drawCashValueBudgetSection(doc: jsPDF, budget: CashValueBudget, startY: number): number {
  const W = 612;
  const M = 50;
  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const PAGE_MAX_Y = 752;
  let y = startY;
  function ensureSpace(needed: number) {
    if (y + needed > PAGE_MAX_Y) {
      doc.addPage();
      y = 68;
    }
  }

  const hasMonthlyPremium = !!(budget.monthlyPremium && budget.monthlyPremium.trim());
  if (hasMonthlyPremium) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(OBSIDIAN);
    doc.text("POLICY PREMIUM", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setText(OBSIDIAN);
    doc.text("Monthly Premium: $" + formatMoney(budget.monthlyPremium) + "/mo", M, y);
    y += 24;
  }

  // Initial Death Benefit — Level and Increasing each get their own box, side by side
  // when both are filled in (a carrier can quote a different starting face amount for each
  // election), full-width when only one is (keeps older, single-election scenarios looking the
  // same as before this split).
  const hasInitialDbLevel = !!(budget.initialDeathBenefit && budget.initialDeathBenefit.trim());
  const hasInitialDbIncreasing = !!(budget.initialDeathBenefitIncreasing && budget.initialDeathBenefitIncreasing.trim());
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
      drawInitialDbBox(M, budget.initialDeathBenefit as string, both ? "Initial Death Benefit (Level)" : "Initial Death Benefit (Face Value)");
    }
    if (hasInitialDbIncreasing) {
      drawInitialDbBox(
        both ? M + boxW + 12 : M,
        budget.initialDeathBenefitIncreasing as string,
        both ? "Initial Death Benefit (Increasing)" : "Initial Death Benefit (Increasing, Face Value)"
      );
    }
    y += 62;
  }

  if (budget.dbIncreaseAge && budget.dbIncreaseAge.trim()) {
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
      "If cash value is left untouched, death benefit begins increasing at age " + budget.dbIncreaseAge.trim() + ".",
      M + 12,
      y + 16
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(CHARCOAL);
    doc.text(
      "This can be changed at any time by calling the carrier. We recommend periodic policy reviews, which we schedule as part of our service.",
      M + 12,
      y + 29
    );
    y += 66;
  }

  // Death Benefit Milestones — see the comment on this same block in the (now-retired) inline
  // version of this section for the full history; unchanged here apart from `data.` -> `budget.`.
  const dbTargets = (budget.deathBenefitTargets ?? []).filter((t) => t.targetAmount && t.targetAmount.trim());
  if (dbTargets.length > 0) {
    const twoUp = dbTargets.length > 1;
    const dbBoxW = twoUp ? (W - 2 * M - 12) / 2 : W - 2 * M;
    const dbBoxH = 68;
    const dbRows = twoUp ? Math.ceil(dbTargets.length / 2) : dbTargets.length;
    // Exact height: the section header (8) plus every row of boxes — computed up front so the
    // header and its boxes are guaranteed to land on the same page rather than the header
    // printing at the very bottom of one page with its boxes stranded on the next.
    ensureSpace(8 + dbRows * (dbBoxH + 10));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(OBSIDIAN);
    doc.text("DEATH BENEFIT MILESTONES", M, y);
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
    y += dbRows * (dbBoxH + 10) + 22;
  }

  const milestones = budget.milestones.filter((m) => m.label.trim());
  if (milestones.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    setText(GRAY);
    doc.text("No milestones entered yet.", M, y);
    y += 20;
  } else {
    // A track (Level / Increasing) only gets a line on the chart (and a legend entry) if at
    // least one milestone actually has a number for it.
    const hasAnyValue = (values: (string | undefined)[]) => values.some((v) => !!(v && String(v).trim()));
    const cvLevelHas = hasAnyValue(milestones.map((m) => m.cvNonGuaranteed));
    const cvIncHas = hasAnyValue(milestones.map((m) => m.cvIncreasing));
    const dbLevelHas = hasAnyValue(milestones.map((m) => m.dbGuaranteed));
    const dbIncHas = hasAnyValue(milestones.map((m) => m.dbIncreasing));

    // Table — two-part Level vs. Increasing, same column layout as the original per-product
    // Illustration's Guaranteed/Non-Guaranteed table (proven to fit at this width).
    ensureSpace(20 + 14 + milestones.length * 16 + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(OBSIDIAN);
    const colX = [M, M + 105, M + 220, M + 335, M + 450];
    const colMaxW = 110;
    const headers = ["Age", "Cash Value\n(Level)", "Cash Value\n(Increasing)", "Death Benefit\n(Level)", "Death Benefit\n(Increasing)"];
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
      doc.text(m.label, colX[0], y);
      doc.setFont("helvetica", "normal");
      setText(CHARCOAL);
      doc.text(m.cvNonGuaranteed ? "$" + formatMoney(m.cvNonGuaranteed) : "—", colX[1], y);
      doc.text(m.cvIncreasing ? "$" + formatMoney(m.cvIncreasing) : "—", colX[2], y);
      doc.text(m.dbGuaranteed ? "$" + formatMoney(m.dbGuaranteed) : "—", colX[3], y);
      doc.text(m.dbIncreasing ? "$" + formatMoney(m.dbIncreasing) : "—", colX[4], y);
      y += 16;
    });
    y += 26;

    const xLabels = milestones.map((m) => m.label);

    // Cash value chart — Level solid, Increasing dashed.
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
    y += 142;

    // Death benefit chart — same Level/Increasing split.
    ensureSpace(146);
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

  return y;
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
const GOLD: RGB = [154, 145, 132]; // #9A9184 — the same warm gray-gold Logo.tsx uses for "PLAYBOOK" in the wordmark; used here only to redraw that same wordmark text, nowhere else

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
  // 752/68 (were 770/60) — more top/bottom breathing room per Karina, 9/25: "we need to have a
  // little bit more breathing room at the top and at the bottom of the page."
  const PAGE_MAX_Y = 752;
  function ensureSpace(needed: number) {
    if (y + needed > PAGE_MAX_Y) {
      doc.addPage();
      y = 68;
    }
  }

  y = drawBrandedHeader(doc, input);

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
      const headers = ["Age", "Cash Value\n(Guaranteed)", "Cash Value\n(Non-Guar.)", "Death Benefit\n(Guaranteed)", "Death Benefit\n(Non-Guar.)"];
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
    // Box grows by 16pt when finalConversionDeadline is set, to fit the second conversion line
    // below (added 9/25 per Karina — see the comment on TermIllustration.finalConversionDeadline
    // in lib/illustration.ts for why a single "no exam" deadline wasn't enough).
    const termBoxHeight = data.finalConversionDeadline ? 94 : 78;
    setFill(NEUTRAL_FILL);
    doc.roundedRect(M, y, W - 2 * M, termBoxHeight, 4, 4, "F");
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
    if (data.termLength) doc.text(formatTermLength(data.termLength) + " term", M + 280, y + 26);
    if (data.levelPremium) doc.text("$" + formatMoney(data.levelPremium) + " level premium" + premiumFreqSuffix(data.premiumFrequency), M + 280, y + 44);
    if (data.conversionDeadline) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(CHARCOAL);
      doc.text("Convertible without exam until " + data.conversionDeadline, M + 280, y + 60);
    }
    if (data.finalConversionDeadline) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(CHARCOAL);
      doc.text("Convertible with exam until " + data.finalConversionDeadline, M + 280, y + 74);
    }
    y += termBoxHeight + 18;

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
        doc.text("• " + r, M, y);
        y += 14;
      });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setText(GRAY);
      doc.text("Riders shown are subject to underwriting approval and are not guaranteed at issue.", M, y);
      doc.setFont("helvetica", "normal");
      y += 18;
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
    if (data.levelPremium) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      setText(OBSIDIAN);
      doc.text("$" + formatMoney(data.levelPremium) + premiumFreqSuffix(data.premiumFrequency), M + 280, y + 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(CHARCOAL);
      doc.text("Guaranteed Level for Life", M + 280, y + 50);
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
        doc.text("• " + r, M, y);
        y += 14;
      });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setText(GRAY);
      doc.text("Riders shown are subject to underwriting approval and are not guaranteed at issue.", M, y);
      doc.setFont("helvetica", "normal");
      y += 18;
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
    y = drawAnnuitySection(doc, data, y);
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
    "Figures shown are illustrative, entered by the advisor from the carrier's own policy illustration, not a formal projection. Actual premiums and underwriting results vary and aren't guaranteed. Neither the advisor nor Generational Playbook is liable for differences from the carrier's final offer.",
    M,
    745,
    { maxWidth: 612 - 2 * M }
  );

  // Site URL moved out of the header and into a page footer — Karina, 9/7: "the generational
  // playbook dot com that is right next to policy illustration summary should move to the bottom
  // of each page in the center, like, as a footer." Looped across every page (not just the last,
  // where the disclaimer above lands) since a multi-page illustration should carry it on each one.
  //
  // 9/11: the wordmark itself joined it here — Karina, after a client meeting, re: the header:
  // "I don't like... the way that the Generation Playbook is in the header. It needs to be at the
  // bottom center of each page on a PDF." Moved down to y=778/788.
  //
  // 9/14: collapsed back to ONE line — Karina, after the wordmark returned to the header (see the
  // header comment above), on this same footer: "it's touching the bottom of the page too much
  // where you have the website... remove the website and where that generational playbook is in
  // dark black... let's just make that generational playbook dot com because we don't need the
  // name repeated again... remove the website thing from underneath." The wordmark line now
  // holds the site URL text instead (same bold/dark styling), and the separate lighter URL line
  // below it is gone — which also fixes the bottom-margin complaint, since that second line was
  // the one sitting closest to the physical page edge (792pt tall page, was at y=788).
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setText(OBSIDIAN);
    doc.text("GenerationalPlaybook.com", W / 2, 768, { align: "center" });
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
  // 752/68 (were 770/60) — more top/bottom breathing room per Karina, 9/25: "we need to have a
  // little bit more breathing room at the top and at the bottom of the page."
  const PAGE_MAX_Y = 752;
  function ensureSpace(needed: number) {
    if (y + needed > PAGE_MAX_Y) {
      doc.addPage();
      y = 68;
    }
  }

  y = drawBrandedHeader(doc, input);

  const data = input.data;

  if (data.kind === "cash_value") {
    // Multiple budgets — added 9/25 per Karina: "i am doing 3 different budgets for the same
    // product... add additional budget section." getCashValueBudgets() returns either the real
    // `budgets` array or, for every scenario saved before 9/25, a single-item array built from the
    // old flat fields — so this loop draws exactly one section for the common single-budget case,
    // unchanged from before, and stacks additional sections (each with its own budget-label
    // heading and a divider rule) only when an advisor has actually added more.
    // Rate disclosure — added 9/26 per Karina, same conversation and same buildRateDisclosure()
    // helper as the Annuity side above: a cap rate is a ceiling, not what actually drove the
    // budgets' milestone numbers below, so the illustrated rate (if entered) is the headline
    // figure and the cap (if any) is called out separately as the max. Scenario-level, drawn once
    // above every budget rather than per-budget — see the capRate/capRateStrategy/illustratedRate
    // comment on CashValueIllustration in lib/illustration.ts for why this isn't per-budget.
    if (buildRateDisclosure(data)) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      setText(GRAY);
      const rateNote = doc.splitTextToSize(buildRateDisclosure(data), W - 2 * M);
      ensureSpace(rateNote.length * 10 + 10);
      doc.text(rateNote, M, y);
      y += rateNote.length * 10 + 10;
    }

    const budgets = getCashValueBudgets(data);
    budgets.forEach((budget, i) => {
      if (budgets.length > 1) {
        ensureSpace(30);
        if (i > 0) {
          doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
          doc.setLineWidth(1);
          doc.line(M, y, W - M, y);
          y += 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        setText(OBSIDIAN);
        doc.text(budget.label || `Budget ${i + 1}`, M, y);
        y += 20;
      }
      y = drawCashValueBudgetSection(doc, budget, y);
    });

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
    // Up to 3 options — added 9/24 per Karina: "i want to show my client 500,000 and another
    // option... allow up to 3 options?" Same stacked-full-width-row pattern as Final Expense's
    // multi-option rendering below: with just the one (primary) option, keep the exact original
    // single big box for full backward compatibility; with 2 or 3, stack one full-width row per
    // option instead. An option's term length falls back to the primary termLength when left
    // blank, matching TermOptionsEditor's placeholder text in ScenarioForm.tsx.
    const hasOption2 = !!(
      (data.deathBenefit2 && data.deathBenefit2.trim()) ||
      (data.levelPremium2 && data.levelPremium2.trim()) ||
      (data.termLength2 && data.termLength2.trim())
    );
    const hasOption3 = !!(
      (data.deathBenefit3 && data.deathBenefit3.trim()) ||
      (data.levelPremium3 && data.levelPremium3.trim()) ||
      (data.termLength3 && data.termLength3.trim())
    );

    if (!hasOption2 && !hasOption3) {
      // Box grows by 16pt when finalConversionDeadline is set, to fit the second conversion line
      // below (added 9/25 per Karina — see the comment on TermIllustration.finalConversionDeadline
      // in lib/illustration.ts for why a single "no exam" deadline wasn't enough).
      const termBoxHeight = data.finalConversionDeadline ? 94 : 78;
      setFill(NEUTRAL_FILL);
      doc.roundedRect(M, y, W - 2 * M, termBoxHeight, 4, 4, "F");
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
      if (data.termLength) doc.text(formatTermLength(data.termLength) + " term", M + 280, y + 26);
      if (data.levelPremium) doc.text("$" + formatMoney(data.levelPremium) + " level premium" + premiumFreqSuffix(data.premiumFrequency), M + 280, y + 44);
      if (data.conversionDeadline) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setText(CHARCOAL);
        doc.text("Convertible without exam until " + data.conversionDeadline, M + 280, y + 60);
      }
      if (data.finalConversionDeadline) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setText(CHARCOAL);
        doc.text("Convertible with exam until " + data.finalConversionDeadline, M + 280, y + 74);
      }
      y += termBoxHeight + 18;
    } else {
      const options: { label: string; db?: string; prem?: string; term?: string }[] = [
        { label: "Option 1", db: data.deathBenefit, prem: data.levelPremium, term: data.termLength },
      ];
      if (hasOption2) {
        options.push({
          label: "Option 2",
          db: data.deathBenefit2,
          prem: data.levelPremium2,
          term: (data.termLength2 && data.termLength2.trim()) || data.termLength,
        });
      }
      if (hasOption3) {
        options.push({
          label: "Option 3",
          db: data.deathBenefit3,
          prem: data.levelPremium3,
          term: (data.termLength3 && data.termLength3.trim()) || data.termLength,
        });
      }

      const rowH = 78;
      const rowGap = 14;
      ensureSpace(options.length * rowH + (options.length - 1) * rowGap + 18);
      options.forEach((opt, i) => {
        setFill(NEUTRAL_FILL);
        doc.roundedRect(M, y, W - 2 * M, rowH, 4, 4, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        setText(GRAY);
        doc.text(opt.label.toUpperCase(), M + 14, y + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        setText(OBSIDIAN);
        doc.text(opt.db ? "$" + formatMoney(opt.db) : "—", M + 14, y + 44);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(CHARCOAL);
        doc.text("Death Benefit", M + 14, y + 60);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        setText(OBSIDIAN);
        if (opt.term) doc.text(formatTermLength(opt.term) + " term", M + 280, y + 30);
        if (opt.prem) doc.text("$" + formatMoney(opt.prem) + " level premium" + premiumFreqSuffix(data.premiumFrequency), M + 280, y + 48);
        y += rowH + (i < options.length - 1 ? rowGap : 18);
      });

      if (data.conversionDeadline) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setText(CHARCOAL);
        doc.text("Convertible without exam until " + data.conversionDeadline, M, y);
        y += 14;
      }
      if (data.finalConversionDeadline) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setText(CHARCOAL);
        doc.text("Convertible with exam until " + data.finalConversionDeadline, M, y);
        y += 14;
      }
      if (data.conversionDeadline || data.finalConversionDeadline) y += 4;
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
        doc.text("• " + r, M, y);
        y += 14;
      });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setText(GRAY);
      doc.text("Riders shown are subject to underwriting approval and are not guaranteed at issue.", M, y);
      doc.setFont("helvetica", "normal");
      y += 18;
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
    // or 3, stack one full-width row per option (see the else branch below) — same full-row width
    // as the single-option box, not squeezed side by side.
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
      if (data.levelPremium) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        setText(OBSIDIAN);
        doc.text("$" + formatMoney(data.levelPremium) + premiumFreqSuffix(data.premiumFrequency), M + 280, y + 34);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(CHARCOAL);
        doc.text("Guaranteed Level for Life", M + 280, y + 50);
      }
      y += 96;
    } else {
      // Karina, 9/13: "enter another product name and list out on multiple policies so its easy
      // to glance at" — an option's label is its own product name when one was entered (a
      // genuinely different product/carrier than the scenario's primary), falling back to the
      // generic "Option 2"/"Option 3" when left blank (just a bigger budget tier of the primary
      // product, named in the header above).
      const options: { label: string; db?: string; prem?: string }[] = [
        { label: withCarrier(input.productName, input.carrier), db: data.deathBenefit, prem: data.levelPremium },
      ];
      if (hasOption2) {
        options.push({ label: data.productName2?.trim() || "Option 2", db: data.deathBenefit2, prem: data.levelPremium2 });
      }
      if (hasOption3) {
        options.push({ label: data.productName3?.trim() || "Option 3", db: data.deathBenefit3, prem: data.levelPremium3 });
      }

      // Reworked 9/13, same day, per Karina after seeing the side-by-side version live: "the
      // products get cut off because you put them into three little rectangles... they should
      // take the whole page like they were previously, where it was taking the entire row." The
      // 3-across boxes above (this replaced) had to ellipsis-truncate any real product name and
      // still wrapped/clipped the premium line. Now one full-width row per option, stacked top to
      // bottom — same width as the single-option box above, so the full product name, the
      // guaranteed death benefit, and the monthly premium are all visible without truncating or
      // wrapping anything.
      const rowH = 78;
      const rowGap = 14;
      ensureSpace(options.length * rowH + (options.length - 1) * rowGap + 18);
      options.forEach((opt, i) => {
        setFill(NEUTRAL_FILL);
        doc.roundedRect(M, y, W - 2 * M, rowH, 4, 4, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        setText(GRAY);
        // fitLabel is now mostly a safety net, not the load-bearing fix it was in the narrow
        // 3-across boxes — a full-width row only truncates an exceptionally long typed name.
        doc.text(fitLabel(doc, opt.label.toUpperCase(), W - 2 * M - 28), M + 14, y + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        setText(OBSIDIAN);
        doc.text(opt.db ? "$" + formatMoney(opt.db) : "—", M + 14, y + 44);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(CHARCOAL);
        doc.text("Guaranteed Death Benefit", M + 14, y + 60);
        if (opt.prem) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(18);
          setText(OBSIDIAN);
          doc.text("$" + formatMoney(opt.prem) + premiumFreqSuffix(data.premiumFrequency), M + 280, y + 44);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          setText(CHARCOAL);
          doc.text("Guaranteed Level for Life", M + 280, y + 60);
        }
        y += rowH + (i < options.length - 1 ? rowGap : 18);
      });
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
        doc.text("• " + r, M, y);
        y += 14;
      });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setText(GRAY);
      doc.text("Riders shown are subject to underwriting approval and are not guaranteed at issue.", M, y);
      doc.setFont("helvetica", "normal");
      y += 18;
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
    y = drawAnnuitySection(doc, data, y);
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
  if (y > 690) {
    doc.addPage();
    y = 68;
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
    "Figures shown are illustrative, entered by the advisor from the carrier's own policy illustration, not a formal projection. Actual premiums and underwriting results vary and aren't guaranteed. Neither the advisor nor Generational Playbook is liable for differences from the carrier's final offer.",
    M,
    Math.max(745, y + 14),
    { maxWidth: 612 - 2 * M }
  );

  // Site URL moved out of the header and into a page footer, and the wordmark joined it 9/11,
  // then collapsed back to one line 9/14 — see the identical comment in generateIllustrationPDF
  // above.
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setText(OBSIDIAN);
    doc.text("GenerationalPlaybook.com", W / 2, 768, { align: "center" });
  }

  if (action === "view") {
    window.open(doc.output("bloburl"), "_blank");
    return;
  }
  const filename = "Illustration_" + input.clientName.replace(/\s+/g, "_") + "_" + input.productName.replace(/\s+/g, "_") + ".pdf";
  doc.save(filename);
}
