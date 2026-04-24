"use client";

import { Suspense } from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Check,
  Loader2,
  Play,
  SkipForward,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getDayExercises,
  logExerciseSet,
  finishWorkoutSession,
  getPreviousWeights,
} from "@/actions/workout";

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

// ── Rest timer ──────────────────────────────────────────────────────
function RestTimer({
  seconds,
  onDone,
  onSkip,
}: {
  seconds: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const t = useTranslations("app.workout");
  const [remaining, setRemaining] = useState(seconds);
  const total = seconds;

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDone]);

  const pct = ((total - remaining) / total) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex flex-col items-center py-8">
      <p className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-400">
        {t("restLabel")}
      </p>

      {/* Circular progress */}
      <div className="relative flex size-48 items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-800"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
            strokeLinecap="round"
            className="text-blue-500 transition-all duration-1000"
          />
        </svg>
        <span className="absolute text-5xl font-bold tabular-nums">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>

      <Button
        variant="outline"
        className="mt-6 h-12 px-8 text-base"
        onClick={onSkip}
      >
        <SkipForward className="mr-2 size-4" />
        {t("skipRest")}
      </Button>
    </div>
  );
}

// ── Main workout log (inner, uses searchParams) ─────────────────────
function WorkoutLogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const dayId = searchParams.get("day_id");
  const t = useTranslations("app.workout");
  const tErrors = useTranslations("app.workout.errors");
  const tCommonErrors = useTranslations("errors");

  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevWeights, setPrevWeights] = useState<Record<string, number>>({});

  // Workout state
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSetNum, setCurrentSetNum] = useState(1);
  const [completedSets, setCompletedSets] = useState<
    Record<string, number[]>
  >({});
  const [showRest, setShowRest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  // Input state
  const [repsInput, setRepsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [rpeInput, setRpeInput] = useState(0);

  // Timer for session duration
  const sessionStartRef = useRef(Date.now());

  function translateError(code: string): string {
    if (code === "unauthenticated") return tCommonErrors("unauthenticated");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return tErrors(code as any);
    } catch {
      return tCommonErrors("genericLoad");
    }
  }

  // Load exercises
  useEffect(() => {
    if (!dayId) return;

    getDayExercises(dayId).then((res) => {
      if (res.error) {
        toast.error(translateError(res.error));
        setLoading(false);
        return;
      }
      const exs = (res.data ?? []) as ProgramExercise[];
      setExercises(exs);

      // Pre-fill reps from first exercise target
      if (exs.length > 0) {
        const targetReps = parseTargetReps(exs[0].reps);
        setRepsInput(targetReps.toString());
      }

      // Fetch previous weights
      const exerciseIds = exs.map((e) => e.exercises.id);
      if (exerciseIds.length > 0) {
        getPreviousWeights(exerciseIds).then((wRes) => {
          if (wRes.data) setPrevWeights(wRes.data);
        });
      }

      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  // Parse target reps — handles "8-12" (takes first number), "8", etc.
  function parseTargetReps(reps: string): number {
    const match = reps.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  const currentExercise = exercises[currentExIdx];
  const totalExercises = exercises.length;

  // Check if all sets of current exercise are done
  const currentExDone =
    currentExercise &&
    (completedSets[currentExercise.id]?.length ?? 0) >=
      currentExercise.sets;

  // Check if this is the very last set of the very last exercise
  const isLastExercise = currentExIdx === totalExercises - 1;

  // When advancing to next exercise, pre-fill inputs
  function advanceToNextExercise() {
    const nextIdx = currentExIdx + 1;
    if (nextIdx >= totalExercises) {
      // All done — handled by finish button
      return;
    }
    setCurrentExIdx(nextIdx);
    setCurrentSetNum(1);
    setShowRest(false);
    const nextEx = exercises[nextIdx];
    setRepsInput(parseTargetReps(nextEx.reps).toString());
    setWeightInput(
      prevWeights[nextEx.exercises.id]?.toString() ?? ""
    );
    setRpeInput(0);
  }

  const handleRestDone = useCallback(() => {
    setShowRest(false);
    if (currentExDone) {
      // Move to next exercise
      advanceToNextExercise();
    }
    // Otherwise stay on same exercise for next set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExDone, currentExIdx, totalExercises, exercises, prevWeights]);

  async function handleSaveSet() {
    if (!sessionId || !currentExercise) return;

    const reps = parseInt(repsInput, 10);
    const weight = parseFloat(weightInput) || 0;

    if (!reps || reps <= 0) {
      toast.error(t("needReps"));
      return;
    }

    setSaving(true);
    const res = await logExerciseSet({
      session_id: sessionId,
      exercise_id: currentExercise.exercises.id,
      set_number: currentSetNum,
      reps,
      weight_kg: weight,
      rpe: rpeInput > 0 ? rpeInput : null,
      notes: null,
    });

    setSaving(false);

    if (res.error) {
      toast.error(translateError(res.error));
      return;
    }

    // Mark set as completed
    setCompletedSets((prev) => {
      const arr = prev[currentExercise.id] ?? [];
      return { ...prev, [currentExercise.id]: [...arr, currentSetNum] };
    });

    const nextSetNum = currentSetNum + 1;
    const allSetsDone = nextSetNum > currentExercise.sets;

    if (allSetsDone && isLastExercise) {
      // Last set of last exercise — show finish state
      setFinished(true);
      return;
    }

    if (allSetsDone) {
      // All sets done for this exercise — show rest then advance
      if (currentExercise.rest_sec && currentExercise.rest_sec > 0) {
        setShowRest(true);
        // After rest, advanceToNextExercise will be called
      } else {
        advanceToNextExercise();
      }
      return;
    }

    // More sets to go — show rest timer between sets
    setCurrentSetNum(nextSetNum);
    if (currentExercise.rest_sec && currentExercise.rest_sec > 0) {
      setShowRest(true);
    }
  }

  async function handleFinishWorkout() {
    if (!sessionId) return;
    setSaving(true);
    const durationMin = Math.round(
      (Date.now() - sessionStartRef.current) / 60000
    );
    const res = await finishWorkoutSession(sessionId, durationMin);
    setSaving(false);

    if (res.error) {
      toast.error(translateError(res.error));
      return;
    }

    toast.success(t("workoutDoneToast") + " 💪");
    router.push("/app/workout");
  }

  // ── Render ──────────────────────────────────────────────────────

  if (!sessionId || !dayId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
        <p className="text-gray-400">{t("invalidSession")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
        <p className="text-gray-400">{t("noExercisesForDay")}</p>
      </div>
    );
  }

  // ── Finished state ──────────────────────────────────────────────
  if (finished) {
    const durationMin = Math.round(
      (Date.now() - sessionStartRef.current) / 60000
    );
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-green-500/20">
          <Trophy className="size-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold">{t("allDone")}</h2>
        <p className="mt-2 text-gray-400">
          {t("durationMinutes", { min: durationMin })}
        </p>
        <Button
          className="mt-8 h-14 px-10 text-lg font-bold"
          disabled={saving}
          onClick={handleFinishWorkout}
        >
          {saving ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : (
            <Trophy className="mr-2 size-5" />
          )}
          {t("finishWorkout")}
        </Button>
      </div>
    );
  }

  const ex = currentExercise.exercises;
  const prevWeight = prevWeights[ex.id];
  const doneSets = completedSets[currentExercise.id] ?? [];

  // ── Rest timer ──────────────────────────────────────────────────
  if (showRest) {
    return (
      <div className="p-4">
        {/* Progress bar */}
        <div className="mb-2 flex items-center justify-between text-sm text-gray-400">
          <span>
            {t("exerciseCount", {
              current: currentExIdx + 1,
              total: totalExercises,
            })}
          </span>
          <button
            type="button"
            className="text-red-400"
            onClick={handleFinishWorkout}
          >
            {t("finishEarly")}
          </button>
        </div>
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: `${((currentExIdx + 1) / totalExercises) * 100}%`,
            }}
          />
        </div>

        <RestTimer
          seconds={currentExercise.rest_sec ?? 60}
          onDone={handleRestDone}
          onSkip={handleRestDone}
        />
      </div>
    );
  }

  // ── Active exercise ─────────────────────────────────────────────
  return (
    <div className="p-4">
      {/* Top progress */}
      <div className="mb-2 flex items-center justify-between text-sm text-gray-400">
        <span>
          {t("exerciseCount", {
            current: currentExIdx + 1,
            total: totalExercises,
          })}
        </span>
        <button
          type="button"
          className="text-red-400"
          onClick={handleFinishWorkout}
        >
          {t("finishEarly")}
        </button>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{
            width: `${((currentExIdx + (doneSets.length / currentExercise.sets)) / totalExercises) * 100}%`,
          }}
        />
      </div>

      {/* Exercise heading */}
      <h1 className="text-2xl font-bold">{ex.name}</h1>
      <p className="mt-1 text-gray-400">
        {t("goal", {
          sets: currentExercise.sets,
          reps: currentExercise.reps,
        })}
      </p>

      <div className="mt-2 flex flex-wrap gap-3">
        {ex.video_url && (
          <a
            href={ex.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2.5 py-1.5 text-xs font-medium text-blue-400"
          >
            <Play className="size-3" /> Video
          </a>
        )}
        {prevWeight != null && (
          <span className="inline-flex items-center rounded-md bg-gray-800 px-2.5 py-1.5 text-xs text-gray-300">
            {t("lastTimeWeight", { kg: prevWeight })}
          </span>
        )}
      </div>

      {ex.notes && (
        <p className="mt-3 text-sm text-gray-500">{ex.notes}</p>
      )}

      {/* Set dots — show which sets are done */}
      <div className="mt-5 flex gap-2">
        {Array.from({ length: currentExercise.sets }, (_, i) => {
          const setNum = i + 1;
          const isDone = doneSets.includes(setNum);
          const isCurrent = setNum === currentSetNum;
          return (
            <div
              key={setNum}
              className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${
                isDone
                  ? "bg-green-500/20 text-green-400"
                  : isCurrent
                    ? "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500"
                    : "bg-gray-800 text-gray-500"
              }`}
            >
              {isDone ? (
                <Check className="size-4" />
              ) : (
                setNum
              )}
            </div>
          );
        })}
      </div>

      {/* Current set input */}
      <div className="mt-6 rounded-xl bg-gray-800/50 p-5">
        <p className="mb-4 text-center text-lg font-semibold">
          {t("setLabel", { n: currentSetNum })}
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Reps */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              {t("repsLabel")}
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
              className="h-14 w-full rounded-lg border border-gray-700 bg-gray-900 text-center text-2xl font-bold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              {t("weightLabel")}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="0"
              className="h-14 w-full rounded-lg border border-gray-700 bg-gray-900 text-center text-2xl font-bold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* RPE slider */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">RPE</label>
            <span className="text-sm font-medium text-orange-400">
              {rpeInput > 0 ? rpeInput : "—"}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={rpeInput}
            onChange={(e) => setRpeInput(parseInt(e.target.value, 10))}
            className="mt-1 w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>{t("easy")}</span>
            <span>{t("max")}</span>
          </div>
        </div>

        {/* Save set button */}
        <Button
          className="mt-5 h-14 w-full text-lg font-bold"
          disabled={saving}
          onClick={handleSaveSet}
        >
          {saving ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : (
            <Check className="mr-2 size-5" />
          )}
          {t("saveSet")}
        </Button>
      </div>
    </div>
  );
}

// ── Page wrapper with Suspense for useSearchParams ──────────────────
export default function WorkoutLogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <WorkoutLogInner />
    </Suspense>
  );
}
