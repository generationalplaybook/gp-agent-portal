import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAge, daysUntilNextBirthday } from "@/lib/family";

// Runs once a day (see vercel.json) and handles the juvenile-policy-ownership side of the
// family-linking feature: when a client turns 18 today, any product where someone else (e.g. a
// parent) currently owns it on their behalf transfers to them automatically, and the client's
// advisor gets a reminder to have the "you're 18 now, here's what changes" conversation.
//
// Protected by CRON_SECRET so this can't be triggered by randoms hitting the URL — Vercel Cron
// attaches "Authorization: Bearer <CRON_SECRET>" automatically to its own scheduled requests.
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

  // Candidates: anyone with a birth date on file who hasn't already been processed. Filtered
  // down to "turns 18 today" in JS below, reusing the same age math the Family card displays.
  const { data: candidates, error: candidatesError } = await supabase
    .from("clients")
    .select("id, full_name, owner_id, birth_date")
    .eq("turned_18_notice_sent", false)
    .not("birth_date", "is", null);

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  const turning18Today = (candidates ?? []).filter(
    (c) => c.birth_date && daysUntilNextBirthday(c.birth_date, today) === 0 && calculateAge(c.birth_date, today) === 18
  );

  const results: { client_id: string; full_name: string; productsTransferred: number }[] = [];

  for (const client of turning18Today) {
    // Transfer any product where this client is the one covered but someone else (e.g. a
    // parent) currently owns it — clearing owner_client_id means the client on the product now
    // owns it outright, per the convention documented on ClientProduct.owner_client_id.
    const { data: ownedByOther, error: productsError } = await supabase
      .from("client_products")
      .select("id, product_name")
      .eq("client_id", client.id)
      .not("owner_client_id", "is", null);

    if (productsError) {
      results.push({ client_id: client.id, full_name: client.full_name, productsTransferred: -1 });
      continue;
    }

    if (ownedByOther && ownedByOther.length > 0) {
      const { error: transferError } = await supabase
        .from("client_products")
        .update({ owner_client_id: null })
        .eq("client_id", client.id)
        .not("owner_client_id", "is", null);
      if (transferError) {
        results.push({ client_id: client.id, full_name: client.full_name, productsTransferred: -1 });
        continue;
      }
    }

    const productCount = ownedByOther?.length ?? 0;
    const message =
      productCount > 0
        ? `${client.full_name} turned 18 today — ownership of ${productCount} product${productCount === 1 ? "" : "s"} (${ownedByOther!
            .map((p) => p.product_name)
            .join(", ")}) transferred to them. Time for the "you're 18 now" conversation.`
        : `${client.full_name} turned 18 today. Time for the "you're 18 now" conversation.`;

    await supabase.from("reminders").insert({
      client_id: client.id,
      agent_id: client.owner_id,
      remind_at: today.toISOString(),
      message,
    });

    await supabase.from("clients").update({ turned_18_notice_sent: true }).eq("id", client.id);

    results.push({ client_id: client.id, full_name: client.full_name, productsTransferred: productCount });
  }

  return NextResponse.json({ checked: candidates?.length ?? 0, processed: results });
}
