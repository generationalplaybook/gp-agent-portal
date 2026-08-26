"use client";

import { useState } from "react";
import { deleteCredential } from "./actions";

export default function CredentialRow({
  credential,
}: {
  credential: { id: string; label: string; code: string };
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EDE8DF] py-2 last:border-0">
      <div>
        <div className="text-sm font-semibold text-[#1C1C1C]">{credential.label}</div>
        <div className="text-xs text-[#666]">{credential.code}</div>
      </div>
      <button
        type="button"
        disabled={deleting}
        onClick={async () => {
          setDeleting(true);
          await deleteCredential(credential.id);
        }}
        className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414] disabled:opacity-60"
      >
        Remove
      </button>
    </div>
  );
}
