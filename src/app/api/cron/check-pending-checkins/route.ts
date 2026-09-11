import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdvisorOfReminder } from "@/lib/reminder-notify";

// Runs once a day (see vercel.json) — Karina, moving a client to Pending (approved for a quote but
// the premium hadn't been paid yet, so it's not actually in force): "once a client is pending, can
// we set an automatic nudge maybe for three or four days out where it goes into an automatic
// reminder to check on the pending ones?" Uses 3 days — the earlier end of what she described, so
// the advisor hears about it sooner rather than later.
//
// Same shape as check-birthdays/check-conversion-deadlines: a plain date-window query, a one-time
// "already sent" flag (pending_checkin_reminder_sent) so this doesn't create a fresh reminder
// every day the client sits in Pending, protected by CRON_SECRET. stage_entered_pending_at is set
// the moment a client's stage is changed TO "pending" and cleared on the way out (see
// updateStage/resolveQuotesOnIssue/logOutreach in clients/actions.ts) — see schema.sql section 50.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const siteUrl = request.nextUrl.origin;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 3);

  // Candidates: any client currently in the Pending stage, whose pending_checkin_reminder_sent
  // flag hasn't fired yet, who entered Pending at least 3 days ago.
  const { data: candidates, error: candidatesError } = await supabase
    .from("clients")
    .select("id, full_name, owner_id, stage_entered_pending_at")
    .eq("stage", "pending")
    .eq("pending_checkin_reminder_sent", false)
    .not("stage_entered_pending_at", "is", null)
    .lte("stage_entered_pending_at", cutoff.toISOString());

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  const results: { client_id: string; client_name: string }[] = [];

  for (const client of candidates ?? []) {
    // Unassigned (owner_id null, left over from an advisor's access being removed — see
    // admin/invite/actions.ts) has nobody to send this to yet. Skip without marking it sent, so
    // once an admin reassigns the client, the next run picks this back up for the new advisor.
    if (!client.owner_id) continue;

    const daysPending = client.stage_entered_pending_at
      ? Math.floor((now.getTime() - new Date(client.stage_entered_pending_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const message = `${client.full_name} has been Pending for ${daysPending ?? "a few"} day${daysPending === 1 ? "" : "s"} — check in on the premium payment.`;

    await supabase.from("reminders").insert({
      client_id: client.id,
      agent_id: client.owner_id,
      remind_at: now.toISOString(),
      message,
    });
    await notifyAdvisorOfReminder(supabase, client.owner_id, message, siteUrl);

    await supabase.from("clients").update({ pending_checkin_reminder_sent: true }).eq("id", client.id);

    results.push({ client_id: client.id, client_name: client.full_name });
  }

  return NextResponse.json({
    checked: candidates?.length ?? 0,
    processed: results,
  });
}
