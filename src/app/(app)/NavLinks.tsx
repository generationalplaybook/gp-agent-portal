"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Shared with MobileNav.tsx — the same 9 links, so the mobile drawer never drifts out of sync
// with the desktop bar. This full row of 9 only fits from md: (768px) up; below that it's fully
// hidden (see layout.tsx) in favor of MobileNav's hamburger drawer, since a 9-item horizontal row
// simply doesn't fit on a phone screen — there isn't a smaller-but-still-horizontal version of
// this that would still be legible.
export const LINKS = [
  { href: "/", label: "Home" },
  { href: "/clients", label: "Clients" },
  { href: "/meetings", label: "Meetings" },
  { href: "/reminders", label: "Reminders" },
  { href: "/team", label: "Team" },
  { href: "/knowledge-base", label: "Knowledge Base" },
  { href: "/client-analyzer", label: "Client Analyzer" },
  { href: "/compare", label: "Compare" },
  { href: "/downloads", label: "Downloads" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "text-sm font-bold text-[#1C1C1C]"
                : "text-sm text-[#2E2E2E] hover:text-[#1C1C1C] hover:font-semibold"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
