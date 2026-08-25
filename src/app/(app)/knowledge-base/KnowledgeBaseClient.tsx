"use client";

import { useMemo, useState } from "react";
import { KB, KB_BADGE_STYLES, type KBItem } from "@/lib/kb-data";

const TABS = [
  { value: "all", label: "All" },
  { value: "life", label: "Life Insurance" },
  { value: "annuity", label: "Annuities" },
  { value: "concept", label: "Concepts" },
  { value: "tax", label: "Tax & Rollovers" },
];

const SUBTABS = [
  { value: "all-life", label: "All Life" },
  { value: "iul", label: "IUL" },
  { value: "term", label: "Term & Final Expense" },
];

function Badge({ item }: { item: KBItem }) {
  const style = KB_BADGE_STYLES[item.badge] ?? { bg: "#D9CFBA", color: "#1C1C1C" };
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {item.label}
    </span>
  );
}

function KBCard({ item }: { item: KBItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[#D9CFBA] bg-[#F5F0E8] transition hover:shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <Badge item={item} />
          <div>
            <div className="text-sm font-semibold text-[#1C1C1C]">{item.name}</div>
            <div className="text-xs text-[#666]">{item.type}</div>
          </div>
        </div>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-[#666] transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-[#D9CFBA] px-4 py-4 text-sm">
          {item.what && (
            <div className="mb-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#1B4F8A]">What it is</div>
              <div className="text-[#2E2E2E]">{item.what}</div>
            </div>
          )}
          {!!item.does?.length && (
            <div className="mb-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#1B4F8A]">
                What it does for the client
              </div>
              <ul className="list-disc space-y-1 pl-4 text-[#2E2E2E]">
                {item.does.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {item.agent && (
            <div className="mb-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#1E6B3C]">Agent note</div>
              <div className="text-[#2E2E2E]">{item.agent}</div>
            </div>
          )}
          {item.client && (
            <div className="mb-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#1B4F8A]">
                Tell your client
              </div>
              <div className="italic text-[#2E2E2E]">&ldquo;{item.client}&rdquo;</div>
            </div>
          )}
          {!!item.highlights?.length && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#555]">
                Highlights &amp; key facts
              </div>
              <ul className="list-disc space-y-1 pl-4 text-[#2E2E2E]">
                {item.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeBaseClient() {
  const [tab, setTab] = useState("all");
  const [subtab, setSubtab] = useState("all-life");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const words = q ? q.split(" ").filter(Boolean) : [];

    return KB.filter((item) => {
      if (tab !== "all" && item.group !== tab) return false;
      if (tab === "life" && subtab !== "all-life" && item.subgroup !== subtab) return false;
      if (!words.length) return true;
      const searchable = [
        item.name,
        item.type,
        item.what ?? "",
        item.agent ?? "",
        item.client ?? "",
        ...(item.tags ?? []),
        ...(item.does ?? []),
        ...(item.highlights ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return words.every((w) => searchable.includes(w));
    }).sort((a, b) => Number(a.group === "tax") - Number(b.group === "tax"));
  }, [tab, subtab, query]);

  return (
    <div>
      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search carriers, products, concepts…"
          className="w-full rounded-lg border-[1.5px] border-[#2E2E2E] bg-white px-4 py-3 text-sm outline-none focus:border-[#1E6B3C]"
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-medium transition ${
              tab === t.value
                ? "border-[#1C1C1C] bg-[#1C1C1C] text-[#FAF8F4]"
                : "border-[#2E2E2E] bg-transparent text-[#2E2E2E] hover:bg-[#F5F0E8]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "life" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {SUBTABS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSubtab(s.value)}
              className={`rounded-full border-[1.5px] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                subtab === s.value
                  ? "border-[#1C1C1C] bg-[#1C1C1C] text-[#FAF8F4]"
                  : "border-[#2E2E2E] bg-transparent text-[#2E2E2E] hover:bg-[#F5F0E8]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[#D9CFBA] bg-white px-4 py-10 text-center text-sm text-[#888]">
            No results found. Try different keywords.
          </div>
        ) : (
          filtered.map((item, i) => <KBCard key={item.name + i} item={item} />)
        )}
      </div>
    </div>
  );
}
