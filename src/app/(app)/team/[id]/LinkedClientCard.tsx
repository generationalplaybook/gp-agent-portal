"use client";

import { useState } from "react";
import Link from "next/link";
import { searchClientCandidates, linkClientToRecruit, unlinkClientFromRecruit } from "../actions";

interface LinkedClient {
  id: string;
  full_name: string;
}

// Cross-references an existing Client who wants to become an agent — a pointer, not a merge.
// The client's own record (stage, notes, products, everything) is completely untouched by this;
// this card just remembers "this recruit is also that client."
export default function LinkedClientCard({ recruitId, linkedClient }: { recruitId: string; linkedClient: LinkedClient | null }) {
  const [linking, setLinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ id: string; full_name: string } | null>(null);

  async function runSearch(q: string) {
    setQuery(q);
    setPicked(null);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchClientCandidates(q));
    } finally {
      setSearching(false);
    }
  }

  function resetForm() {
    setLinking(false);
    setQuery("");
    setResults([]);
    setPicked(null);
    setError("");
  }

  async function handleLink() {
    if (!picked) {
      setError("Pick a client from the list first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await linkClientToRecruit(recruitId, picked.id);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not link that client.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink() {
    setBusy(true);
    setError("");
    try {
      await unlinkClientFromRecruit(recruitId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlink.");
    } finally {
      setBusy(false);
    }
  }

  if (linkedClient) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-[#888]">This recruit is also a client:</p>
          <Link href={`/clients/${linkedClient.id}`} className="text-sm font-semibold text-[#1C1C1C] hover:underline">
            {linkedClient.full_name}
          </Link>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handleUnlink}
          className="flex-shrink-0 text-[11px] text-[#999] hover:text-[#8B1A1A] disabled:opacity-50"
        >
          Unlink
        </button>
      </div>
    );
  }

  if (!linking) {
    return (
      <button
        type="button"
        onClick={() => setLinking(true)}
        className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
      >
        + Link an Existing Client
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
      <p className="text-xs text-[#666]">If this person is also a client of yours, link them here.</p>
      {picked ? (
        <div className="flex items-center justify-between rounded-md border border-[#D9CFBA] bg-white px-3 py-2 text-sm">
          <span>{picked.full_name}</span>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setQuery("");
            }}
            className="text-xs text-[#888] hover:text-[#1C1C1C]"
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
          {searching && <p className="text-xs text-[#999]">Searching…</p>}
          {!searching && query && results.length === 0 && <p className="text-xs text-[#999]">No matching clients.</p>}
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
      {error && <p className="text-xs text-[#8B1A1A]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !picked}
          onClick={handleLink}
          className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
        >
          {busy ? "Linking…" : "Link"}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#888] hover:text-[#1C1C1C]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
