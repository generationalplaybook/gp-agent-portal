"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINKS } from "./NavLinks";
import { signOut } from "./actions";

// The mobile counterpart to the desktop NavLinks row (see the comment there) — a hamburger button
// that opens a full-width drawer under the top bar, only rendered below md: (see layout.tsx, which
// hides the desktop row and shows this instead). Each link closes the drawer directly via its own
// onClick (same as UserMenu.tsx) rather than watching pathname in an effect — the latter trips
// react-hooks/set-state-in-effect. Also closes on Escape and on click-away, same pattern as UserMenu.tsx.
export default function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#1C1C1C] hover:bg-[#F5F0E8]"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop — tapping outside the panel closes it, same as UserMenu's click-away. */}
          <div className="fixed inset-0 top-14 z-20 bg-black/20" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed inset-x-0 top-14 z-30 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-[#D9CFBA] bg-white shadow-md">
            <div className="flex flex-col divide-y divide-[#EDE8DF] px-2 py-2">
              {LINKS.map((link) => {
                const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`px-3 py-3 text-base ${active ? "font-bold text-[#1C1C1C]" : "text-[#2E2E2E]"}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link href="/profile" onClick={() => setOpen(false)} className="px-3 py-3 text-base text-[#2E2E2E]">
                My Profile
              </Link>
              <Link href="/getting-started" onClick={() => setOpen(false)} className="px-3 py-3 text-base text-[#2E2E2E]">
                Getting Started
              </Link>
              {isAdmin && (
                <Link href="/admin/invite" onClick={() => setOpen(false)} className="px-3 py-3 text-base text-[#2E2E2E]">
                  Invite Advisor
                </Link>
              )}
              <form action={signOut}>
                <button type="submit" className="w-full px-3 py-3 text-left text-base text-[#2E2E2E]">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
