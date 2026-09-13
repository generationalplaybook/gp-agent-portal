import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by both public intake entry points (intake/[advisorId]/actions.ts and
// pre-intake/[advisorId]/actions.ts) so a prospect who submits the Pre-Intake link and later the
// full Intake link (or vice versa, or submits either one more than once) lands on the SAME
// client record instead of a duplicate. Karina, 9/9: "if they do the pre intake, it creates their
// profile, and then they do the intake form after — is it going to match to their current
// profile, or is it going to create a whole new profile for them? We wanna make sure it doesn't
// create a new profile, and also we want to make sure that two people with the same name don't
// get mixed up. And I think the way to track that is by making the phone number and email
// mandatory" — matching is deliberately keyed on phone/email, NEVER name, for exactly that
// reason (both forms already require both fields).
//
// Scoped to one advisor's own clients (owner_id) — the same phone/email showing up under a
// different advisor is a different book of business, not a duplicate to merge.
//
// Matches on phone OR email (either counts), rather than requiring both, since a resubmission
// could have a slightly different email typed in (or vice versa) than the first time. If phone
// matches one existing client and email matches a DIFFERENT one — two different existing clients
// would have to separately share this phone and this email — picks whichever was created first.
// Rare enough not to be worth blocking submission over; flagging it here rather than pretending
// it can't happen.
export async function findMatchingClientId(
  admin: SupabaseClient,
  advisorId: string,
  phone: string,
  email: string
): Promise<string | null> {
  const trimmedPhone = phone.trim();
  const trimmedEmail = email.trim();
  const candidates: { id: string; created_at: string }[] = [];

  if (trimmedPhone) {
    const { data } = await admin
      .from("clients")
      .select("id, created_at")
      .eq("owner_id", advisorId)
      .eq("phone", trimmedPhone);
    if (data) candidates.push(...data);
  }
  if (trimmedEmail) {
    const { data } = await admin
      .from("clients")
      .select("id, created_at")
      .eq("owner_id", advisorId)
      .ilike("email", trimmedEmail);
    if (data) candidates.push(...data);
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return candidates[0].id;
}
