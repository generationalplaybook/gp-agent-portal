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
  client_id: string;
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

export const PRODUCT_TYPE_OPTIONS = ["Term Life", "Whole Life", "IUL", "Annuity", "Other"];

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
  issue_date: string | null;
  expiration_date: string | null;
  conversion_deadline: string | null;
  conversion_notes: string | null;
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
