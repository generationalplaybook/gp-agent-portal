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
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("");
  const [carrier, setCarrier] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Same pattern as the "Product name" field on Add Product below (ProductsSection.tsx) — a
  // single free-typed field with a native <datalist> of suggestions, not a separate carrier
  // dropdown. Changed 9/1 per Karina: the two-step "pick from a grouped dropdown, then a
  // separate name field" was more clicking than it needed to be — one field you can type or
  // pick from is simpler and matches what Add Product already does. Still auto-fills Carrier
  // and Type on an exact match (typing or picking a listed name), which the Add Product
  // datalist doesn't do — Karina never asked for that convenience to go away, just for the
  // picker itself to work the way Add Product's does.
  const productLookup = useMemo(() => {
    const byName = new Map<string, (typeof KB_PRODUCTS)[number]>();
    KB_PRODUCTS.forEach((p) => byName.set(p.name, p));
    return byName;
  }, []);

  function handleProductNameChange(value: string) {
    setProductName(value);
    const match = productLookup.get(value);
    if (match) {
      setCarrier(match.carrier);
      setProductType(match.productType);
    }
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
          <input
            value={productName}
            onChange={(e) => handleProductNameChange(e.target.value)}
            list="illustration-product-suggestions"
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

      <datalist id="illustration-product-suggestions">
        {KB_PRODUCTS.map((p) => (
          <option key={p.name} value={p.name} />
        ))}
      </datalist>
    </div>
  );
}
