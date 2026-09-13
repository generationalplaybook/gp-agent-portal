import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

// Shared by both daily reminder crons (check-birthdays, check-conversion-deadlines) — right after
// either one inserts an automatic reminder row, this checks whether that reminder's advisor has
// opted in to reminder-alert emails (profiles.notify_reminder_email, default true — Karina, 9/9)
// and, if so, emails them the same message that just landed in their Reminders list.
//
// Deliberately does NOT add its own lead time on top of what the cron already computed — e.g. the
// conversion-deadline cron already creates its reminder 90 days before the deadline, and the
// birthday cron creates its reminder the day the milestone happens. The reminder being created IS
// the heads-up; this just also puts it in their inbox for advisors who'd rather not have to be in
// the portal to catch it. Scoped to just these two crons' automatic reminders, not manually-added
// ones — Karina, 9/9: "just the auto ones."
export async function notifyAdvisorOfReminder(
  admin: SupabaseClient,
  agentId: string,
  message: string,
  siteUrl: string
): Promise<void> {
  const { data: advisor } = await admin
    .from("profiles")
    .select("email, full_name, notify_reminder_email")
    .eq("id", agentId)
    .maybeSingle();

  if (!advisor?.email || advisor.notify_reminder_email === false) return;

  await sendEmail({
    to: advisor.email,
    subject: "New reminder — GP Advisor Portal",
    html: `
      <p>Hi ${advisor.full_name ?? "there"},</p>
      <p>${message}</p>
      <p><a href="${siteUrl}/reminders">View your reminders</a></p>
      <p style="color:#888;font-size:12px;">You're getting this because reminder alerts are turned on in
      My Profile. You can turn them off there any time.</p>
    `,
  });
}
