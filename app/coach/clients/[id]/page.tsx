import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import ClientDetail from "./client-detail";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [clientRes, profileRes, phaseRes, logsRes, checkinsRes, measRes, photosRes] =
    await Promise.all([
      supabaseAdmin.from("clients").select("*").eq("id", id).maybeSingle(),
      supabaseAdmin.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabaseAdmin
        .from("phases")
        .select("*")
        .eq("client_id", id)
        .eq("is_active", true)
        .maybeSingle(),
      supabaseAdmin
        .from("daily_logs")
        .select("*")
        .eq("client_id", id)
        .order("log_date", { ascending: false })
        .limit(14),
      supabaseAdmin
        .from("checkins")
        .select("*")
        .eq("client_id", id)
        .order("checkin_date", { ascending: false }),
      supabaseAdmin
        .from("measurements")
        .select("*")
        .eq("client_id", id)
        .order("meas_date", { ascending: false }),
      supabaseAdmin
        .from("progress_photos")
        .select("*")
        .eq("client_id", id)
        .order("photo_date", { ascending: false }),
    ]);

  if (!clientRes.data || !profileRes.data) {
    notFound();
  }

  return (
    <ClientDetail
      client={clientRes.data}
      profile={profileRes.data}
      phase={phaseRes.data}
      logs={logsRes.data || []}
      checkins={checkinsRes.data || []}
      measurements={measRes.data || []}
      photos={photosRes.data || []}
    />
  );
}
