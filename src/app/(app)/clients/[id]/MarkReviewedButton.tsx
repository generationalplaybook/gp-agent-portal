"use client";

import { useTransition } from "react";
import { markClientReviewed } from "../actions";

export default function MarkReviewedButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markClientReviewed(clientId))}
      className="rounded-md bg-[#8B1A1A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60"
    >
      {isPending ? "Marking..." : "Mark Reviewed"}
    </button>
  );
}
