import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PhaseManager from "./phase-manager";

export default async function PhaseManagerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [clientRes, profileRes, phasesRes, t] = await Promise.all([
    supabaseAdmin.from("clients").select("id").eq("id", id).maybeSingle(),
    supabaseAdmin.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("phases")
      .select("*")
      .eq("client_id", id)
      .order("start_date", { ascending: true }),
    getTranslations("coach.clients.detail"),
  ]);

  if (!clientRes.data) notFound();

  return (
    <PhaseManager
      clientId={id}
      clientName={profileRes.data?.full_name ?? t("unknownClient")}
      phases={phasesRes.data ?? []}
    />
  );
}
