import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Runs once a day (see vercel.json) — a heads-up before a product's "convertible to permanent
// coverage with no medical exam" window closes, so an advisor doesn't have to remember to check
// dates themselves. Karina, 9/3: wants a reminder 60 days out; asked "30 or 60?" and she went
// with 60 — a no-exam conversion usually means carrier paperwork and back-and-forth, so 60 days
// gives real runway instead of a scramble.
//
// Same shape as check-birthdays: a plain date-window query, a one-time "already sent" flag
// (conversion_reminder_sent) so this doesn't create a fresh reminder every day the deadline is
// still approaching, protected by CRON_SECRET.
//
// 9/3, second pass: also checks final_conversion_deadline — the absolute, exam-required cutoff
// Karina described after the no-exam window (her example: "5 years no exam and convert until
// age 75"), using its own one-time flag (final_conversion_reminder_sent) so it fires
// independently of the no-exam reminder above.
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 60);
  const todayStr = today.toISOString().slice(0, 10);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);

  // Candidates: any product with a conversion deadline in [today, today + 60 days] that hasn't
  // already had its reminder created. A deadline that's already passed is left alone here — see
  // getProductStatus (src/lib/products.ts), which already flags an expired no-exam window on
  // the product card itself ("Convertible — exam now required").
  const { data: candidates, error: candidatesError } = await supabase
    .from("client_products")
    .select("id, product_name, client_id, conversion_deadline, clients(id, full_name, owner_id)")
    .eq("conversion_reminder_sent", false)
    .not("conversion_deadline", "is", null)
    .gte("conversion_deadline", todayStr)
    .lte("conversion_deadline", windowEndStr);

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  // Same window/shape, but for the final (exam-required) conversion deadline.
  const { data: finalCandidates, error: finalCandidatesError } = await supabase
    .from("client_products")
    .select("id, product_name, client_id, final_conversion_deadline, clients(id, full_name, owner_id)")
    .eq("final_conversion_reminder_sent", false)
    .not("final_conversion_deadline", "is", null)
    .gte("final_conversion_deadline", todayStr)
    .lte("final_conversion_deadline", windowEndStr);

  if (finalCandidatesError) {
    return NextResponse.json({ error: finalCandidatesError.message }, { status: 500 });
  }

  const results: { product_id: string; product_name: string; client_name: string; kind: "no_exam" | "final" }[] = [];

  for (const product of candidates ?? []) {
    const client = product.clients as unknown as { id: string; full_name: string; owner_id: string } | null;
    if (!client) continue;

    const deadlineLabel = new Date(product.conversion_deadline!).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });

    await supabase.from("reminders").insert({
      client_id: product.client_id,
      agent_id: client.owner_id,
      remind_at: today.toISOString(),
      message: `${product.product_name} (${client.full_name}) can only convert to permanent coverage without a medical exam until ${deadlineLabel} — 60 days out.`,
    });

    await supabase.from("client_products").update({ conversion_reminder_sent: true }).eq("id", product.id);

    results.push({ product_id: product.id, product_name: product.product_name, client_name: client.full_name, kind: "no_exam" });
  }

  for (const product of finalCandidates ?? []) {
    const client = product.clients as unknown as { id: string; full_name: string; owner_id: string } | null;
    if (!client) continue;

    const deadlineLabel = new Date(product.final_conversion_deadline!).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });

    await supabase.from("reminders").insert({
      client_id: product.client_id,
      agent_id: client.owner_id,
      remind_at: today.toISOString(),
      message: `${product.product_name} (${client.full_name}) reaches its final conversion deadline (exam required) on ${deadlineLabel} — 60 days out.`,
    });

    await supabase.from("client_products").update({ final_conversion_reminder_sent: true }).eq("id", product.id);

    results.push({ product_id: product.id, product_name: product.product_name, client_name: client.full_name, kind: "final" });
  }

  return NextResponse.json({
    checked: (candidates?.length ?? 0) + (finalCandidates?.length ?? 0),
    processed: results,
  });
}
