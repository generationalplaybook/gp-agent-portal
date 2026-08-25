export interface DownloadItem {
  name: string;
  desc: string;
  file: string;
  badge: string;
  label: string;
}

export const DOWNLOADS: DownloadItem[] = [
  { name: "North American Product Cheat Sheet", desc: "Builder Plus IUL 4, Smart Builder IUL 3, Protection Builder IUL 2, ADDvantage Term, Accumulation IUL, Juvenile policies", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a5975d2cfb5ac4a3715ce27/1784247762806/North+American+Life+Insurance+Cheat+Sheet_Generational+Playbook.pdf", badge: "b-na", label: "North American" },
  { name: "Ethos Product Cheat Sheet", desc: "Term Life, TruStage Term, Term With Living Benefits, Final Expense, Accumulation IUL, Ethos Protection IUL, Estate Plans, Juvenile IUL", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a59758b6327ca7c05ef4eac/1784247691522/Ethos+Life+Insurance+Cheat+Sheet_Generational+Playbook.pdf", badge: "b-ethos", label: "Ethos" },
  { name: "F&G Life Insurance Cheat Sheet", desc: "Pathsetter IUL, Everlast IUL — accumulation vs legacy focus, living benefits, InstApproval", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a5975f1285dd55cce50f305/1784247793685/F%26G+Life+Insurance+Cheat+Sheet_Generational+Playbook.pdf", badge: "b-fg", label: "F&G Life" },
  { name: "F&G Annuities Cheat Sheet", desc: "AccumulatorPlus, Flex Accumulator, Safe Income Advantage, Accelerator Plus, 1-2-3, Prosperity Elite, Guarantee Platinum MYGA", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a597625285dd55cce510581/1784247845339/F%26G+Annuity+Cheat+Sheet_Generational+Playbook.pdf", badge: "b-fg", label: "F&G Annuities" },
  { name: "Athene Annuities Cheat Sheet", desc: "Ascent Pro Bonus, Performance Elite, Performance Elite Plus, Agility, AccuMax, Aviator, MaxRate MYGA, Activate SPIA", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a59756ae99fed762256dde2/1784247658748/Athene+Annuity+Cheat+Sheet_Generational+Playbook.pdf", badge: "b-athene", label: "Athene" },
  { name: "Annuity Tax Reference Guide", desc: "Qualified vs non-qualified, LIFO, withdrawal taxation, death benefit taxation, MEC, annuitization, IUL vs annuity, client objections", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a59751a462080455d1e44dc/1784247578920/Annuity+Tax+Guide_Generational+Playbook.pdf", badge: "b-concept", label: "Tax Guide" },
  { name: "Rollover Reference Guide", desc: "What can be rolled where, annuity vs IUL vs Roth, when to recommend each, rollover steps, Roth vs IUL objection handler", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a5975b6a055ab7283838bd0/1784247734988/Rollover+Guide_Generational+Playbook.pdf", badge: "b-concept", label: "Rollovers" },
  { name: "IUL Illustration Guide", desc: "Every field in the illustration snapshot explained — MEC, 7 Pay, GPT, Target Premium, riders, policy loans, post-year-7 rules, agent checklist", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a597833a22be37c22b43b37/1784248371887/IUL+Illustration+Guide_Generational+Playbook.pdf", badge: "b-na", label: "IUL Guide" },
  { name: "Living Benefits Client Guide", desc: "Client-facing one-pager — Critical, Chronic, Terminal illness benefits explained in plain language. Safe to share with prospects.", file: "https://static1.squarespace.com/static/672bc9bda2050b45c6d14657/t/6a5ae9ffe5bac871a632f5c5/1784343039957/Living+Benefits+Guide_Generational+Playbook.pdf", badge: "b-concept", label: "Client Facing" },
  { name: "Ameritas Life Insurance Cheat Sheet", desc: "FLX Living Benefits Term, Instant Term, Value Plus IUL, Value Plus Survivor IUL, Ethos IUL (issued by Ameritas)", file: "", badge: "b-ameritas", label: "Ameritas Life" },
  { name: "Ameritas Annuities Cheat Sheet", desc: "Accumulation 7 Index, Income 10 Index, ApexAdvantage, FPDA MYGA, SPIA", file: "", badge: "b-ameritas", label: "Ameritas Annuities" },
  { name: "Nationwide Life Insurance Cheat Sheet", desc: "IUL Accumulator III, YourLife IUL Protector, CareMatters, Heritage Single Premium Whole Life", file: "", badge: "b-nw", label: "Nationwide Life" },
  { name: "Nationwide Annuities Cheat Sheet", desc: "Peak Series, New Heights Series (Select 8/9/10/12), Summit", file: "", badge: "b-nw", label: "Nationwide Annuities" },
  { name: "Mutual of Omaha Life Insurance Cheat Sheet", desc: "Income Advantage IUL, Life Protection Advantage IUL, IUL Express, Term, Living Promise", file: "", badge: "b-moo", label: "MOO Life" },
  { name: "Mutual of Omaha Annuities Cheat Sheet", desc: "Ultra Advantage FIA, Ultra-Premier MYGA, Ultra-Secure Plus MYGA, Ultra-Income/DIA family", file: "", badge: "b-moo", label: "MOO Annuities" },
];
