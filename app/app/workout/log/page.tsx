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
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Chip } from "@/components/ui/athletic/chip";
import { Num } from "@/components/ui/athletic/num";
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

// ── Elapsed timer (top of screen) ───────────────────────────────────
function ElapsedChip({ startTimestamp }: { startTimestamp: number }) {
  const t = useTranslations("app.workout");
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startTimestamp) / 1000)
  );

  useEffect(() => {
    const recalc = () =>
      setElapsed(Math.floor((Date.now() - startTimestamp) / 1000));
    const id = setInterval(recalc, 1000);
    function onVisible() {
      if (document.visibilityState === "visible") recalc();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startTimestamp]);

  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  return (
    <Chip variant="ghost" className="gap-1.5">
      <span className="size-1 rounded-full bg-good shadow-[0_0_6px_rgba(61,232,160,0.5)]" />
      <span>{t("elapsedLabel")}</span>
      <span className="text-ink">
        {mm}:{ss.toString().padStart(2, "0")}
      </span>
    </Chip>
  );
}

// ── Rest timer (sessionStorage-anchored) ────────────────────────────
function RestTimer({
  seconds,
  storageKey,
  onDone,
  onSkip,
}: {
  seconds: number;
  storageKey: string;
  onDone: () => void;
  onSkip: () => void;
}) {
  const t = useTranslations("app.workout");
  const [remaining, setRemaining] = useState<number>(() => {
    if (typeof window === "undefined") return seconds;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const startedAt = parseInt(stored, 10);
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, seconds - elapsed);
      return left;
    }
    sessionStorage.setItem(storageKey, Date.now().toString());
    return seconds;
  });

  useEffect(() => {
    function recalc() {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const startedAt = parseInt(stored, 10);
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        sessionStorage.removeItem(storageKey);
        onDone();
      }
    }
    const id = setInterval(recalc, 250);
    function onVisible() {
      if (document.visibilityState === "visible") recalc();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [seconds, storageKey, onDone]);

  function handleSkip() {
    sessionStorage.removeItem(storageKey);
    onSkip();
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const elapsed = seconds - remaining;
  const pct = (elapsed / seconds) * 100;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 mt-4">
      <div className="flex items-center justify-between">
        <MicroLabel className="text-primary">● {t("restingNow")}</MicroLabel>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
          {seconds}s
        </span>
      </div>
      <div
        className="mt-4 text-center font-mono font-bold text-primary tabular-nums"
        style={{
          fontSize: "56px",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          textShadow: "0 0 24px rgba(197, 247, 59, 0.35)",
        }}
      >
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Button
        variant="outline"
        size="lg"
        className="mt-5 w-full"
        onClick={handleSkip}
      >
        <SkipForward className="size-4" />
        {t("skipRest")}
      </Button>
    </div>
  );
}

// ── Main workout log inner component ────────────────────────────────
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
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSetNum, setCurrentSetNum] = useState(1);
  const [completedSets, setCompletedSets] = useState<Record<string, number[]>>(
    {}
  );
  const [showRest, setShowRest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [repsInput, setRepsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [rpeInput, setRpeInput] = useState(0);

  // Stable session start timestamp — survives suspend via sessionStorage
  const sessionStartRef = useRef<number>(0);
  if (sessionStartRef.current === 0 && typeof window !== "undefined") {
    const key = `workout-start-${sessionId ?? ""}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      sessionStartRef.current = parseInt(stored, 10);
    } else {
      sessionStartRef.current = Date.now();
      sessionStorage.setItem(key, sessionStartRef.current.toString());
    }
  }

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
    if (!dayId) return;
    getDayExercises(dayId).then((res) => {
      if (res.error) {
        toast.error(translateError(res.error));
        setLoading(false);
        return;
      }
      const exs = (res.data ?? []) as ProgramExercise[];
      setExercises(exs);
      if (exs.length > 0) {
        const targetReps = parseTargetReps(exs[0].reps);
        setRepsInput(targetReps.toString());
      }
      const exerciseIds = exs.map((e) => e.exercises.id);
      if (exerciseIds.length > 0) {
        getPreviousWeights(exerciseIds).then((wRes) => {
          if (wRes.data) setPrevWeights(wRes.data);
          if (exs.length > 0) {
            setWeightInput(wRes.data?.[exs[0].exercises.id]?.toString() ?? "");
          }
        });
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  function parseTargetReps(reps: string): number {
    const match = reps.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  const currentExercise = exercises[currentExIdx];
  const totalExercises = exercises.length;
  const currentExDone =
    currentExercise &&
    (completedSets[currentExercise.id]?.length ?? 0) >= currentExercise.sets;
  const isLastExercise = currentExIdx === totalExercises - 1;

  const advanceToNextExercise = useCallback(() => {
    const nextIdx = currentExIdx + 1;
    if (nextIdx >= totalExercises) return;
    setCurrentExIdx(nextIdx);
    setCurrentSetNum(1);
    setShowRest(false);
    const nextEx = exercises[nextIdx];
    setRepsInput(parseTargetReps(nextEx.reps).toString());
    setWeightInput(prevWeights[nextEx.exercises.id]?.toString() ?? "");
    setRpeInput(0);
  }, [currentExIdx, exercises, prevWeights, totalExercises]);

  const handleRestDone = useCallback(() => {
    setShowRest(false);
    if (currentExDone) advanceToNextExercise();
  }, [currentExDone, advanceToNextExercise]);

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
    setCompletedSets((prev) => {
      const arr = prev[currentExercise.id] ?? [];
      return { ...prev, [currentExercise.id]: [...arr, currentSetNum] };
    });
    const nextSetNum = currentSetNum + 1;
    const allSetsDone = nextSetNum > currentExercise.sets;
    if (allSetsDone && isLastExercise) {
      setFinished(true);
      return;
    }
    if (allSetsDone) {
      if (currentExercise.rest_sec && currentExercise.rest_sec > 0) {
        setShowRest(true);
      } else {
        advanceToNextExercise();
      }
      return;
    }
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
    sessionStorage.removeItem(`workout-start-${sessionId}`);
    toast.success(t("workoutDoneToast"));
    router.push("/app/workout");
  }

  if (!sessionId || !dayId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
        <p className="text-ink-3">{t("invalidSession")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink-3" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
        <p className="text-ink-3">{t("noExercisesForDay")}</p>
      </div>
    );
  }

  if (finished) {
    const durationMin = Math.round(
      (Date.now() - sessionStartRef.current) / 60000
    );
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-good/10 border border-good/30">
          <Trophy className="size-9 text-good" />
        </div>
        <h2 className="text-2xl font-bold text-ink">{t("allDone")}</h2>
        <p className="mt-2 text-ink-2 font-mono">
          {t("durationMinutes", { min: durationMin })}
        </p>
        <Button
          size="lg"
          className="mt-7 w-full max-w-xs"
          disabled={saving}
          onClick={handleFinishWorkout}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trophy className="size-4" />
          )}
          {t("finishWorkout")}
        </Button>
      </div>
    );
  }

  const ex = currentExercise.exercises;
  const prevWeight = prevWeights[ex.id];
  const doneSets = completedSets[currentExercise.id] ?? [];

  // Build set log table data: status per set + last logged values
  const setRows = Array.from({ length: currentExercise.sets }, (_, i) => {
    const setNum = i + 1;
    const isDone = doneSets.includes(setNum);
    const isCurrent = setNum === currentSetNum && !showRest;
    const status: "done" | "now" | "next" = isDone
      ? "done"
      : isCurrent
        ? "now"
        : "next";
    return { setNum, status };
  });

  // ── Header (shared) ─────────────────────────────────────────────
  const Header = (
    <div className="flex items-center justify-between gap-3 mb-3">
      <button
        type="button"
        onClick={handleFinishWorkout}
        aria-label={t("finishEarly")}
        className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="flex-1 text-center">
        <MicroLabel>
          {t("exShort")} {(currentExIdx + 1).toString().padStart(2, "0")} /{" "}
          {totalExercises.toString().padStart(2, "0")} ·{" "}
          {t("setShort")} {currentSetNum.toString().padStart(2, "0")} /{" "}
          {currentExercise.sets.toString().padStart(2, "0")}
        </MicroLabel>
      </div>
      <ElapsedChip startTimestamp={sessionStartRef.current} />
    </div>
  );

  return (
    <div className="px-5 pt-5 pb-6">
      {Header}

      {/* Exercise name */}
      <h1 className="text-[26px] font-semibold leading-tight text-ink tracking-tight">
        {ex.name}
      </h1>
      <p className="mt-1 font-mono text-xs text-ink-3">
        {currentExercise.sets} × {currentExercise.reps}
        {currentExercise.rpe ? ` · RPE ${currentExercise.rpe}` : ""}
      </p>

      {/* Set dots */}
      <div className="mt-4 flex gap-2">
        {Array.from({ length: currentExercise.sets }, (_, i) => {
          const setNum = i + 1;
          const isDone = doneSets.includes(setNum);
          const isCurrent = setNum === currentSetNum && !showRest;
          return (
            <div
              key={setNum}
              className={`flex h-8 flex-1 items-center justify-center rounded-md font-mono text-[11px] font-medium transition-colors ${
                isDone
                  ? "bg-good/10 text-good border border-good/30"
                  : isCurrent
                    ? "bg-primary/10 text-primary border border-primary/40"
                    : "bg-surface-2 text-ink-3 border border-border"
              }`}
            >
              {isDone ? (
                <Check className="size-3.5" />
              ) : (
                setNum.toString().padStart(2, "0")
              )}
            </div>
          );
        })}
      </div>

      {/* Rest timer state */}
      {showRest ? (
        <RestTimer
          seconds={currentExercise.rest_sec ?? 60}
          storageKey={`rest-${sessionId}-${currentExercise.id}-${currentSetNum}`}
          onDone={handleRestDone}
          onSkip={handleRestDone}
        />
      ) : (
        <>
          {/* Live workout card — lime-glow */}
          <div
            className="relative mt-5 overflow-hidden rounded-2xl border p-5"
            style={{
              background: "linear-gradient(180deg, #1A1F12, #111317)",
              borderColor: "rgba(197, 247, 59, 0.2)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 80% 20%, rgba(197,247,59,0.13), transparent 50%)",
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <MicroLabel className="text-primary">
                  ● {t("liftingNow")}
                </MicroLabel>
                {prevWeight != null && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                    {t("previous")}: <Num value={prevWeight} /> kg
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {/* Weight */}
                <div className="flex flex-col items-start">
                  <MicroLabel>{t("loadLabel")}</MicroLabel>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full bg-transparent border-b border-border/60 pb-1 font-mono text-[28px] font-semibold text-ink tabular-nums focus:border-primary outline-none"
                  />
                  <span className="font-mono text-[10px] text-ink-3 mt-1">kg</span>
                </div>
                {/* Reps */}
                <div className="flex flex-col items-start">
                  <MicroLabel>{t("repsLabelShort")}</MicroLabel>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={repsInput}
                    onChange={(e) => setRepsInput(e.target.value)}
                    className="mt-1 w-full bg-transparent border-b border-border/60 pb-1 font-mono text-[28px] font-semibold text-ink tabular-nums focus:border-primary outline-none"
                  />
                  <span className="font-mono text-[10px] text-ink-3 mt-1">
                    × {currentExercise.reps}
                  </span>
                </div>
                {/* RPE */}
                <div className="flex flex-col items-start">
                  <MicroLabel>{t("rpeLabel")}</MicroLabel>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="10"
                    value={rpeInput || ""}
                    onChange={(e) =>
                      setRpeInput(parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="—"
                    className="mt-1 w-full bg-transparent border-b border-border/60 pb-1 font-mono text-[28px] font-semibold text-ink tabular-nums focus:border-primary outline-none"
                  />
                  <span className="font-mono text-[10px] text-ink-3 mt-1">
                    /10
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-6 w-full"
                disabled={saving}
                onClick={handleSaveSet}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {t("saveSet")}
              </Button>
            </div>
          </div>

          {/* SET LOG table */}
          <div className="mt-5 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <MicroLabel>SET LOG</MicroLabel>
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                {currentExercise.sets} × {currentExercise.reps}
              </span>
            </div>
            {setRows.map((r, i) => (
              <div
                key={r.setNum}
                className={`grid grid-cols-[32px_1fr_1fr_1fr_72px] items-center px-4 py-2.5 font-mono text-[12px] ${
                  i < setRows.length - 1 ? "border-b border-border" : ""
                } ${r.status === "now" ? "bg-primary/[0.04]" : ""}`}
              >
                <span
                  className={`text-[14px] font-bold ${
                    r.status === "next" ? "text-ink-3" : "text-ink"
                  }`}
                >
                  #{r.setNum}
                </span>
                <span className={r.status === "next" ? "text-ink-3" : "text-ink"}>
                  {r.status === "now"
                    ? `${weightInput || "—"}${weightInput ? " kg" : ""}`
                    : r.status === "done"
                      ? "—"
                      : "—"}
                </span>
                <span className={r.status === "next" ? "text-ink-3" : "text-ink"}>
                  {r.status === "now"
                    ? `${repsInput || "—"}${repsInput ? " rep" : ""}`
                    : "—"}
                </span>
                <span className={r.status === "next" ? "text-ink-3" : "text-ink"}>
                  {r.status === "now" && rpeInput > 0
                    ? `@${rpeInput}`
                    : "—"}
                </span>
                <Chip
                  variant={
                    r.status === "done"
                      ? "good"
                      : r.status === "now"
                        ? "accent"
                        : "neutral"
                  }
                  className="justify-self-end"
                >
                  {r.status === "done"
                    ? t("doneSet")
                    : r.status === "now"
                      ? t("currentSet")
                      : t("upNext").toUpperCase().slice(0, 4)}
                </Chip>
              </div>
            ))}
          </div>

          {/* Notes */}
          {ex.notes && (
            <p className="mt-4 text-sm text-ink-3 leading-relaxed">
              {ex.notes}
            </p>
          )}

          {/* Video link */}
          {ex.video_url && (
            <a
              href={ex.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 hover:bg-surface-3"
            >
              <Play className="size-3" /> Video
            </a>
          )}
        </>
      )}

      {/* Up next */}
      {currentExIdx + 1 < totalExercises && (
        <div className="mt-7">
          <MicroLabel>{t("upNext")}</MicroLabel>
          <ul className="mt-2 space-y-1">
            {exercises.slice(currentExIdx + 1, currentExIdx + 4).map((pe, i) => (
              <li
                key={pe.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-ink-3 shrink-0">
                    {(currentExIdx + 2 + i).toString().padStart(2, "0")}
                  </span>
                  <span className="text-sm text-ink truncate">
                    {pe.exercises.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-ink-3">
                  {pe.sets} × {pe.reps}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function WorkoutLogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-ink-3" />
        </div>
      }
    >
      <WorkoutLogInner />
    </Suspense>
  );
}
