import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TERMS_TITLE, TERMS_TEXT } from "@/lib/terms";
import { acceptTerms } from "./actions";

export default async function TermsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-2xl rounded-xl border border-[#D9CFBA] bg-white p-5 shadow-sm sm:p-8">
        <h1 className="mb-1 font-serif text-xl text-[#1C1C1C] sm:text-2xl">{TERMS_TITLE}</h1>
        <p className="mb-5 text-sm text-[#666]">
          Please review and accept these terms to continue using the portal.
        </p>
        {/* Deliberately no fixed max-height/inner scroll here — on a phone, a scrollable box
            nested inside the page's own scroll made it easy to get stuck scrolling the small
            box instead of the page. Letting the text flow with the page means one scroll
            gesture reads the whole thing, top to bottom, on any screen size. */}
        <div className="mb-6 whitespace-pre-wrap rounded-md border border-[#D9CFBA] bg-[#F5F0E8] p-4 text-sm leading-relaxed text-[#2E2E2E] sm:p-5">
          {TERMS_TEXT}
        </div>
        <form action={acceptTerms}>
          <button
            type="submit"
            className="w-full rounded-md bg-[#1C1C1C] px-4 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
          >
            I Agree
          </button>
        </form>
      </div>
    </div>
  );
}
