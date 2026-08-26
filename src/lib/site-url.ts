import { headers } from "next/headers";

// Resolves the absolute site URL for building redirect links (invite emails, etc).
// Uses NEXT_PUBLIC_SITE_URL if set, otherwise derives it from the incoming request's host —
// no extra environment variable required for this to work.
export async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
