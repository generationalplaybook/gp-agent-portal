"use client";

import { useState } from "react";
import { updateProduct, deleteProduct, type ProductFields } from "../actions";
import { PRODUCT_TYPE_OPTIONS, type ClientProduct } from "@/lib/types";
import { getProductStatus } from "@/lib/products";

const STATUS_STYLES: Record<"good" | "warn" | "bad", string> = {
  good: "bg-[#00693C] text-white",
  warn: "bg-[#8b6a00] text-white",
  bad: "bg-[#8B1A1A] text-white",
};

export type OwnerOption = { id: string; full_name: string };

function toFieldValues(p: ClientProduct): ProductFields {
  return {
    product_name: p.product_name,
    product_type: p.product_type ?? "",
    carrier: p.carrier ?? "",
    issue_date: p.issue_date ?? "",
    expiration_date: p.expiration_date ?? "",
    conversion_deadline: p.conversion_deadline ?? "",
    conversion_notes: p.conversion_notes ?? "",
    face_amount: p.face_amount != null ? String(p.face_amount) : "",
    premium: p.premium != null ? String(p.premium) : "",
    notes: p.notes ?? "",
    owner_client_id: p.owner_client_id ?? "",
  };
}

export default function ProductRow({
  product,
  clientId,
  clientName,
  ownerOptions,
}: {
  product: ClientProduct;
  clientId: string;
  clientName: string;
  ownerOptions: OwnerOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [fields, setFields] = useState<ProductFields>(toFieldValues(product));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ProductFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await updateProduct(product.id, clientId, fields);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProduct(product.id, clientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete product.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
        <input
          value={fields.product_name}
          onChange={(e) => set("product_name", e.target.value)}
          list="product-name-suggestions"
          placeholder="Product name *"
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
            onClick={handleSave}
            className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFields(toFieldValues(product));
              setEditing(false);
              setError("");
            }}
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const status = getProductStatus(product.expiration_date, product.conversion_deadline);
  const owner = product.owner_client_id ? ownerOptions.find((o) => o.id === product.owner_client_id) : null;

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-[#D9CFBA] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#1C1C1C]">{product.product_name}</p>
          <p className="text-xs text-[#888]">
            {[product.product_type, product.carrier].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {!confirmingDelete && (
          <div className="flex flex-shrink-0 gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-[#666] underline hover:text-[#1C1C1C]">
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {status && (
          <span
            className={`self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status.tone]}`}
          >
            {status.label}
          </span>
        )}
        {owner && (
          <span className="self-start rounded-full bg-[#EDE8DF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#555]">
            Owned by {owner.full_name}
          </span>
        )}
      </div>

      {(product.issue_date || product.expiration_date) && (
        <p className="text-xs text-[#888]">
          {product.issue_date && `Issued ${new Date(product.issue_date).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
          {product.issue_date && product.expiration_date && " · "}
          {product.expiration_date &&
            `Expires ${new Date(product.expiration_date).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
        </p>
      )}

      {product.conversion_notes && <p className="text-xs text-[#666]">{product.conversion_notes}</p>}

      {(product.face_amount || product.premium) && (
        <p className="text-xs text-[#888]">
          {product.face_amount != null && `Face: $${product.face_amount.toLocaleString()}`}
          {product.face_amount != null && product.premium != null && " · "}
          {product.premium != null && `Premium: $${product.premium.toLocaleString()}`}
        </p>
      )}

      {product.notes && <p className="whitespace-pre-wrap text-xs text-[#666]">{product.notes}</p>}

      {confirmingDelete && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-[#8B1A1A]">Delete this product?</span>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-[#8B1A1A]">{error}</p>}
    </div>
  );
}
