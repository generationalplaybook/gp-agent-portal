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
      <div className="w-full max-w-2xl rounded-xl border border-[#D9CFBA] bg-white p-8 shadow-sm">
        <h1 className="mb-1 font-serif text-2xl text-[#1C1C1C]">{TERMS_TITLE}</h1>
        <p className="mb-5 text-sm text-[#666]">
          Please review and accept these terms to continue using the portal.
        </p>
        <div className="mb-6 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-[#D9CFBA] bg-[#F5F0E8] p-5 text-sm leading-relaxed text-[#2E2E2E]">
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
