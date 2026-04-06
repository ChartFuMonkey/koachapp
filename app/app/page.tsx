import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatCroatianDate(date: Date): string {
  const days = [
    "Nedjelja",
    "Ponedjeljak",
    "Utorak",
    "Srijeda",
    "Četvrtak",
    "Petak",
    "Subota",
  ];
  const months = [
    "siječnja",
    "veljače",
    "ožujka",
    "travnja",
    "svibnja",
    "lipnja",
    "srpnja",
    "kolovoza",
    "rujna",
    "listopada",
    "studenoga",
    "prosinca",
  ];
  return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}.`;
}

function ProgressBar({
  value,
  target,
  color,
}: {
  value: number;
  target: number;
  color: string;
}) {
  const pct = Math.min((value / target) * 100, 100);
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default async function DanasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const [{ data: client }, { data: todayLog }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "first_name, target_calories, target_protein_g, target_carbs_g, target_fat_g, target_steps, target_sleep_h"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", user.id)
      .eq("log_date", today)
      .maybeSingle(),
  ]);

  const name = client?.first_name || "korisnik";
  const dateStr = formatCroatianDate(new Date());

  const metrics = todayLog
    ? [
        {
          label: "Kalorije",
          value: todayLog.calories_kcal,
          target: client?.target_calories,
          unit: "kcal",
          color: "bg-orange-500",
        },
        {
          label: "Proteini",
          value: todayLog.protein_g,
          target: client?.target_protein_g,
          unit: "g",
          color: "bg-blue-500",
        },
        {
          label: "Ugljikohidrati",
          value: todayLog.carbs_g,
          target: client?.target_carbs_g,
          unit: "g",
          color: "bg-yellow-500",
        },
        {
          label: "Masti",
          value: todayLog.fat_g,
          target: client?.target_fat_g,
          unit: "g",
          color: "bg-pink-500",
        },
        {
          label: "Koraci",
          value: todayLog.steps,
          target: client?.target_steps,
          unit: "",
          color: "bg-green-500",
        },
        {
          label: "San",
          value: todayLog.sleep_h,
          target: client?.target_sleep_h,
          unit: "h",
          color: "bg-indigo-500",
        },
      ]
    : null;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">
        Dobar dan, {name}!
      </h1>
      <p className="mt-1 text-sm text-gray-400">{dateStr}</p>

      {todayLog && todayLog.weight_kg != null && (
        <p className="mt-3 text-lg text-gray-300">
          Težina danas:{" "}
          <span className="font-semibold text-white">
            {todayLog.weight_kg} kg
          </span>
        </p>
      )}

      <div className="mt-6 space-y-3">
        {metrics ? (
          <>
            {metrics.map((m) => {
              if (m.value == null) return null;
              const hasTarget = m.target != null;
              return (
                <Card key={m.label} size="sm">
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-gray-400">{m.label}</span>
                      <span className="text-sm font-medium">
                        {m.value.toLocaleString()}
                        {hasTarget && (
                          <span className="text-gray-500">
                            {" "}
                            / {m.target!.toLocaleString()} {m.unit}
                          </span>
                        )}
                        {!hasTarget && m.unit && (
                          <span className="text-gray-500"> {m.unit}</span>
                        )}
                      </span>
                    </div>
                    {hasTarget && (
                      <ProgressBar
                        value={m.value}
                        target={m.target!}
                        color={m.color}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <Link href="/app/log" className="mt-2 block">
              <Button variant="outline" className="h-10 w-full">
                Uredi dnevni log
              </Button>
            </Link>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-8 text-center">
              <ClipboardList className="mb-3 size-10 text-gray-500" />
              <p className="text-lg font-medium">
                Još nisi unio/la dnevni log
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Upiši kako ti je prošao dan
              </p>
              <Link href="/app/log" className="mt-4">
                <Button className="h-10 px-6 text-base font-semibold">
                  Upiši log
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
