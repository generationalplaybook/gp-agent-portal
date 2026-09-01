"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRODUCT_TYPE_OPTIONS } from "@/lib/types";
import { KB_PRODUCTS } from "@/lib/kb-data";
import { createScenario } from "./scenarios/actions";

interface Scenario {
  id: string;
  product_name: string;
  product_type: string | null;
  carrier: string | null;
  converted_product_id: string | null;
}

// Illustrations — exploratory "let's see the numbers" scenarios, deliberately separate from
// Products below. Nothing added here shows up as coverage the client owns; it's only once one
// is explicitly converted (from its own page) that it becomes a real Product.
export default function ScenariosSection({ clientId, scenarios }: { clientId: string; scenarios: Scenario[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [kbChoice, setKbChoice] = useState(""); // index into KB_PRODUCTS as a string, or "" for custom
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("");
  const [carrier, setCarrier] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Grouped by carrier for the <optgroup> list — built once, not per render.
  const kbGroups = useMemo(() => {
    const byCarrier = new Map<string, { name: string; index: number }[]>();
    KB_PRODUCTS.forEach((p, index) => {
      const list = byCarrier.get(p.carrier) ?? [];
      list.push({ name: p.name, index });
      byCarrier.set(p.carrier, list);
    });
    return Array.from(byCarrier.entries());
  }, []);

  function handleKbChoice(value: string) {
    setKbChoice(value);
    if (value === "") return; // "Custom / not listed" — leave whatever's typed below alone
    const product = KB_PRODUCTS[Number(value)];
    if (!product) return;
    setProductName(product.name);
    setCarrier(product.carrier);
    setProductType(product.productType);
  }

  async function handleCreate() {
    if (!productName.trim()) {
      setError("Product name is required.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const scenarioId = await createScenario(clientId, productName, productType, carrier);
      router.push(`/clients/${clientId}/scenarios/${scenarioId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create scenario.");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#888]">
        Run numbers for an option the client hasn&rsquo;t decided on yet — nothing here shows up as a Product until
        you convert it.
      </p>

      {scenarios.length === 0 && !showAdd && <p className="text-xs text-[#999]">No illustration scenarios yet.</p>}

      {scenarios.length > 0 && (
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {scenarios.map((s) => (
            <Link
              key={s.id}
              href={`/clients/${clientId}/scenarios/${s.id}`}
              className="flex items-center justify-between gap-3 py-2.5 hover:bg-[#F5F0E8]"
            >
              <div>
                <div className="text-sm text-[#1C1C1C]">{s.product_name}</div>
                <div className="text-xs text-[#999]">{[s.product_type, s.carrier].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              {s.converted_product_id ? (
                <span className="rounded-full bg-[#EEF6F0] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1E6B3C]">
                  Converted
                </span>
              ) : (
                <span className="text-xs text-[#888]">Edit →</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {!showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add Illustration
        </button>
      )}

      {showAdd && (
        <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Product
            <select
              value={kbChoice}
              onChange={(e) => handleKbChoice(e.target.value)}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            >
              <option value="">Custom / not listed — type it in below…</option>
              {kbGroups.map(([carrierName, products]) => (
                <optgroup key={carrierName} label={carrierName}>
                  {products.map((p) => (
                    <option key={p.index} value={p.index}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <input
            value={productName}
            onChange={(e) => {
              setProductName(e.target.value);
              setKbChoice(""); // hand-edited — no longer tracks a specific KB pick
            }}
            placeholder="Product name * (e.g. North American Builder Plus IUL 4)"
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            >
              <option value="">Type…</option>
              {PRODUCT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Carrier"
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </div>
          {error && <p className="text-xs text-[#8B1A1A]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
            >
              {creating ? "Creating…" : "Start Illustration"}
            </button>
            <button
              type="button"
              onClick={() => {
                setKbChoice("");
                setProductName("");
                setProductType("");
                setCarrier("");
                setShowAdd(false);
                setError("");
              }}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#888] hover:text-[#1C1C1C]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
