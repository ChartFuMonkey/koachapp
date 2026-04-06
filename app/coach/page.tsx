import Link from "next/link";
import { UserPlus } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function CoachPage() {
  const [clientsRes, phasesRes, logsRes] = await Promise.all([
    supabaseAdmin
      .from("clients")
      .select("id, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("phases")
      .select("client_id, name")
      .eq("is_active", true),
    supabaseAdmin
      .from("daily_logs")
      .select("client_id, log_date, weight_kg")
      .order("log_date", { ascending: false })
      .limit(1000),
  ]);

  const clients = clientsRes.data || [];
  const phases = phasesRes.data || [];
  const logs = logsRes.data || [];

  // Fetch profile names for all client IDs
  const clientIds = clients.map((c) => c.id);
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .in("id", clientIds.length > 0 ? clientIds : ["none"]);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p.full_name])
  );
  const phaseMap = new Map(phases.map((p) => [p.client_id, p.name]));

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .split("T")[0];

  const clientData = clients.map((c) => {
    const clientLogs = logs.filter((l) => l.client_id === c.id);
    const latestLog = clientLogs[0] || null;
    const weekCount = clientLogs.filter(
      (l) => l.log_date >= sevenDaysAgo
    ).length;

    return {
      id: c.id,
      name: profileMap.get(c.id) || "—",
      isActive: c.is_active,
      phaseName: phaseMap.get(c.id) || "—",
      lastLogDate: latestLog?.log_date || null,
      lastWeight: latestLog?.weight_kg || null,
      weekLogs: weekCount,
    };
  });

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg text-gray-400">
          Nema klijenata. Dodaj prvog klijenta.
        </p>
        <Link href="/coach/clients/new" className="mt-4">
          <Button>
            <UserPlus size={16} /> Novi klijent
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Klijenti</h1>
        <Link href="/coach/clients/new">
          <Button>
            <UserPlus size={16} /> Novi klijent
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Ime
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Faza
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Zadnji log
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Težina
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Ovaj tjedan
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {clientData.map((c) => (
              <tr
                key={c.id}
                className="border-b border-gray-800/50 transition-colors last:border-0 hover:bg-gray-900/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/coach/clients/${c.id}`}
                    className="font-medium text-white transition-colors hover:text-blue-400"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400">{c.phaseName}</td>
                <td className="px-4 py-3 text-gray-400">
                  {c.lastLogDate
                    ? new Date(c.lastLogDate + "T00:00").toLocaleDateString(
                        "hr-HR"
                      )
                    : "Nikad"}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {c.lastWeight != null ? `${c.lastWeight} kg` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {c.weekLogs}/7 dana
                </td>
                <td className="px-4 py-3">
                  {c.isActive ? (
                    <Badge className="border-green-500/30 bg-green-500/20 text-green-400">
                      Aktivan
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Neaktivan</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
