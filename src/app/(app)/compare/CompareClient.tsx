"use client";

import { useMemo, useState } from "react";
import { KB, KB_BADGE_STYLES, type KBItem } from "@/lib/kb-data";

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

function SlotPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: KBItem | null;
  onChange: (item: KBItem | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return KB.slice(0, 20);
    return KB.filter((i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)).slice(0, 20);
  }, [query]);

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#666]">{label}</label>
      {value ? (
        <div className="flex items-center justify-between rounded-md border border-[#D9CFBA] bg-white px-3 py-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <Badge item={value} />
            <span className="truncate text-sm text-[#1C1C1C]">{value.name}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="ml-2 flex-shrink-0 text-xs text-[#888] hover:text-[#1C1C1C]"
          >
            Clear
          </button>
        </div>
      ) : (
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a product…"
          className="w-full rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
        />
      )}
      {open && !value && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-[#D9CFBA] bg-white shadow-md">
          {filtered.length === 0 && <div className="px-3 py-2 text-xs text-[#999]">No matches</div>}
          {filtered.map((item) => (
            <div
              key={item.name}
              onMouseDown={() => {
                onChange(item);
                setOpen(false);
              }}
              className="cursor-pointer border-b border-[#F0EDE8] px-3 py-2 text-sm hover:bg-[#F5F0E8]"
            >
              <span className="mr-1.5 text-[10px] font-semibold text-[#888]">{item.label}</span>
              {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompareClient() {
  const [a, setA] = useState<KBItem | null>(null);
  const [b, setB] = useState<KBItem | null>(null);
  const [c, setC] = useState<KBItem | null>(null);

  const items = [a, b, c].filter((i): i is KBItem => i !== null);

  const sections: { label: string; key: "what" | "agent" | "client" }[] = [
    { label: "What it is", key: "what" },
    { label: "Agent note", key: "agent" },
    { label: "Tell your client", key: "client" },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SlotPicker label="Product A" value={a} onChange={setA} />
        <SlotPicker label="Product B" value={b} onChange={setB} />
        <SlotPicker label="Product C (optional)" value={c} onChange={setC} />
      </div>

      {items.length < 2 ? (
        <p className="text-sm text-[#8B1A1A]">Select at least two products to compare.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border-[1.5px] border-[#D9CFBA]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-24 bg-[#1C1C1C]" />
                {items.map((item, i) => (
                  <th
                    key={item.name}
                    className="px-4 py-4 text-left align-top"
                    style={{
                      background: i === 0 ? "#1C1C1C" : i === 1 ? "#2E2E2E" : "#3D3D3D",
                      borderLeft: i > 0 ? "2px solid #D9CFBA" : undefined,
                    }}
                  >
                    <Badge item={item} />
                    <div className="mt-1.5 font-serif text-sm font-semibold leading-snug text-[#FAF8F4]">
                      {item.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#C8C0B0]">{item.type}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.key}>
                  <td className="whitespace-nowrap bg-[#F7F4EE] px-4 py-3 align-top text-[11px] font-semibold uppercase tracking-wide text-[#555]">
                    {s.label}
                  </td>
                  {items.map((item) => (
                    <td
                      key={item.name}
                      className="border-b border-l border-[#E4E0D8] px-4 py-3 align-top leading-relaxed text-[#333]"
                    >
                      {item[s.key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="whitespace-nowrap bg-[#F7F4EE] px-4 py-3 align-top text-[11px] font-semibold uppercase tracking-wide text-[#555]">
                  Key points
                </td>
                {items.map((item) => {
                  const bullets = item.bullets?.length ? item.bullets : item.highlights ?? [];
                  return (
                    <td key={item.name} className="border-l border-[#E4E0D8] px-4 py-3 align-top">
                      {bullets.length ? (
                        <ul className="flex flex-col gap-1.5">
                          {bullets.map((b, i) => (
                            <li key={i} className="relative pl-3.5 text-xs leading-relaxed text-[#444]">
                              <span className="absolute left-0 text-[#bbb]">—</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-[#999]">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
