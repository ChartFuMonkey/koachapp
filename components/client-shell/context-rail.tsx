"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RailData = {
  coachNote: string | null;
  weekProgram: { day: string; code: string | null }[];
  streak: number;
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "K";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ClientContextRail() {
  const [data, setData] = useState<RailData | null>(null);
  const [coachName, setCoachName] = useState<string>("Coach");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const coachId = process.env.NEXT_PUBLIC_COACH_UUID;

      const [logsRes, programRes, coachRes, clientRes] = await Promise.all([
        supabase
          .from("daily_logs")
          .select("log_date")
          .eq("client_id", user.id)
          .order("log_date", { ascending: false })
          .limit(365),
        supabase
          .from("workout_sessions")
          .select(
            `session_date, program_days ( day_label )`
          )
          .eq("client_id", user.id)
          .gte(
            "session_date",
            new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
          )
          .order("session_date", { ascending: true }),
        coachId
          ? supabase
              .from("profiles")
              .select("full_name")
              .eq("id", coachId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("clients")
          .select("notes")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      // Streak
      const dates = new Set((logsRes.data ?? []).map((l) => l.log_date as string));
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(Date.now() - i * 86400000)
          .toISOString()
          .slice(0, 10);
        if (dates.has(d)) {
          streak++;
        } else if (i > 0) {
          break;
        } else {
          break;
        }
      }

      // Week strip — 7 days starting Monday of this week
      const today = new Date();
      const dow = today.getDay(); // 0=Sun
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(today);
      monday.setDate(monday.getDate() + mondayOffset);
      const sessionByDate = new Map<string, string>();
      for (const s of programRes.data ?? []) {
        const day = Array.isArray(s.program_days)
          ? s.program_days[0]
          : (s.program_days as { day_label?: string } | null);
        if (day?.day_label) {
          sessionByDate.set(s.session_date as string, day.day_label.slice(0, 1));
        }
      }
      const weekProgram = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        return {
          day: ["M", "T", "W", "T", "F", "S", "S"][i],
          code: sessionByDate.get(iso) ?? null,
        };
      });

      const coachNote = (clientRes.data?.notes as string | null) ?? null;

      setData({ coachNote, weekProgram, streak });
      if (coachRes.data?.full_name) setCoachName(coachRes.data.full_name as string);
    }
    load();
  }, []);

  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      <div>
        <div className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-ink-3">
          FROM COACH
        </div>
        {data.coachNote ? (
          <div className="mt-2 rounded-md bg-surface-2 border border-border p-3">
            <div className="flex items-center gap-2">
              <div
                className="flex size-[18px] items-center justify-center rounded-full text-bg font-bold text-[8px]"
                style={{
                  background: "linear-gradient(135deg, #C5F73B, #3DE8A0)",
                }}
              >
                {getInitials(coachName)}
              </div>
              <span className="text-[10px] font-semibold text-ink">
                Coach {coachName.split(" ")[0]}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
              &ldquo;{data.coachNote}&rdquo;
            </p>
          </div>
        ) : (
          <div className="mt-2 rounded-md border border-dashed border-hairline-2 bg-surface-2/40 p-3">
            <p className="text-[11px] text-ink-3">No note this week.</p>
          </div>
        )}
      </div>

      <div>
        <div className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-ink-3">
          WEEK
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {data.weekProgram.map((d, i) => (
            <div
              key={i}
              className={`aspect-square rounded-[5px] grid place-items-center font-mono text-[10px] font-semibold ${
                d.code
                  ? "bg-lime text-bg"
                  : "bg-surface-2 text-ink-3"
              }`}
              aria-label={d.code ? `${d.day} workout ${d.code}` : `${d.day} rest`}
            >
              <span>{d.code ?? d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-ink-3">
          STREAK
        </div>
        <div className="mt-1 font-mono text-[22px] font-bold text-lime tabular-nums">
          {data.streak}d
        </div>
      </div>
    </div>
  );
}
