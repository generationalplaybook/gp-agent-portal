"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/clients", label: "Clients" },
  { href: "/reminders", label: "Reminders" },
  { href: "/knowledge-base", label: "Knowledge Base" },
  { href: "/client-analyzer", label: "Client Analyzer" },
  { href: "/compare", label: "Compare" },
  { href: "/downloads", label: "Downloads" },
];

const ADMIN_LINKS = [{ href: "/admin/invite", label: "Invite Agents" }];

export default function NavLinks({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS;

  return (
    <>
      {links.map((link) => {
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
