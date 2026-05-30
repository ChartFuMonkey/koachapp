"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Chip } from "@/components/ui/athletic/chip";
import { EmptyState } from "@/components/ui/athletic/empty-state";
import { getActiveProgram, createWorkoutSession } from "@/actions/workout";

type Exercise = {
  id: string;
  name: string;
  notes: string | null;
  video_url: string | null;
};

type ProgramExercise = {
  id: string;
  sets: number;
  reps: string;
  rest_sec: number | null;
  rpe: number | null;
  sort_order: number;
  exercises: Exercise;
};

type ProgramDay = {
  id: string;
  day_label: string;
  sort_order: number;
  program_exercises: ProgramExercise[];
};

type Program = {
  id: string;
  name: string;
  days: ProgramDay[];
};

export default function WorkoutPage() {
  const router = useRouter();
  const t = useTranslations("app.workout");
  const tErrors = useTranslations("app.workout.errors");
  const tCommonErrors = useTranslations("errors");
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  function translateError(code: string): string {
    if (code === "unauthenticated") return tCommonErrors("unauthenticated");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return tErrors(code as any);
    } catch {
      return tCommonErrors("genericLoad");
    }
  }

  useEffect(() => {
    getActiveProgram().then((res) => {
      if (res.error) {
        toast.error(translateError(res.error));
      } else {
        setProgram(res.data as Program | null);
        if (res.data && (res.data as Program).days.length > 0) {
          setExpandedDay((res.data as Program).days[0].id);
        }
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartWorkout(dayId: string) {
    setStarting(true);
    const res = await createWorkoutSession(dayId);
    if (res.error) {
      toast.error(translateError(res.error));
      setStarting(false);
      return;
    }
    router.push(`/app/workout/log?session_id=${res.data!.id}&day_id=${dayId}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink-3" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="px-5 md:px-8 pt-8">
        <EmptyState
          glyph="◎"
          label={t("noProgramTitle")}
          hint={t("noProgramSubtitle").toUpperCase()}
        />
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 pt-5 pb-6">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
        ~/TRAINING
      </div>
      <h1 className="mt-1.5 text-[28px] md:text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink">
        {program.name}
      </h1>
      <p className="mt-2 text-sm text-ink-2">{t("chooseDay")}</p>

      <div className="mt-5 flex flex-col gap-2.5">
        {program.days.map((day, idx) => {
          const isExpanded = expandedDay === day.id;
          const code = String.fromCharCode(65 + idx); // A, B, C, ...
          return (
            <div
              key={day.id}
              className={`overflow-hidden rounded-xl border bg-surface-1 transition-colors ${
                isExpanded ? "border-lime/30" : "border-border"
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-4 text-left active:bg-surface-2/50"
                onClick={() => setExpandedDay(isExpanded ? null : day.id)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md font-mono text-[13px] font-bold ${
                      isExpanded
                        ? "bg-lime text-bg"
                        : "border border-hairline-2 bg-surface-2 text-ink-2"
                    }`}
                  >
                    {code}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-base font-semibold text-ink">
                      {day.day_label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                      {t("exerciseCountShort", {
                        count: day.program_exercises.length,
                      })}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="shrink-0 text-ink-3" />
                ) : (
                  <ChevronDown size={16} className="shrink-0 text-ink-3" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 py-4">
                  <ul className="flex flex-col gap-1.5">
                    {day.program_exercises.map((pe, i) => {
                      const ex = pe.exercises;
                      return (
                        <li
                          key={pe.id}
                          className="grid grid-cols-[24px_1fr_auto] items-center gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2.5"
                        >
                          <span className="font-mono text-[11px] text-ink-3 tabular-nums">
                            {(i + 1).toString().padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-ink truncate">
                              {ex.name}
                            </div>
                            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                              {pe.sets} × {pe.reps}
                              {pe.rpe ? ` · RPE ${pe.rpe}` : ""}
                              {pe.rest_sec
                                ? ` · ${t("restSecondsShort", {
                                    sec: pe.rest_sec,
                                  })}`
                                : ""}
                            </div>
                          </div>
                          <span className="text-ink-3">›</span>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleStartWorkout(day.id)}
                    disabled={starting}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime px-4 py-3.5 text-sm font-bold text-bg hover:bg-lime-hover active:bg-lime-press disabled:opacity-50 transition-all"
                  >
                    {starting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    ▶ {t("startWorkout")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
