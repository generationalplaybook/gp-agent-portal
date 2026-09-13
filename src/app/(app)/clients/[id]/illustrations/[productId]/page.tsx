import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IllustrationForm from "./IllustrationForm";

export default async function IllustrationPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id, productId } = await params;
  const supabase = await createClient();

  const [
    { data: client, error: clientError },
    { data: product, error: productError },
    { data: illustration },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("clients").select("id, full_name").eq("id", id).single(),
    supabase.from("client_products").select("id, product_name, product_type, carrier").eq("id", productId).single(),
    supabase.from("product_illustrations").select("data").eq("product_id", productId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (clientError || !client || productError || !product) notFound();

  let advisor: { name?: string; phone?: string; email?: string } | undefined;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name, phone, email").eq("id", user.id).single();
    advisor = {
      name: profile?.full_name ?? undefined,
      phone: profile?.phone ?? undefined,
      email: profile?.email ?? user.email ?? undefined,
    };
  }

  return (
    <div className="mx-auto max-w-4xl">
      <a href={`/clients/${client.id}`} className="mb-4 inline-block text-xs text-[#666] underline hover:text-[#1C1C1C]">
        ← Back to {client.full_name}
      </a>
      <h1 className="mb-1 font-serif text-2xl text-[#1C1C1C]">Illustration Summary</h1>
      <p className="mb-5 text-sm text-[#666]">
        {product.product_name}
        {product.carrier ? ` · ${product.carrier}` : ""}
        {product.product_type ? ` · ${product.product_type}` : ""}
      </p>
      <IllustrationForm
        clientId={client.id}
        clientName={client.full_name}
        product={product}
        initialData={(illustration?.data as never) ?? null}
        advisor={advisor}
      />
    </div>
  );
}
