import { createClient } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";
import UserMenu from "./UserMenu";

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
    <div className="flex min-h-screen flex-col bg-white">
      <nav className="flex h-14 items-center justify-between border-b border-[#D9CFBA] bg-white px-6">
        <div className="flex items-center gap-6">
          <span className="font-serif text-lg font-semibold text-[#1C1C1C]">GP Advisor Portal</span>
          <NavLinks />
        </div>
        <div className="flex items-center gap-4">
          <UserMenu displayName={displayName} isAdmin={isAdmin} />
        </div>
      </nav>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
