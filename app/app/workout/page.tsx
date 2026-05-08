"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Play,
  Timer,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Chip } from "@/components/ui/athletic/chip";
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <Dumbbell className="mb-4 size-12 text-ink-4" />
        <h2 className="text-lg font-semibold text-ink">
          {t("noProgramTitle")}
        </h2>
        <p className="mt-2 text-sm text-ink-3 max-w-xs">
          {t("noProgramSubtitle")}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-6">
      <MicroLabel>~/Training</MicroLabel>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight text-ink tracking-tight">
        {program.name}
      </h1>
      <p className="mt-1 text-sm text-ink-3">{t("chooseDay")}</p>

      <div className="mt-5 space-y-3">
        {program.days.map((day, idx) => {
          const isExpanded = expandedDay === day.id;
          return (
            <div
              key={day.id}
              className={`overflow-hidden rounded-xl border bg-surface transition-colors ${
                isExpanded ? "border-primary/30" : "border-border"
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 text-left active:bg-surface-2/50"
                onClick={() => setExpandedDay(isExpanded ? null : day.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                    D{(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <span className="text-base font-semibold text-ink truncate block">
                      {day.day_label}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.06em]">
                      {t("exerciseCountShort", {
                        count: day.program_exercises.length,
                      })}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-ink-3 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-ink-3 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-5 py-4">
                  <ul className="space-y-2">
                    {day.program_exercises.map((pe, i) => {
                      const ex = pe.exercises;
                      return (
                        <li
                          key={pe.id}
                          className="rounded-lg bg-surface-2/50 border border-border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-ink-3 shrink-0">
                                  {(i + 1).toString().padStart(2, "0")}
                                </span>
                                <span className="text-sm font-medium text-ink truncate">
                                  {ex.name}
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                <Chip variant="ghost" size="sm">
                                  {pe.sets} × {pe.reps}
                                </Chip>
                                {pe.rest_sec ? (
                                  <Chip variant="ghost" size="sm">
                                    <Timer className="size-2.5" />
                                    {t("restSecondsShort", {
                                      sec: pe.rest_sec,
                                    })}
                                  </Chip>
                                ) : null}
                                {pe.rpe ? (
                                  <Chip variant="warn" size="sm">
                                    RPE {pe.rpe}
                                  </Chip>
                                ) : null}
                              </div>
                              {ex.notes && (
                                <p className="mt-2 text-xs text-ink-3 leading-relaxed">
                                  {ex.notes}
                                </p>
                              )}
                            </div>
                            {ex.video_url && (
                              <a
                                href={ex.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Video"
                                className="shrink-0 inline-flex items-center justify-center size-8 rounded-md border border-border bg-surface text-ink-2 hover:bg-surface-3"
                              >
                                <Play className="size-3.5" />
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <Button
                    size="lg"
                    className="mt-5 w-full"
                    disabled={starting}
                    onClick={() => handleStartWorkout(day.id)}
                  >
                    {starting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    {t("startWorkout")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
