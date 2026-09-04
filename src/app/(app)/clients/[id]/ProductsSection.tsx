"use client";

import { useState } from "react";
import { addProduct, type ProductFields } from "../actions";
import { PRODUCT_TYPE_OPTIONS, type ClientProduct } from "@/lib/types";
import { KB } from "@/lib/kb-data";
import ProductRow, { type OwnerOption } from "./ProductRow";
import RidersField from "./RidersField";
import DollarInput from "./DollarInput";

// Suggestions for the product-name field: your own carrier products (life/annuity — not the
// Knowledge Base's concept/tax entries), deduplicated. Rendered as a native <datalist> so a
// client can either pick one of your products or just type anything (e.g. a policy from a
// carrier you don't sell, or something a client already had before you met them).
const PRODUCT_NAME_SUGGESTIONS = Array.from(
  new Set(KB.filter((i) => i.group === "life" || i.group === "annuity").map((i) => i.name))
);

const EMPTY_FIELDS: ProductFields = {
  product_name: "",
  product_type: "",
  carrier: "",
  policy_number: "",
  issue_date: "",
  expiration_date: "",
  is_convertible: false,
  conversion_deadline: "",
  final_conversion_deadline: "",
  no_exam_declined_at: "",
  conversion_notes: "",
  face_amount: "",
  premium: "",
  notes: "",
  owner_client_id: "",
  riders: [],
  minimum_premium: "",
};

export default function ProductsSection({
  clientId,
  clientName,
  products,
  ownerOptions,
  isMinor,
}: {
  clientId: string;
  clientName: string;
  products: ClientProduct[];
  ownerOptions: OwnerOption[];
  isMinor: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showConverted, setShowConverted] = useState(false);
  const [fields, setFields] = useState<ProductFields>(EMPTY_FIELDS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pendingProducts = products.filter((p) => p.conversion_pending_at && !p.converted_at);
  const convertedProducts = products.filter((p) => p.converted_at);
  const activeProducts = products.filter((p) => !p.conversion_pending_at && !p.converted_at);

  function set<K extends keyof ProductFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleAdd() {
    if (!fields.product_name.trim()) {
      setError("Product name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addProduct(clientId, fields);
      setFields(EMPTY_FIELDS);
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isMinor && ownerOptions.length === 0 && (
        <p className="rounded-md bg-[#F5F0E8] px-3 py-2 text-xs text-[#666]">
          {clientName} is a minor with no family linked yet — link their parent or guardian in Family above so you
          can set them as the owner on any policy below.
        </p>
      )}
      {isMinor && ownerOptions.length > 0 && products.length === 0 && !showAdd && (
        <p className="rounded-md bg-[#F5F0E8] px-3 py-2 text-xs text-[#666]">
          {clientName} is a minor — when you add a policy, set &ldquo;Owned by&rdquo; to whichever parent or
          guardian actually owns it.
        </p>
      )}

      {products.length === 0 && !showAdd && <p className="text-xs text-[#707070]">No products on file yet.</p>}

      {/* Conversion Pending sits in its own section at the top so it stays on the advisor's radar
          for check-ins — see markConversionPending in actions.ts. Converted products are archived
          into a collapsed section at the bottom instead of disappearing. */}
      {pendingProducts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6a00]">
            Conversion Pending ({pendingProducts.length})
          </p>
          <div className="flex flex-col gap-3">
            {pendingProducts.map((p) => (
              <ProductRow key={p.id} product={p} clientId={clientId} clientName={clientName} ownerOptions={ownerOptions} />
            ))}
          </div>
        </div>
      )}

      {activeProducts.length > 0 && (
        <div className="flex flex-col gap-3">
          {activeProducts.map((p) => (
            <ProductRow key={p.id} product={p} clientId={clientId} clientName={clientName} ownerOptions={ownerOptions} />
          ))}
        </div>
      )}

      {!showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add Product
        </button>
      )}

      {showAdd && (
        <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
          <input
            value={fields.product_name}
            onChange={(e) => set("product_name", e.target.value)}
            list="product-name-suggestions"
            placeholder="Product name * (e.g. Ameritas 30-Year Term with Living Benefits)"
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={fields.product_type}
              onChange={(e) => set("product_type", e.target.value)}
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
              value={fields.carrier}
              onChange={(e) => set("carrier", e.target.value)}
              placeholder="Carrier"
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Issue date
              <input
                type="date"
                value={fields.issue_date}
                onChange={(e) => set("issue_date", e.target.value)}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Expiration date
              <input
                type="date"
                value={fields.expiration_date}
                onChange={(e) => set("expiration_date", e.target.value)}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Policy number (once issued)
            <input
              value={fields.policy_number}
              onChange={(e) => set("policy_number", e.target.value)}
              placeholder="e.g. NA-9284710"
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          {ownerOptions.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Owned by (leave as {clientName} unless someone else — e.g. a parent — currently owns this)
              <select
                value={fields.owner_client_id}
                onChange={(e) => set("owner_client_id", e.target.value)}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              >
                <option value="">{clientName} (this client)</option>
                {ownerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-xs font-medium text-[#2E2E2E]">
            <input
              type="checkbox"
              checked={fields.is_convertible ?? false}
              onChange={(e) => setFields((f) => ({ ...f, is_convertible: e.target.checked }))}
              className="h-4 w-4 rounded border-[#D9CFBA]"
            />
            This product can convert to a permanent policy (e.g. a term policy)
          </label>
          {fields.is_convertible && (
            <>
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Convertible without exam until
                <input
                  type="date"
                  value={fields.conversion_deadline}
                  onChange={(e) => set("conversion_deadline", e.target.value)}
                  className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Final conversion deadline (exam required, e.g. up to age 75)
                  <input
                    type="date"
                    value={fields.final_conversion_deadline}
                    onChange={(e) => set("final_conversion_deadline", e.target.value)}
                    className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  No-exam window missed/declined on
                  <input
                    type="date"
                    value={fields.no_exam_declined_at}
                    onChange={(e) => set("no_exam_declined_at", e.target.value)}
                    className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                  />
                </label>
              </div>
              <input
                value={fields.conversion_notes}
                onChange={(e) => set("conversion_notes", e.target.value)}
                placeholder="Conversion notes (e.g. converts to any Ameritas IUL)"
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Face amount
              <DollarInput
                value={fields.face_amount ?? ""}
                onChange={(v) => set("face_amount", v)}
                placeholder="e.g. 250,000"
                className="w-full rounded-md border border-[#D9CFBA] py-1.5 pr-3 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Premium
              <DollarInput
                value={fields.premium ?? ""}
                onChange={(v) => set("premium", v)}
                placeholder="e.g. 89.50"
                className="w-full rounded-md border border-[#D9CFBA] py-1.5 pr-3 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Minimum to avoid lapse (monthly)
            <DollarInput
              value={fields.minimum_premium ?? ""}
              onChange={(v) => set("minimum_premium", v)}
              placeholder="e.g. 67"
              className="w-full rounded-md border border-[#D9CFBA] py-1.5 pr-3 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <textarea
            value={fields.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Other notes"
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
          <RidersField
            value={fields.riders ?? []}
            onChange={(riders) => setFields((f) => ({ ...f, riders }))}
          />
          {error && <p className="text-xs text-[#8B1A1A]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleAdd}
              className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
            >
              {saving ? "Adding…" : "Add Product"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFields(EMPTY_FIELDS);
                setShowAdd(false);
                setError("");
              }}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#707070] hover:text-[#1C1C1C]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {convertedProducts.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowConverted((v) => !v)}
            className="self-start text-xs font-semibold text-[#707070] underline hover:text-[#1C1C1C]"
          >
            {showConverted ? "Hide" : "Show"} converted ({convertedProducts.length})
          </button>
          {showConverted && (
            <div className="flex flex-col gap-3">
              {convertedProducts.map((p) => (
                <ProductRow key={p.id} product={p} clientId={clientId} clientName={clientName} ownerOptions={ownerOptions} />
              ))}
            </div>
          )}
        </div>
      )}

      <datalist id="product-name-suggestions">
        {PRODUCT_NAME_SUGGESTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
