import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = user?.email ?? "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (profile?.full_name) displayName = profile.full_name;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <nav className="flex h-14 items-center justify-between border-b border-[#D9CFBA] bg-white px-6">
        <div className="flex items-center gap-6">
          <span className="font-serif text-lg font-semibold text-[#1C1C1C]">GP Advisor Portal</span>
          <Link href="/clients" className="text-sm text-[#2E2E2E] hover:text-[#1C1C1C] hover:font-semibold">
            Clients
          </Link>
          <Link href="/knowledge-base" className="text-sm text-[#2E2E2E] hover:text-[#1C1C1C] hover:font-semibold">
            Knowledge Base
          </Link>
          <Link href="/client-analyzer" className="text-sm text-[#2E2E2E] hover:text-[#1C1C1C] hover:font-semibold">
            Client Analyzer
          </Link>
          <Link href="/compare" className="text-sm text-[#2E2E2E] hover:text-[#1C1C1C] hover:font-semibold">
            Compare
          </Link>
          <Link href="/downloads" className="text-sm text-[#2E2E2E] hover:text-[#1C1C1C] hover:font-semibold">
            Downloads
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#666]">{displayName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
