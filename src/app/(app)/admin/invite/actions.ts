"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { sendEmail } from "@/lib/email";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    throw new Error("Only admins can invite agents.");
  }
  return { supabase, user: user! };
}

// Next.js hides any THROWN error from a Server Action behind a generic message in
// production ("Minified React error #441...") to avoid leaking internals — so instead
// of throwing, these return a result the caller can show directly. A catch-all here
// means even something unexpected (like a missing env var) surfaces its real message
// instead of that wall of text.

export async function inviteAgent(
  email: string,
  firstName: string,
  middleName: string,
  lastName: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFirst = firstName.trim();
    const trimmedMiddle = middleName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedEmail) return { ok: false, error: "Email is required." };

    const siteUrl = await getSiteUrl();
    const admin = createAdminClient();

    // full_name is computed by a DB trigger (see schema.sql) from these three fields, once
    // handle_new_user() creates the profile row — don't pass full_name here.
    const { error } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
      data: { first_name: trimmedFirst, middle_name: trimmedMiddle, last_name: trimmedLast },
      redirectTo: `${siteUrl}/set-password`,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/invite");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send invite." };
  }
}

// Resend an invite — Karina, 9/9: "can we have a resend invite option on pending people because
// they may have not gotten the email or accidentally deleted it or it has expired." Only makes
// sense for someone who's still "Invite Pending" (see AgentRoleRow.tsx — !isDisabled &&
// !inviteAccepted); their auth user + profile row already exist (created by handle_new_user() the
// moment the first invite was sent), just unconfirmed.
//
// Two attempts, in order, because Supabase's own behavior here is genuinely inconsistent across
// projects/versions for an email that's already invited-but-unconfirmed — some reports say calling
// inviteUserByEmail again just resends cleanly, others say it errors "already registered":
//   1. Call inviteUserByEmail again — if it works, it's the simplest path and uses Supabase's own
//      invite email template, no dependency on Resend being configured.
//   2. If that errors, generate a fresh token ourselves (generateLink) and send our own email via
//      Resend (src/lib/email.ts) — needs RESEND_API_KEY / REMINDER_FROM_EMAIL set. Deliberately
//      built from the link's `hashed_token`, not its `action_link` — action_link points straight
//      at Supabase's own /auth/v1/verify, which a mail provider's automated link-prescan would hit
//      and burn instantly (see the comment at the top of src/app/auth/confirm/page.tsx explaining
//      why this project routes through a manual "click to confirm" page instead). This builds that
//      same safe link by hand: /auth/confirm?token_hash=...&type=invite&next=...
// If both fail, the error is real and surfaced — Remove Access + re-invite (Karina's own
// fallback) is still there as the reliable path.
export async function resendInvite(agentId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email, first_name, middle_name, last_name")
      .eq("id", agentId)
      .single();
    if (profileError || !profile?.email) {
      return { ok: false, error: profileError?.message ?? "Could not find this advisor's email." };
    }

    const siteUrl = await getSiteUrl();

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(profile.email, {
      data: {
        first_name: profile.first_name ?? "",
        middle_name: profile.middle_name ?? "",
        last_name: profile.last_name ?? "",
      },
      redirectTo: `${siteUrl}/set-password`,
    });
    if (!inviteError) {
      revalidatePath("/admin/invite");
      return { ok: true };
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: profile.email,
      options: {
        redirectTo: `${siteUrl}/set-password`,
        data: {
          first_name: profile.first_name ?? "",
          middle_name: profile.middle_name ?? "",
          last_name: profile.last_name ?? "",
        },
      },
    });
    const hashedToken = linkData?.properties?.hashed_token;
    if (linkError || !hashedToken) {
      return { ok: false, error: linkError?.message ?? inviteError.message };
    }

    const confirmUrl = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=invite&next=${encodeURIComponent("/set-password")}`;
    const firstName = profile.first_name ? `, ${profile.first_name}` : "";
    const { ok: sent, error: sendError } = await sendEmail({
      to: profile.email,
      subject: "Your invite to GP Advisor Portal",
      html: `
        <p>Hi${firstName},</p>
        <p>Here&rsquo;s a fresh invitation to GP Advisor Portal.</p>
        <p><a href="${confirmUrl}">Accept your invitation</a></p>
        <p>If that link doesn&rsquo;t work, copy and paste this into your browser: ${confirmUrl}</p>
      `,
    });
    if (!sent) return { ok: false, error: sendError ?? "Could not send the invite email." };

    revalidatePath("/admin/invite");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not resend the invite." };
  }
}

export async function updateAgentRole(agentId: string, role: "agent" | "admin"): Promise<ActionResult> {
  try {
    await requireAdmin();
    // Updating someone else's profile row requires the service-role client — the standard
    // RLS policy only lets an agent update their own row.
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ role }).eq("id", agentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/invite");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update role." };
  }
}

// "Remove access" — added 9/6, see schema.sql section 43 / migration_add_advisor_removal.sql.
// Deliberately NOT a real delete: clients.owner_id cascades on profile delete, which would wipe
// this advisor's entire book of business. Instead this bans their auth login, marks
// profiles.disabled_at for the UI, and un-assigns (owner_id = null) every client they owned so
// an admin can reassign the book below rather than it sitting under a login nobody can use.
export async function removeAgentAccess(agentId: string): Promise<ActionResult> {
  try {
    const { user } = await requireAdmin();
    if (agentId === user.id) return { ok: false, error: "You can't remove your own access." };

    const admin = createAdminClient();

    const { error: unassignError } = await admin.from("clients").update({ owner_id: null }).eq("owner_id", agentId);
    if (unassignError) return { ok: false, error: unassignError.message };

    // A very long ban rather than deleting the auth user — deleting it would cascade-delete the
    // profile row (see the FK above), and per Supabase's admin API a ban_duration this long is
    // effectively permanent while still being reversible (see restoreAgentAccess below).
    const { error: banError } = await admin.auth.admin.updateUserById(agentId, { ban_duration: "876000h" });
    if (banError) return { ok: false, error: banError.message };

    const { error: profileError } = await admin
      .from("profiles")
      .update({ disabled_at: new Date().toISOString() })
      .eq("id", agentId);
    if (profileError) return { ok: false, error: profileError.message };

    revalidatePath("/admin/invite");
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove this advisor's access." };
  }
}

// Undo for removeAgentAccess — doesn't touch clients (whatever was reassigned or left Unassigned
// stays exactly where an admin put it; this only restores the ability to log in).
export async function restoreAgentAccess(agentId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    // "none" is Supabase's documented value for clearing an existing ban via this same API —
    // please double check this actually un-blocks sign-in the first time you test it, since this
    // couldn't be verified against a live project from here.
    const { error: banError } = await admin.auth.admin.updateUserById(agentId, { ban_duration: "none" });
    if (banError) return { ok: false, error: banError.message };

    const { error: profileError } = await admin.from("profiles").update({ disabled_at: null }).eq("id", agentId);
    if (profileError) return { ok: false, error: profileError.message };

    revalidatePath("/admin/invite");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not restore this advisor's access." };
  }
}

// Reassign one or several Unassigned clients (owner_id = null, from removeAgentAccess above) to
// an advisor. Also moves reminders and client_meetings for these clients — both carry their own
// separate agent_id, not just client_id — to the new owner, so nothing pending silently
// disappears from either advisor's view.
export async function reassignClients(clientIds: string[], newOwnerId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!newOwnerId) return { ok: false, error: "Pick an advisor to assign to." };
    if (clientIds.length === 0) return { ok: false, error: "Select at least one client." };

    const admin = createAdminClient();

    const { error: clientError } = await admin.from("clients").update({ owner_id: newOwnerId }).in("id", clientIds);
    if (clientError) return { ok: false, error: clientError.message };

    const { error: remindersError } = await admin
      .from("reminders")
      .update({ agent_id: newOwnerId })
      .in("client_id", clientIds);
    if (remindersError) return { ok: false, error: remindersError.message };

    const { error: meetingsError } = await admin
      .from("client_meetings")
      .update({ agent_id: newOwnerId })
      .in("client_id", clientIds);
    if (meetingsError) return { ok: false, error: meetingsError.message };

    revalidatePath("/admin/invite");
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reassign." };
  }
}
