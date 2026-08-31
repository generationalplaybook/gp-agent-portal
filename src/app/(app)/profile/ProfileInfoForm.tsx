"use client";

import { useRef, useState } from "react";
import PhoneInput from "../clients/PhoneInput";
import { updateMyProfile } from "./actions";

interface Profile {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  scheduling_link: string | null;
}

export default function ProfileInfoForm({ profile }: { profile: Profile | null }) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [middleName, setMiddleName] = useState(profile?.middle_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [schedulingLink, setSchedulingLink] = useState(profile?.scheduling_link ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const formData = new FormData();
    formData.set("first_name", firstName);
    formData.set("middle_name", middleName);
    formData.set("last_name", lastName);
    formData.set("phone", phone);
    formData.set("scheduling_link", schedulingLink);
    await updateMyProfile(formData);
    setStatus("saved");
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        First name
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Middle name
        <input
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Last name
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Phone
        <PhoneInput defaultValue={phone} onValueChange={setPhone} className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666] sm:col-span-2">
        Email
        <input
          disabled
          value={profile?.email ?? ""}
          className="rounded-md border border-[#D9CFBA] bg-[#F5F0E8] px-3 py-1.5 text-sm text-[#888]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666] sm:col-span-2">
        Scheduling Link
        <input
          value={schedulingLink}
          onChange={(e) => setSchedulingLink(e.target.value)}
          placeholder="e.g. https://cal.com/your-name/consultation"
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
        <span className="mt-0.5 text-[11px] text-[#999]">
          Paste the public booking link for the event you want clients scheduling into — works with Cal.com,
          Calendly, Zoom Scheduler, or any tool that gives you a booking page (set video — Cal Video, Zoom, or
          Google Meet — inside that tool itself). Once saved, a &ldquo;Schedule a Call&rdquo; button appears on
          every client&rsquo;s profile.
        </span>
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
        >
          Save
        </button>
        <p className="text-xs font-semibold text-[#1E6B3C]">
          {status === "saving" && "Saving..."}
          {status === "saved" && "Saved ✓"}
        </p>
      </div>
    </form>
  );
}
