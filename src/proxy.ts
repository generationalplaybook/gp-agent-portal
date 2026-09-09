import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { TERMS_VERSION } from "@/lib/terms";

// /intake is the public Client Intake Link (src/app/intake/[advisorId]) — no login, ever,
// for whoever's filling it out. /medical-report and /financial-analysis are the same idea, keyed
// by a per-client token instead of the advisor's own id/slug (src/app/medical-report/[token],
// src/app/financial-analysis/[token]).
//
// NOTE (found 9/9 while building /financial-analysis): /medical-report was never added to this
// list back when it was built — its own page.tsx comment calls it "public, unauthenticated," but
// with the path missing here, a logged-OUT client opening that link would have been bounced to
// /login instead, same as any other page. Adding /financial-analysis alongside it here also fixes
// that pre-existing gap for Medical Report links already sent out.
const PUBLIC_PATHS = ["/login", "/signup", "/set-password", "/auth/confirm", "/intake", "/medical-report", "/financial-analysis"];
// Paths a logged-in user should NOT be bounced away from, even though they're public —
// an invited agent has a session the moment they click their invite email, before they've
// set a password, and needs to reach /set-password rather than get redirected to /clients.
// /intake, /medical-report, and /financial-analysis are here too so an advisor can open their
// own client's link (e.g. to preview it) while signed in without getting bounced to /clients.
const ALLOWED_WHILE_LOGGED_IN = ["/set-password", "/auth/confirm", "/intake", "/medical-report", "/financial-analysis"];
// Paths exempt from the "must accept terms" gate.
const TERMS_EXEMPT_PATHS = [
  "/terms",
  "/set-password",
  "/login",
  "/signup",
  "/auth/confirm",
  "/intake",
  "/medical-report",
  "/financial-analysis",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublic && !ALLOWED_WHILE_LOGGED_IN.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Terms-of-service gate: any signed-in agent who hasn't accepted the current terms gets
  // redirected to /terms before they can use the rest of the portal.
  if (user && !TERMS_EXEMPT_PATHS.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("terms_accepted_at, terms_version")
      .eq("id", user.id)
      .single();
    if (profile && (!profile.terms_accepted_at || profile.terms_version !== TERMS_VERSION)) {
      const url = request.nextUrl.clone();
      url.pathname = "/terms";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - anything under /api/calendar (has its own auth handling)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/calendar).*)",
  ],
};
