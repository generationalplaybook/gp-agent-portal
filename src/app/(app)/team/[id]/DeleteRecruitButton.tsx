"use client";

import { useState } from "react";
import { deleteRecruit } from "../actions";

export default function DeleteRecruitButton({ recruitId, recruitName }: { recruitId: string; recruitName: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
      >
        Delete Recruit
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#8B1A1A]">
        Delete {recruitName}? Their linked client record (if any) is not affected. This can&rsquo;t be retrieved
        again.
      </span>
      <form action={deleteRecruit}>
        <input type="hidden" name="recruit_id" value={recruitId} />
        <button
          type="submit"
          className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414]"
        >
          Yes, delete
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
      >
        Cancel
      </button>
    </div>
  );
}
