import { supabaseAdmin } from "@/lib/supabase/admin";
import CoachShell from "@/components/coach-shell/coach-shell";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const coachId = process.env.NEXT_PUBLIC_COACH_UUID;

  const [clientsRes, profilesRes, coachProfileRes] = await Promise.all([
    supabaseAdmin
      .from("clients")
      .select("id")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("profiles").select("id, full_name"),
    coachId
      ? supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", coachId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profileMap = new Map(
    (profilesRes.data || []).map((p) => [p.id, p.full_name])
  );

  const clientList = (clientsRes.data || []).map((c) => ({
    id: c.id as string,
    name: (profileMap.get(c.id) as string) || "—",
  }));

  const coachName =
    (coachProfileRes.data?.full_name as string | null) || "Coach";

  return (
    <CoachShell clients={clientList} coachName={coachName}>
      {children}
    </CoachShell>
  );
}
