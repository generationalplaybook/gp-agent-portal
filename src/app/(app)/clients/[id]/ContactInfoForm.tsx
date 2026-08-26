"use client";

import { useRef, useState } from "react";
import PhoneInput from "../PhoneInput";
import { updateContactInfo } from "../actions";

interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  source: string | null;
}

// No "Save" button — every field saves itself as soon as you leave it (onBlur).
export default function ContactInfoForm({ client }: { client: Client }) {
  const [fullName, setFullName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [birthDate, setBirthDate] = useState(client.birth_date ?? "");
  const [source, setSource] = useState(client.source ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(overrides?: Partial<{ phone: string }>) {
    setStatus("saving");
    const formData = new FormData();
    formData.set("client_id", client.id);
    formData.set("full_name", fullName);
    formData.set("phone", overrides?.phone ?? phone);
    formData.set("email", email);
    formData.set("birth_date", birthDate);
    formData.set("source", source);
    await updateContactInfo(formData);
    setStatus("saved");
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Full name
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
        Birthdate
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Source
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
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
