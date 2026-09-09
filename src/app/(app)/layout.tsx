import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";
import UserMenu from "./UserMenu";
import MobileNav from "./MobileNav";
import { TourProvider } from "./TourEngine";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = user?.email ?? "";
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    if (profile?.full_name) displayName = profile.full_name;
    isAdmin = profile?.role === "admin";
  }

  return (
    <TourProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <nav className="relative flex h-14 items-center justify-between border-b border-[#D9CFBA] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-serif text-lg font-semibold text-[#1C1C1C]">GP Advisor Portal</Link>
            {/* Full 9-link row only fits from md: (768px) up — MobileNav's hamburger drawer takes
                over below that (see the comment in NavLinks.tsx). */}
            <div className="hidden md:flex md:items-center md:gap-6">
              <NavLinks />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Hidden below md: the drawer (MobileNav) already covers Profile/Invite/Sign out, so
                there's no need to also show the display name + this dropdown on a narrow bar. */}
            <div className="hidden md:block">
              <UserMenu displayName={displayName} isAdmin={isAdmin} />
            </div>
            <MobileNav isAdmin={isAdmin} />
          </div>
        </nav>
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </TourProvider>
  );
}
