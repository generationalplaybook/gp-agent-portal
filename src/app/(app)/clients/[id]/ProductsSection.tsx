"use client";

import { useState } from "react";
import { addProduct, type ProductFields } from "../actions";
import { PRODUCT_TYPE_OPTIONS, type ClientProduct } from "@/lib/types";
import { KB } from "@/lib/kb-data";
import ProductRow, { type OwnerOption } from "./ProductRow";

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
  issue_date: "",
  expiration_date: "",
  conversion_deadline: "",
  conversion_notes: "",
  face_amount: "",
  premium: "",
  notes: "",
  owner_client_id: "",
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
  const [fields, setFields] = useState<ProductFields>(EMPTY_FIELDS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

      {products.length === 0 && !showAdd && <p className="text-xs text-[#999]">No products on file yet.</p>}

      {products.length > 0 && (
        <div className="flex flex-col gap-3">
          {products.map((p) => (
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
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Convertible without exam until
            <input
              type="date"
              value={fields.conversion_deadline}
              onChange={(e) => set("conversion_deadline", e.target.value)}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <input
            value={fields.conversion_notes}
            onChange={(e) => set("conversion_notes", e.target.value)}
            placeholder="Conversion notes (e.g. converts to any Ameritas IUL)"
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={fields.face_amount}
              onChange={(e) => set("face_amount", e.target.value)}
              placeholder="Face amount"
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
            <input
              value={fields.premium}
              onChange={(e) => set("premium", e.target.value)}
              placeholder="Premium"
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </div>
          <textarea
            value={fields.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Other notes"
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
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
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#888] hover:text-[#1C1C1C]"
            >
              Cancel
            </button>
          </div>
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
