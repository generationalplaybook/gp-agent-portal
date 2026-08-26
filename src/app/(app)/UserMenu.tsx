"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "./actions";

export default function UserMenu({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#666] hover:bg-[#F5F0E8]"
      >
        {displayName}
        <span className="text-[10px] text-[#999]">▾</span>
      </button>
      <div
        className={`absolute right-0 top-full z-10 w-44 rounded-md border border-[#D9CFBA] bg-white p-1 shadow-md ${
          open ? "block" : "hidden"
        }`}
      >
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="block rounded px-3 py-2 text-sm text-[#2E2E2E] hover:bg-[#F5F0E8]"
        >
          My Profile
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded px-3 py-2 text-left text-sm text-[#2E2E2E] hover:bg-[#F5F0E8]"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
