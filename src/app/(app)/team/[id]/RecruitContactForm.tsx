"use client";

import { useRef, useState } from "react";
import PhoneInput from "../../clients/PhoneInput";
import { updateRecruitContactInfo } from "../actions";

interface Recruit {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  state: string | null;
  target_license_date: string | null;
}

// No "Save" button — every field saves itself as soon as you leave it (onBlur), same pattern as
// the Client Contact Info card. Source lives in its own field below (RecruitSourceField.tsx),
// not here, for the same reason it's split out on the client page.
export default function RecruitContactForm({ recruit }: { recruit: Recruit }) {
  const [fullName, setFullName] = useState(recruit.full_name);
  const [phone, setPhone] = useState(recruit.phone ?? "");
  const [email, setEmail] = useState(recruit.email ?? "");
  const [state, setState] = useState(recruit.state ?? "");
  const [targetDate, setTargetDate] = useState(recruit.target_license_date ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(overrides?: Partial<{ phone: string }>) {
    setStatus("saving");
    const formData = new FormData();
    formData.set("recruit_id", recruit.id);
    formData.set("full_name", fullName);
    formData.set("phone", overrides?.phone ?? phone);
    formData.set("email", email);
    formData.set("state", state);
    formData.set("target_license_date", targetDate);
    await updateRecruitContactInfo(formData);
    setStatus("saved");
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-[#666] sm:col-span-2">
        Name
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Phone
        <PhoneInput
          defaultValue={phone}
          onValueChange={setPhone}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Email
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        State <span className="font-normal text-[#707070]">(licensing/appointment)</span>
        <input
          value={state}
          onChange={(e) => setState(e.target.value)}
          onBlur={() => save()}
          placeholder="e.g. TX"
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Target license date
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <div className="flex items-end sm:col-span-2">
        <p className="h-4 text-xs font-semibold text-[#1E6B3C]">
          {status === "saving" && "Saving..."}
          {status === "saved" && "Saved ✓"}
        </p>
      </div>
    </div>
  );
}
