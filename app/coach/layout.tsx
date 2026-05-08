import { supabaseAdmin } from "@/lib/supabase/admin";
import CoachShell from "@/components/coach-shell/coach-shell";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clientsRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("clients")
      .select("id")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("profiles").select("id, full_name"),
  ]);

  const profileMap = new Map(
    (profilesRes.data || []).map((p) => [p.id, p.full_name])
  );

  const clientList = (clientsRes.data || []).map((c) => ({
    id: c.id as string,
    name: (profileMap.get(c.id) as string) || "—",
  }));

  return <CoachShell clients={clientList}>{children}</CoachShell>;
}
