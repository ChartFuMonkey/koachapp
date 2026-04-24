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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    router.push(
      `/app/workout/log?session_id=${res.data!.id}&day_id=${dayId}`
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Dumbbell className="mb-4 size-14 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-300">
          {t("noProgramTitle")}
        </h2>
        <p className="mt-2 text-gray-500">{t("noProgramSubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{program.name}</h1>
      <p className="mt-1 text-sm text-gray-400">{t("chooseDay")}</p>

      <div className="mt-6 space-y-3">
        {program.days.map((day) => {
          const isExpanded = expandedDay === day.id;

          return (
            <Card key={day.id} className="overflow-hidden">
              {/* Day header — tappable */}
              <button
                type="button"
                className="flex w-full items-center justify-between p-5 text-left active:bg-white/5"
                onClick={() =>
                  setExpandedDay(isExpanded ? null : day.id)
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/20">
                    <Dumbbell className="size-5 text-blue-400" />
                  </div>
                  <div>
                    <span className="text-lg font-semibold">
                      {day.day_label}
                    </span>
                    <p className="text-sm text-gray-400">
                      {t("exerciseCountShort", {
                        count: day.program_exercises.length,
                      })}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="size-5 text-gray-400" />
                ) : (
                  <ChevronDown className="size-5 text-gray-400" />
                )}
              </button>

              {/* Expanded exercise list */}
              {isExpanded && (
                <CardContent className="border-t border-gray-800 pt-4">
                  <div className="space-y-4">
                    {day.program_exercises.map((pe, idx) => {
                      const ex = pe.exercises;
                      return (
                        <div
                          key={pe.id}
                          className="rounded-lg bg-gray-800/50 p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold">
                                {idx + 1}. {ex.name}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-300">
                                <span>
                                  {pe.sets} x {pe.reps}
                                </span>
                                {pe.rest_sec && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="size-3.5" />
                                    {t("restSecondsShort", { sec: pe.rest_sec })}
                                  </span>
                                )}
                                {pe.rpe && (
                                  <span className="text-orange-400">
                                    RPE {pe.rpe}
                                  </span>
                                )}
                              </div>
                            </div>
                            {ex.video_url && (
                              <a
                                href={ex.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-500/20 px-3 py-2 text-sm font-medium text-blue-400"
                              >
                                <Play className="size-3.5" /> Video
                              </a>
                            )}
                          </div>
                          {ex.notes && (
                            <p className="mt-2 text-sm text-gray-500">
                              {ex.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    className="mt-5 h-14 w-full text-lg font-bold"
                    disabled={starting}
                    onClick={() => handleStartWorkout(day.id)}
                  >
                    {starting ? (
                      <Loader2 className="mr-2 size-5 animate-spin" />
                    ) : (
                      <Play className="mr-2 size-5" />
                    )}
                    {t("startWorkout")}
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
