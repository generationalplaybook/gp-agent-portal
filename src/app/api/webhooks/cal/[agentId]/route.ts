import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Receives Cal.com's webhook calls once an advisor has connected their account (see
// connectCalCom in src/app/(app)/profile/actions.ts, which registers a webhook pointed at this
// exact URL). Built against Cal.com's documented v1 webhook format — HMAC SHA-256 signature in
// the x-cal-signature-256 header, over the raw request body, using the secret we generated at
// connect time. Verified this way rather than trusting the URL alone, since the agentId in the
// path is guessable/public.
//
// Only syncs a booking when the attendee's email matches an existing client of this advisor's —
// that's true for the normal case (the advisor sent a client their personalized "Schedule a
// Call" link, which already carries that client's email), but a booking made some other way,
// under an email that doesn't match anyone on file, is intentionally left alone rather than
// guessed at or used to create a new client record.

interface CalAttendee {
  email?: string;
  name?: string;
}

interface CalBookingPayload {
  uid?: string;
  rescheduleUid?: string;
  startTime?: string;
  location?: unknown;
  title?: string;
  attendees?: CalAttendee[];
}

interface CalWebhookBody {
  triggerEvent?: string;
  payload?: CalBookingPayload;
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Cal.com's `location` field can be a plain string (a video link, "Cal Video", an address) or,
// depending on the integration, a structured value — this only handles the plain-string case
// and otherwise leaves it blank rather than guessing at a shape. Worth revisiting once a real
// payload from a connected advisor's account shows what it actually looks like.
function extractLocation(loc: unknown): string | null {
  return typeof loc === "string" && loc.trim() ? loc.trim() : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const rawBody = await request.text();

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, cal_webhook_secret")
    .eq("id", agentId)
    .maybeSingle();

  if (!profile?.cal_webhook_secret) {
    return NextResponse.json({ error: "Not connected." }, { status: 404 });
  }

  const signature = request.headers.get("x-cal-signature-256");
  if (!verifySignature(rawBody, signature, profile.cal_webhook_secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: CalWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { triggerEvent, payload } = body;
  if (!triggerEvent || !payload) {
    return NextResponse.json({ ok: true }); // Nothing to do with this one.
  }

  if (triggerEvent === "BOOKING_CANCELLED") {
    if (payload.uid) {
      await supabase
        .from("client_meetings")
        .delete()
        .eq("agent_id", agentId)
        .eq("source", "cal.com")
        .eq("external_booking_uid", payload.uid);
    }
    return NextResponse.json({ ok: true });
  }

  if (triggerEvent === "BOOKING_RESCHEDULED") {
    const previousUid = payload.rescheduleUid;
    if (previousUid && payload.uid && payload.startTime) {
      const { data: existing } = await supabase
        .from("client_meetings")
        .select("id")
        .eq("agent_id", agentId)
        .eq("source", "cal.com")
        .eq("external_booking_uid", previousUid)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("client_meetings")
          .update({
            meeting_at: payload.startTime,
            external_booking_uid: payload.uid,
            location: extractLocation(payload.location),
          })
          .eq("id", existing.id);
        return NextResponse.json({ ok: true });
      }
    }
    // Fall through to BOOKING_CREATED-style handling — the original booking was never synced
    // (e.g. the attendee email didn't match a client at the time), so treat the reschedule as a
    // fresh booking attempt instead of silently dropping it.
  }

  if (triggerEvent === "BOOKING_CREATED" || triggerEvent === "BOOKING_RESCHEDULED") {
    const email = payload.attendees?.[0]?.email?.trim().toLowerCase();
    if (!email || !payload.uid || !payload.startTime) {
      return NextResponse.json({ ok: true });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("owner_id", agentId)
      .ilike("email", email)
      .maybeSingle();

    if (!client) {
      // No matching client on file under this email — intentionally not synced, per the note
      // at the top of this file.
      return NextResponse.json({ ok: true });
    }

    await supabase.from("client_meetings").insert({
      client_id: client.id,
      agent_id: agentId,
      meeting_at: payload.startTime,
      location: extractLocation(payload.location),
      notes: typeof payload.title === "string" ? payload.title : null,
      source: "cal.com",
      external_booking_uid: payload.uid,
    });
    return NextResponse.json({ ok: true });
  }

  // Any other event type Cal.com might send (e.g. MEETING_ENDED) — nothing to do with it here.
  return NextResponse.json({ ok: true });
}
