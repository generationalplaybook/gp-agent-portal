"use client";

import { useState } from "react";
import Link from "next/link";
import { CLIENT_STAGES, GENDER_OPTIONS, type ClientStage } from "@/lib/types";
import { calculateAge, daysUntilNextBirthday, inverseRelationship, FAMILY_RELATIONSHIP_OPTIONS } from "@/lib/family";
import {
  searchFamilyCandidates,
  linkExistingFamilyMember,
  addNewFamilyMember,
  unlinkFamilyMember,
} from "../actions";

interface FamilyMember {
  id: string;
  full_name: string;
  stage: ClientStage;
  birth_date: string | null;
  family_relationship: string | null;
  nextReminder: { remind_at: string; message: string | null } | null;
}

export default function FamilySection({
  clientId,
  clientName,
  members,
}: {
  clientId: string;
  clientName: string;
  members: FamilyMember[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<"search" | "new">("search");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // "Link existing client" mode
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string; stage: ClientStage }[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ id: string; full_name: string } | null>(null);
  const [relationship, setRelationship] = useState("");
  // Only asked when `relationship` isn't one of the four standard invertible types (see
  // inverseRelationship in lib/family.ts) — e.g. "Other" or a free-text value like "Stepchild".
  // Optional; left blank means the profile you're on keeps whatever relationship it already has
  // (or none), per Karina 9/5 ("or just leave it").
  const [reverseRelationship, setReverseRelationship] = useState("");

  // "Add new person" mode
  const [newFirstName, setNewFirstName] = useState("");
  const [newMiddleName, setNewMiddleName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [newReverseRelationship, setNewReverseRelationship] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  async function runSearch(q: string) {
    setQuery(q);
    setPicked(null);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const excludeIds = [clientId, ...members.map((m) => m.id)];
      setResults(await searchFamilyCandidates(q, excludeIds));
    } finally {
      setSearching(false);
    }
  }

  function resetForm() {
    setShowAdd(false);
    setMode("search");
    setQuery("");
    setResults([]);
    setPicked(null);
    setRelationship("");
    setReverseRelationship("");
    setNewFirstName("");
    setNewMiddleName("");
    setNewLastName("");
    setNewRelationship("");
    setNewReverseRelationship("");
    setNewBirthDate("");
    setNewGender("");
    setNewPhone("");
    setNewEmail("");
    setError("");
  }

  async function handleLinkExisting() {
    if (!picked) {
      setError("Pick a client from the list first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await linkExistingFamilyMember(clientId, picked.id, relationship, reverseRelationship);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not link that family member.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNew() {
    if (!newFirstName.trim() || !newLastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addNewFamilyMember(clientId, {
        first_name: newFirstName,
        middle_name: newMiddleName,
        last_name: newLastName,
        relationship: newRelationship,
        reverseRelationship: newReverseRelationship,
        birth_date: newBirthDate,
        gender: newGender,
        phone: newPhone,
        email: newEmail,
      });
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that family member.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink(memberId: string) {
    setBusy(true);
    setError("");
    try {
      await unlinkFamilyMember(clientId, memberId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlink.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {members.length === 0 && !showAdd && <p className="text-xs text-[#707070]">No family members linked yet.</p>}

      {members.length > 0 && (
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {members.map((m) => {
            const stageInfo = CLIENT_STAGES.find((s) => s.value === m.stage);
            const age = m.birth_date ? calculateAge(m.birth_date) : null;
            const daysToBday = m.birth_date ? daysUntilNextBirthday(m.birth_date) : null;
            const isMinor = age !== null && age < 18;
            const turningAdultSoon = isMinor && age === 17 && daysToBday !== null && daysToBday <= 90;

            return (
              <div key={m.id} className="flex flex-col gap-1.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/clients/${m.id}`} className="truncate text-sm font-semibold text-[#1C1C1C] hover:underline">
                    {m.full_name}
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleUnlink(m.id)}
                    className="flex-shrink-0 text-[11px] text-[#707070] hover:text-[#8B1A1A] disabled:opacity-50"
                  >
                    Unlink
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.family_relationship && (
                    <span className="rounded-full bg-[#F0EDE8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
                      {m.family_relationship}
                    </span>
                  )}
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: stageInfo?.color }}
                  >
                    {stageInfo?.label}
                  </span>
                  {isMinor ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        turningAdultSoon ? "bg-[#8B1A1A] text-white" : "bg-[#F0EDE8] text-[#666]"
                      }`}
                    >
                      {turningAdultSoon ? `Turns 18 in ${daysToBday}d` : `Minor · age ${age}`}
                    </span>
                  ) : (
                    age !== null && (
                      <span className="rounded-full bg-[#F0EDE8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
                        Age {age}
                      </span>
                    )
                  )}
                </div>
                {m.nextReminder && (
                  <p className="text-[11px] text-[#707070]">
                    Next reminder:{" "}
                    {new Date(m.nextReminder.remind_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {m.nextReminder.message ? ` — ${m.nextReminder.message}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add Family Member
        </button>
      )}

      {showAdd && (
        <div className="flex flex-col gap-3 rounded-md border border-[#D9CFBA] p-3">
          <div className="flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("search")}
              className={`rounded-full px-3 py-1 font-semibold ${
                mode === "search" ? "bg-[#1C1C1C] text-[#FAF8F4]" : "bg-[#F0EDE8] text-[#666]"
              }`}
            >
              Link Existing Client
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`rounded-full px-3 py-1 font-semibold ${
                mode === "new" ? "bg-[#1C1C1C] text-[#FAF8F4]" : "bg-[#F0EDE8] text-[#666]"
              }`}
            >
              Add New Person
            </button>
          </div>

          {mode === "search" ? (
            <div className="flex flex-col gap-2">
              {picked ? (
                <div className="flex items-center justify-between rounded-md border border-[#D9CFBA] bg-white px-3 py-2 text-sm">
                  <span>{picked.full_name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(null);
                      setQuery("");
                    }}
                    className="text-xs text-[#707070] hover:text-[#1C1C1C]"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={query}
                    onChange={(e) => runSearch(e.target.value)}
                    placeholder="Search your clients by name…"
                    className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                  />
                  {searching && <p className="text-xs text-[#707070]">Searching…</p>}
                  {!searching && query && results.length === 0 && (
                    <p className="text-xs text-[#707070]">No matching clients.</p>
                  )}
                  {results.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-[#D9CFBA] bg-white">
                      {results.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            setPicked({ id: r.id, full_name: r.full_name });
                            setResults([]);
                          }}
                          className="cursor-pointer border-b border-[#F0EDE8] px-3 py-2 text-sm last:border-0 hover:bg-[#F5F0E8]"
                        >
                          {r.full_name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                list="family-relationship-options"
                placeholder={`${picked?.full_name ?? "This person"} is ${clientName}'s… (e.g. Spouse, Child)`}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              {relationship.trim() !== "" && !inverseRelationship(relationship) && (
                <input
                  value={reverseRelationship}
                  onChange={(e) => setReverseRelationship(e.target.value)}
                  placeholder={`And ${clientName} is ${picked?.full_name ?? "their"}… (optional)`}
                  className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                />
              )}
              {error && <p className="text-xs text-[#8B1A1A]">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !picked}
                  onClick={handleLinkExisting}
                  className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
                >
                  {busy ? "Linking…" : "Link"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#707070] hover:text-[#1C1C1C]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="First name *"
                  className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                />
                <input
                  value={newMiddleName}
                  onChange={(e) => setNewMiddleName(e.target.value)}
                  placeholder="Middle"
                  className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                />
                <input
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="Last name *"
                  className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                />
              </div>
              <input
                value={newRelationship}
                onChange={(e) => setNewRelationship(e.target.value)}
                list="family-relationship-options"
                placeholder={`This person is ${clientName}'s… (e.g. Spouse, Child)`}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              {newRelationship.trim() !== "" && !inverseRelationship(newRelationship) && (
                <input
                  value={newReverseRelationship}
                  onChange={(e) => setNewReverseRelationship(e.target.value)}
                  placeholder={`And ${clientName} is their… (optional)`}
                  className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Birthdate
                  <input
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Gender
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
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
              </div>
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email (optional)"
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              {error && <p className="text-xs text-[#8B1A1A]">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAddNew}
                  className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
                >
                  {busy ? "Adding…" : "Add & Link"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#707070] hover:text-[#1C1C1C]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <datalist id="family-relationship-options">
            {FAMILY_RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
      )}
    </div>
  );
}
