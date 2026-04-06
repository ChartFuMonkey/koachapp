import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import PhaseManager from "./phase-manager";

export default async function PhaseManagerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [clientRes, profileRes, phasesRes] = await Promise.all([
    supabaseAdmin.from("clients").select("id").eq("id", id).maybeSingle(),
    supabaseAdmin.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("phases")
      .select("*")
      .eq("client_id", id)
      .order("start_date", { ascending: true }),
  ]);

  if (!clientRes.data) notFound();

  return (
    <PhaseManager
      clientId={id}
      clientName={profileRes.data?.full_name ?? "Client"}
      phases={phasesRes.data ?? []}
    />
  );
}
