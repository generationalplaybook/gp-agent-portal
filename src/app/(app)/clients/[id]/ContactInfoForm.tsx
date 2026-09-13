"use client";

import { useRef, useState } from "react";
import PhoneInput from "../PhoneInput";
import { updateContactInfo } from "../actions";
import { GENDER_OPTIONS, US_TIMEZONE_OPTIONS } from "@/lib/types";
import { calculateAge } from "@/lib/family";

interface Client {
  id: string;
  full_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  height_ft: number | null;
  height_in: number | null;
  weight: number | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
}

// No "Save" button — every field saves itself as soon as you leave it (onBlur).
// Lead Source lives in its own field in the sidebar (SourceField.tsx), not here — see the note
// on updateContactInfo in ../actions.ts for why.
export default function ContactInfoForm({ client }: { client: Client }) {
  const [firstName, setFirstName] = useState(client.first_name ?? "");
  const [middleName, setMiddleName] = useState(client.middle_name ?? "");
  const [lastName, setLastName] = useState(client.last_name ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [birthDate, setBirthDate] = useState(client.birth_date ?? "");
  const [gender, setGender] = useState(client.gender ?? "");
  const [heightFt, setHeightFt] = useState(client.height_ft?.toString() ?? "");
  const [heightIn, setHeightIn] = useState(client.height_in?.toString() ?? "");
  const [weight, setWeight] = useState(client.weight?.toString() ?? "");
  const [city, setCity] = useState(client.city ?? "");
  const [state, setState] = useState(client.state ?? "");
  const [timezone, setTimezone] = useState(client.timezone ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(overrides?: Partial<{ phone: string; gender: string; timezone: string }>) {
    setStatus("saving");
    const formData = new FormData();
    formData.set("client_id", client.id);
    formData.set("first_name", firstName);
    formData.set("middle_name", middleName);
    formData.set("last_name", lastName);
    formData.set("phone", overrides?.phone ?? phone);
    formData.set("email", email);
    formData.set("birth_date", birthDate);
    formData.set("gender", overrides?.gender ?? gender);
    formData.set("height_ft", heightFt);
    formData.set("height_in", heightIn);
    formData.set("weight", weight);
    formData.set("city", city);
    formData.set("state", state);
    formData.set("timezone", overrides?.timezone ?? timezone);
    await updateContactInfo(formData);
    setStatus("saved");
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        First name
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Middle name
        <input
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Last name
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
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
        <span className="flex items-center gap-1.5">
          Birthdate
          {birthDate && <span className="font-semibold text-[#707070]">&middot; age {calculateAge(birthDate)}</span>}
        </span>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Gender
        <select
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            save({ gender: e.target.value });
          }}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        >
          <option value="">Select…</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        City
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onBlur={() => save()}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        State
        <input
          value={state}
          onChange={(e) => setState(e.target.value)}
          onBlur={() => save()}
          placeholder="e.g. TX"
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666] sm:col-span-2">
        Timezone <span className="font-normal text-[#707070]">(so you can see how many hours apart you are)</span>
        <select
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            save({ timezone: e.target.value });
          }}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        >
          <option value="">Select…</option>
          {US_TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-start gap-4 sm:col-span-2">
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Height
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
              onBlur={() => save()}
              className="w-14 rounded-md border border-[#D9CFBA] px-2 py-1.5 text-center text-sm outline-none focus:border-[#1C1C1C]"
            />
            <span className="text-xs text-[#707070]">ft</span>
            <input
              type="number"
              value={heightIn}
              onChange={(e) => setHeightIn(e.target.value)}
              onBlur={() => save()}
              className="w-14 rounded-md border border-[#D9CFBA] px-2 py-1.5 text-center text-sm outline-none focus:border-[#1C1C1C]"
            />
            <span className="text-xs text-[#707070]">in</span>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Weight
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={() => save()}
              className="w-16 rounded-md border border-[#D9CFBA] px-2 py-1.5 text-center text-sm outline-none focus:border-[#1C1C1C]"
            />
            <span className="text-xs text-[#707070]">lbs</span>
          </div>
        </label>
      </div>
      <div className="flex items-end sm:col-span-2">
        <p className="h-4 text-xs font-semibold text-[#1E6B3C]">
          {status === "saving" && "Saving..."}
          {status === "saved" && "Saved ✓"}
        </p>
      </div>
    </div>
  );
}
