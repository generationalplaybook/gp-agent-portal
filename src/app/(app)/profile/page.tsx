import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import ProfileInfoForm from "./ProfileInfoForm";
import IntakeLinkCard from "./IntakeLinkCard";
import PreIntakeLinkCard from "./PreIntakeLinkCard";
import CalSyncCard from "./CalSyncCard";
import CarrierAndLicensingCard from "./CarrierAndLicensingCard";
import NotificationPreferencesCard from "./NotificationPreferencesCard";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [siteUrl, { data: profile, error: profileError }, { data: carrierLogins }, { data: stateLicenses }] =
    await Promise.all([
      getSiteUrl(),
      supabase
        .from("profiles")
        .select(
          "first_name, middle_name, last_name, email, phone, npn, role, scheduling_link, cal_api_key, intake_slug, notify_new_intake_email, notify_reminder_email"
        )
        .eq("id", user.id)
        .single(),
      supabase.from("carrier_logins").select("*").eq("agent_id", user.id).order("company", { ascending: true }),
      supabase.from("state_licenses").select("*").eq("agent_id", user.id).order("state", { ascending: true }),
    ]);

  // Karina, 9/9: real saved profile data (name/phone) got wiped, and the read on this exact query
  // failing silently — this destructured `error` away entirely before today — is the most
  // plausible cause: a failed read fell back to an all-blank form with Save still fully enabled,
  // so saving from that blank state overwrote whatever was really on file. Now a failed read
  // shows an explicit error instead of a blank, saveable form, below.
  const calConnected = !!profile?.cal_api_key;
  // cal_api_key never gets passed to a Client Component below — everything passed to one gets
  // serialized down to the browser, so this strips it and keeps only the boolean derived above.
  const profileForForm = profile ? { ...profile, cal_api_key: null } : null;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">My Profile</h1>

      <div className="mb-5 rounded-lg border border-[#D9CFBA] bg-white p-6" data-tour="profile-fields">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Your Info</h2>
        {profileError ? (
          <p className="rounded-md border border-[#E4BCAF] bg-[#F5E6E1] px-3 py-2 text-sm text-[#8B1A1A]">
            Couldn&rsquo;t load your saved info right now ({profileError.message}). Nothing shown here is safe to
            save over — refresh the page and try again rather than filling this back in from scratch.
          </p>
        ) : (
          <ProfileInfoForm profile={profileForForm} />
        )}
      </div>

      <div data-tour="notifications">
        <NotificationPreferencesCard
          initialNewIntake={profile?.notify_new_intake_email ?? true}
          initialReminder={profile?.notify_reminder_email ?? true}
        />
      </div>

      <div data-tour="cal-sync">
        <CalSyncCard connected={calConnected} />
      </div>

      <div data-tour="pre-link">
        <PreIntakeLinkCard siteUrl={siteUrl} advisorId={user.id} slug={profile?.intake_slug ?? null} />
      </div>

      <div className="mb-5" data-tour="full-link">
        <IntakeLinkCard siteUrl={siteUrl} advisorId={user.id} initialSlug={profile?.intake_slug ?? null} />
      </div>

      <CarrierAndLicensingCard carrierLogins={carrierLogins ?? []} stateLicenses={stateLicenses ?? []} />
    </div>
  );
}
