"use client";

import { useState } from "react";
import {
  updateProduct,
  deleteProduct,
  markConversionPending,
  undoConversionPending,
  markConverted,
  undoConverted,
  type ProductFields,
} from "../actions";
import { PRODUCT_TYPE_OPTIONS, type ClientProduct } from "@/lib/types";
import { getProductStatus } from "@/lib/products";
import RidersField from "./RidersField";
import DollarInput from "./DollarInput";

const STATUS_STYLES: Record<"good" | "warn" | "bad", string> = {
  good: "bg-[#00693C] text-white",
  warn: "bg-[#8b6a00] text-white",
  bad: "bg-[#8B1A1A] text-white",
};

// Same hover-to-copy pattern used for carrier login numbers on My Profile (CarrierLoginsTab.tsx) —
// a policy number is exactly the kind of thing you're reading off a screen while on the phone
// with a carrier, so one click to copy beats retyping it.
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API unavailable or permission denied — nothing else to fall back to.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-[#707070] opacity-0 transition-opacity hover:text-[#1C1C1C] focus-visible:opacity-100 group-hover/policy:opacity-100"
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export type OwnerOption = { id: string; full_name: string };

function toFieldValues(p: ClientProduct): ProductFields {
  return {
    product_name: p.product_name,
    product_type: p.product_type ?? "",
    carrier: p.carrier ?? "",
    policy_number: p.policy_number ?? "",
    issue_date: p.issue_date ?? "",
    expiration_date: p.expiration_date ?? "",
    conversion_deadline: p.conversion_deadline ?? "",
    final_conversion_deadline: p.final_conversion_deadline ?? "",
    no_exam_declined_at: p.no_exam_declined_at ?? "",
    conversion_notes: p.conversion_notes ?? "",
    face_amount: p.face_amount != null ? String(p.face_amount) : "",
    premium: p.premium != null ? String(p.premium) : "",
    notes: p.notes ?? "",
    owner_client_id: p.owner_client_id ?? "",
    riders: p.riders ?? [],
    minimum_premium: p.minimum_premium != null ? String(p.minimum_premium) : "",
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
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ProductFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  const isConverted = !!product.converted_at;
  const isPending = !!product.conversion_pending_at && !isConverted;

  async function runWorkflowAction(action: (productId: string, clientId: string) => Promise<void>) {
    setWorkflowBusy(true);
    setError("");
    try {
      await action(product.id, clientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update conversion status.");
    } finally {
      setWorkflowBusy(false);
    }
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
        <RidersField value={fields.riders ?? []} onChange={(riders) => setFields((f) => ({ ...f, riders }))} />
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

  const status = getProductStatus(
    product.expiration_date,
    product.conversion_deadline,
    product.final_conversion_deadline,
    product.no_exam_declined_at
  );
  const owner = product.owner_client_id ? ownerOptions.find((o) => o.id === product.owner_client_id) : null;

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-md border p-3 ${
        isPending
          ? "border-[#8b6a00] bg-[#FFFBF0]"
          : isConverted
            ? "border-[#D9CFBA] bg-[#F5F0E8] opacity-80"
            : "border-[#D9CFBA]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#1C1C1C]">{product.product_name}</p>
          <p className="text-xs text-[#707070]">
            {[product.product_type, product.carrier].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {!confirmingDelete && (
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3">
            <a
              href={`/clients/${clientId}/illustrations/${product.id}`}
              className="text-xs text-[#1C1C1C] underline hover:text-[#2E2E2E]"
            >
              Illustration Summary
            </a>
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-[#666] underline hover:text-[#1C1C1C]">
              Edit
            </button>
            {!isPending && !isConverted && (
              <button
                type="button"
                disabled={workflowBusy}
                onClick={() => runWorkflowAction(markConversionPending)}
                className="text-xs text-[#8b6a00] underline hover:text-[#6b5400] disabled:opacity-60"
              >
                Mark Conversion Pending
              </button>
            )}
            {isPending && (
              <>
                <button
                  type="button"
                  disabled={workflowBusy}
                  onClick={() => runWorkflowAction(markConverted)}
                  className="text-xs text-[#00693C] underline hover:text-[#004d2b] disabled:opacity-60"
                >
                  Mark Converted
                </button>
                <button
                  type="button"
                  disabled={workflowBusy}
                  onClick={() => runWorkflowAction(undoConversionPending)}
                  className="text-xs text-[#707070] underline hover:text-[#1C1C1C] disabled:opacity-60"
                >
                  Undo
                </button>
              </>
            )}
            {isConverted && (
              <button
                type="button"
                disabled={workflowBusy}
                onClick={() => runWorkflowAction(undoConverted)}
                className="text-xs text-[#707070] underline hover:text-[#1C1C1C] disabled:opacity-60"
              >
                Undo
              </button>
            )}
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
        {product.is_quote && (
          <span className="self-start rounded-full bg-[#FFF6E5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b6a00]">
            Quote — not yet issued
          </span>
        )}
        {isPending && (
          <span className="self-start rounded-full bg-[#8b6a00] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Conversion Pending
          </span>
        )}
        {isConverted && (
          <span className="self-start rounded-full bg-[#707070] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Converted{" "}
            {new Date(product.converted_at!).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </span>
        )}
        {!isPending && !isConverted && status && (
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

      {product.policy_number && (
        <p className="group/policy flex items-center gap-1.5 text-xs text-[#707070]">
          Policy # {product.policy_number}
          <CopyButton value={product.policy_number} />
        </p>
      )}

      {(product.issue_date || product.expiration_date) && (
        <p className="text-xs text-[#707070]">
          {product.issue_date && `Issued ${new Date(product.issue_date).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
          {product.issue_date && product.expiration_date && " · "}
          {product.expiration_date &&
            `Expires ${new Date(product.expiration_date).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
        </p>
      )}

      {isPending && product.conversion_pending_at && (
        <p className="text-xs font-semibold text-[#8b6a00]">
          Conversion pending since{" "}
          {new Date(product.conversion_pending_at).toLocaleDateString(undefined, { dateStyle: "medium" })} — check in
          with the client until the new policy is issued.
        </p>
      )}

      {product.no_exam_declined_at && (
        <p className="text-xs text-[#8b6a00]">
          No-exam window declined {new Date(product.no_exam_declined_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
          {product.final_conversion_deadline &&
            ` — exam required to convert until ${new Date(product.final_conversion_deadline).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
        </p>
      )}

      {product.conversion_notes && <p className="text-xs text-[#666]">{product.conversion_notes}</p>}

      {product.riders && product.riders.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {product.riders.map((rider) => (
            <span key={rider} className="rounded-full bg-[#F0EDE8] px-2 py-0.5 text-[10px] text-[#666]">
              {rider}
            </span>
          ))}
        </div>
      )}

      {(product.face_amount || product.premium) && (
        <p className="text-xs text-[#707070]">
          {product.face_amount != null && `Face: $${product.face_amount.toLocaleString()}`}
          {product.face_amount != null && product.premium != null && " · "}
          {product.premium != null && `Premium: $${product.premium.toLocaleString()}`}
        </p>
      )}

      {product.minimum_premium != null && (
        <p className="text-xs font-semibold text-[#8b6a00]">
          Minimum to avoid lapse: ${product.minimum_premium.toLocaleString()}/mo
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
