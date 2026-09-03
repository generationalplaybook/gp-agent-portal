import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import ProfileInfoForm from "./ProfileInfoForm";
import IntakeLinkCard from "./IntakeLinkCard";
import CalSyncCard from "./CalSyncCard";
import CarrierAndLicensingCard from "./CarrierAndLicensingCard";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [siteUrl, { data: profile }, { data: carrierLogins }, { data: stateLicenses }] = await Promise.all([
    getSiteUrl(),
    supabase
      .from("profiles")
      .select("first_name, middle_name, last_name, email, phone, npn, role, scheduling_link, cal_api_key, intake_slug")
      .eq("id", user.id)
      .single(),
    supabase.from("carrier_logins").select("*").eq("agent_id", user.id).order("company", { ascending: true }),
    supabase.from("state_licenses").select("*").eq("agent_id", user.id).order("state", { ascending: true }),
  ]);

  const calConnected = !!profile?.cal_api_key;
  // cal_api_key never gets passed to a Client Component below — everything passed to one gets
  // serialized down to the browser, so this strips it and keeps only the boolean derived above.
  const profileForForm = profile ? { ...profile, cal_api_key: null } : null;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">My Profile</h1>

      <div className="mb-5 rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Your Info</h2>
        <ProfileInfoForm profile={profileForForm} />
      </div>

      <CalSyncCard connected={calConnected} />

      <div className="mb-5">
        <IntakeLinkCard siteUrl={siteUrl} advisorId={user.id} initialSlug={profile?.intake_slug ?? null} />
      </div>

      <CarrierAndLicensingCard carrierLogins={carrierLogins ?? []} stateLicenses={stateLicenses ?? []} />
    </div>
  );
}
