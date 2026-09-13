"use client";

import { useState } from "react";
import type { CarrierLogin, StateLicense } from "@/lib/types";
import CarrierLoginsTab from "./CarrierLoginsTab";
import StateLicensesTab from "./StateLicensesTab";

// Replaces the personal spreadsheet Karina was tracking broker/carrier portal logins in — lives
// on My Profile (not any client) since it's the same info regardless of which client she's
// working on. Two tabs, both kept alphabetically sorted (by the page's query) so anything's easy
// to find. See CarrierLoginsTab / StateLicensesTab for why State Licenses deliberately has no
// expiration/status fields.
export default function CarrierAndLicensingCard({
  carrierLogins,
  stateLicenses,
}: {
  carrierLogins: CarrierLogin[];
  stateLicenses: StateLicense[];
}) {
  const [tab, setTab] = useState<"carriers" | "licenses">("carriers");

  const tabClass = (active: boolean) =>
    `-mb-px border-b-2 pb-2.5 text-sm ${
      active ? "border-[#1C1C1C] font-bold text-[#1C1C1C]" : "border-transparent text-[#707070] hover:text-[#2E2E2E]"
    }`;

  return (
    <div className="mb-5 rounded-lg border border-[#D9CFBA] bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Carrier &amp; Licensing</h2>
      <p className="mb-4 text-xs text-[#707070]">
        Your own broker portal logins and state licenses — visible only to you, sorted alphabetically so anything&rsquo;s
        easy to find.
      </p>

      <div className="mb-4 flex gap-5 border-b border-[#D9CFBA]">
        <button type="button" onClick={() => setTab("carriers")} className={tabClass(tab === "carriers")}>
          Carrier Logins
        </button>
        <button type="button" onClick={() => setTab("licenses")} className={tabClass(tab === "licenses")}>
          State Licenses
        </button>
      </div>

      {tab === "carriers" ? (
        <CarrierLoginsTab logins={carrierLogins} />
      ) : (
        <StateLicensesTab licenses={stateLicenses} />
      )}
    </div>
  );
}
