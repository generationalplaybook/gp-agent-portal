export type ClientStage = "lead" | "quoted" | "applied" | "issued" | "pending" | "declined";

export const CLIENT_STAGES: { value: ClientStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "#8b6a00" },
  { value: "quoted", label: "Quoted", color: "#0057b8" },
  { value: "applied", label: "Applied", color: "#4b2d83" },
  { value: "issued", label: "Issued", color: "#00693c" },
  // For a client who already has a policy in force but is actively being worked on new
  // business — keeps them out of "Issued" (which now reads as "nothing to do") without losing
  // their existing coverage, which stays visible in Products the whole time either way.
  { value: "pending", label: "Pending", color: "#0e7490" },
  { value: "declined", label: "Declined", color: "#8b1a1a" },
];

export const GENDER_OPTIONS = ["Male", "Female"];

// Offered as a plain dropdown rather than derived from state, since several states span more
// than one zone (Texas, Florida, Tennessee, Kentucky, Indiana, Michigan, and others) and Arizona
// doesn't observe daylight saving — city/state are just reference context, the timezone itself
// is always an explicit pick. Values are IANA zone ids, the only thing Intl.DateTimeFormat (and
// so src/lib/timezone.ts) actually understands.
export const US_TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Mountain — Arizona (no daylight saving)" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

// Team / Recruits — Karina's own words for the pipeline: "Lead" (watching the intro calls,
// progressing through the early conversation), "Studying" (actively studying for their license
// exam), "Licensed" (active, appointed agent). Deliberately flat, just 3 stages — no
// upline/downline, and nothing here tracks commission (the broker already handles that).
export type RecruitStage = "lead" | "studying" | "licensed";

export const RECRUIT_STAGES: { value: RecruitStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "#8b6a00" },
  { value: "studying", label: "Studying", color: "#0057b8" },
  { value: "licensed", label: "Licensed", color: "#00693c" },
];

export interface Recruit {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  // State they're licensing/appointed in — carrier appointments are state-specific.
  state: string | null;
  stage: RecruitStage;
  source: string | null;
  target_license_date: string | null;
  notes_summary: string | null;
  // Optional cross-reference to an existing Client who wants to become an agent. This links the
  // two records without merging them — the client's own history stays exactly as it was.
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  role: "agent" | "admin";
  created_at: string;
  // Cal.com booking link for this advisor's client-consultation event type. Video (Cal Video,
  // Zoom, Google Meet) is configured on that event type inside Cal.com itself — this is just
  // the link the portal opens/sends. Null until the advisor sets it in My Profile.
  scheduling_link?: string | null;
}

// Carrier Logins + State Licenses (added 9/3) — a private, per-advisor replacement for the messy
// personal spreadsheet Karina was keeping her broker/carrier portal logins in. Lives on My
// Profile, not on any client — this is the same info regardless of which client she's working
// on. Deliberately no expiration/renewal/status fields on StateLicense — that's compliance data
// already tracked authoritatively in SureLC; this is organization/quick-access only.
export interface CarrierLogin {
  id: string;
  agent_id: string;
  company: string;
  username: string | null;
  password: string | null;
  life_agent_number: string | null;
  annuity_agent_number: string | null;
  agency_number: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface StateLicense {
  id: string;
  agent_id: string;
  state: string;
  license_number: string | null;
  is_resident: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  owner_id: string;
  // full_name is auto-derived (by a DB trigger) from first/middle/last — read it anywhere you
  // need a display string, but write first_name/middle_name/last_name, never full_name directly.
  full_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  stage: ClientStage;
  source: string | null;
  follow_up_at: string | null;
  follow_up_note: string | null;
  notes_summary: string | null;
  family_id: string | null;
  family_relationship: string | null;
  turned_18_notice_sent: boolean;
  // Set true when this client was created through an advisor's public Client Intake Link —
  // the advisor hasn't reviewed/triaged it yet. household_summary is a short plain-text note
  // from the intake form's lightweight Family checkboxes (Spouse / Children + ages / Aging
  // parent(s) or other dependents). Cleared (false) via "Mark Reviewed" on the client page;
  // household_summary itself stays visible either way.
  intake_pending_review: boolean;
  household_summary: string | null;
  // Captured at New Client (or added later on the profile's Contact Info card) — kept on the
  // client record itself so it's available for underwriting conversations without needing a
  // Client Analyzer run first. Independent of any saved analysis's own height/weight, which
  // stays frozen at whatever it was when that analysis ran.
  height_ft: number | null;
  height_in: number | null;
  weight: number | null;
  // Unguessable per-client token for the public Medical Condition Report link — deliberately NOT
  // the client's own id, since health information is more sensitive than the general Intake
  // form (which does use the advisor's own id/slug). See MedicalCondition below.
  medical_report_token: string;
  // City/state are reference context (also just useful to have on file); timezone is the
  // explicit IANA zone id an advisor picks — see US_TIMEZONE_OPTIONS above and
  // src/lib/timezone.ts for how it's turned into "N hours ahead/behind you."
  city: string | null;
  state: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

// Medical Condition Report (added 9/3) — a universal, condition-agnostic questionnaire for
// gathering enough detail to call carrier underwriting for an informal risk assessment before a
// formal application. One row per condition per client — a client can log more than one.
// Deliberately scoped to the condition itself, nothing client-level (tobacco, family history,
// etc. don't live here — height/weight already live on Client above and stay there).
export interface MedicalConditionEvent {
  date: string;
  description: string;
}

export interface MedicalConditionMedication {
  name: string;
  dosage: string;
  start_date: string;
  lifelong: boolean;
}

export interface MedicalCondition {
  id: string;
  client_id: string;
  condition_name: string;
  onset_date: string | null;
  current_status: string | null;
  latest_report_date: string | null;
  latest_report_summary: string | null;
  hospitalizations: string | null;
  additional_notes: string | null;
  // The initial event plus any recurrences (Karina's own example: a stroke, then two more) —
  // kept as a jsonb array rather than a child table since the shape is simple and doesn't need
  // its own relational identity, same reasoning as IllustrationScenario.data.
  events: MedicalConditionEvent[];
  medications: MedicalConditionMedication[];
  // True when submitted through the public client-facing link rather than entered by the agent
  // live on a call.
  submitted_by_client: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface ClientTask {
  id: string;
  client_id: string;
  title: string;
  done: boolean;
  due_at: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  // Exactly one of client_id / recruit_id is ever set — see the check constraint added with
  // Team/Recruits (schema.sql section 28). A reminder is either "follow up with this client" or
  // "follow up with this recruit," never both.
  client_id: string | null;
  recruit_id: string | null;
  agent_id: string;
  remind_at: string;
  message: string | null;
  channel: "email" | "sms";
  sent_at: string | null;
  created_at: string;
}

// An in-person (or otherwise not-Cal.com-booked) meeting entered directly on the client's
// profile. The calendar invite that lands on actual calendars is generated client-side from
// this row (see src/lib/ics.ts) — this table is just the record.
export interface ClientMeeting {
  id: string;
  client_id: string;
  agent_id: string;
  meeting_at: string;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export const PRODUCT_TYPE_OPTIONS = ["Term Life", "Whole Life", "IUL", "Final Expense", "Annuity", "Other"];

// The riders that show up often enough to offer as one-click checkboxes when logging a product.
// Anything else (Ethos Perks, a carrier-specific endorsement, etc.) gets typed in as a custom
// rider instead — riders vary a lot by carrier, so this list is deliberately just the common
// ones, not exhaustive.
export const COMMON_RIDER_OPTIONS = [
  "Accelerated Death Benefit Rider – Terminal Illness",
  "Accelerated Death Benefit Rider – Critical Illness",
  "Accelerated Death Benefit Rider – Chronic Illness",
  "Overloan Protection Benefit Endorsement",
  "Protected Death Benefit Endorsement",
];

export interface ClientProduct {
  id: string;
  client_id: string;
  product_name: string;
  product_type: string | null;
  carrier: string | null;
  // The carrier's own policy/contract number once issued — blank on a quote/application that
  // hasn't been issued yet.
  policy_number: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  // Whether this product can convert to a permanent policy at all — controls whether the
  // conversion-related fields below show on the Add/Edit form, and whether "Mark Conversion
  // Pending" appears on the card. Not every product type has a conversion window (e.g. an IUL or
  // annuity never does), so this keeps those fields from cluttering products they don't apply to.
  is_convertible: boolean;
  conversion_deadline: string | null;
  conversion_notes: string | null;
  // Set true once the 60-days-out auto-reminder has been created for this product's
  // conversion_deadline, so the daily cron doesn't create a duplicate every day it's still
  // approaching. Not meant to be edited from the UI.
  conversion_reminder_sent: boolean;
  // The absolute final date this product can convert to permanent coverage AT ALL, once a
  // medical exam is required (after conversion_deadline, the no-exam window, has passed) —
  // e.g. "5 years no-exam, convertible with exam until age 75." Optional — not every product's
  // final cutoff is known/entered.
  final_conversion_deadline: string | null;
  // Same one-time-only pattern as conversion_reminder_sent, for the 60-days-out reminder before
  // final_conversion_deadline. Not meant to be edited from the UI.
  final_conversion_reminder_sent: boolean;
  // Set by the advisor when they know the no-exam conversion window was missed or the client
  // declined to convert during it — the date that happened, not the deadline itself.
  no_exam_declined_at: string | null;
  // Manual workflow status (not date-derived): set when the advisor marks this product as
  // actively being converted, and again once the new permanent policy is actually issued
  // elsewhere as its own Product. See markConversionPending/markConverted in clients/actions.ts.
  conversion_pending_at: string | null;
  converted_at: string | null;
  face_amount: number | null;
  premium: number | null;
  // The bare-minimum monthly premium that keeps the policy from lapsing — usually lower than
  // `premium` (the planned/target payment), common on UL/IUL products. So an advisor can find
  // it fast if a policy shows as lapsed.
  minimum_premium: number | null;
  notes: string | null;
  riders: string[];
  // Who currently owns this product, when it's someone other than the client it's attached
  // to — e.g. a parent owns a juvenile policy until the covered child turns 18. Null means
  // the client on the product owns it outright.
  owner_client_id: string | null;
  // True while this is a candidate quote being compared, not yet the confirmed policy — set
  // automatically when a product is added while the client's pipeline stage is "Quoted".
  // Resolved when the client moves to "Issued": the advisor picks which quote won, that one
  // gets flipped to false, and the rest are deleted (see resolveQuotesOnIssue in
  // src/app/(app)/clients/actions.ts).
  is_quote: boolean;
  created_at: string;
  updated_at: string;
}

// The saved Policy Illustration Summary for a product — advisor-entered highlights from the
// carrier's own illustration, condensed for a client-facing PDF. `data` shape depends on
// product_type (see src/lib/illustration.ts) — jsonb because IUL/Whole Life, Term, and Annuity
// need completely different fields, same pattern as client_analyses.result.
export interface ProductIllustration {
  id: string;
  product_id: string;
  client_id: string;
  product_type: string | null;
  data: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// A lightweight, exploratory "let's see the numbers" record — deliberately NOT tied to a
// ClientProduct. Lets an advisor run/compare numbers for options a client hasn't committed to
// yet without it showing up as real coverage in Products. See the schema comment (section 25)
// and src/app/(app)/clients/[id]/scenarios/actions.ts for the full "promote to a real Product"
// flow via converted_product_id.
export interface IllustrationScenario {
  id: string;
  client_id: string;
  product_name: string;
  product_type: string | null;
  carrier: string | null;
  data: unknown;
  notes: string | null;
  converted_product_id: string | null;
  created_at: string;
  updated_at: string;
}
