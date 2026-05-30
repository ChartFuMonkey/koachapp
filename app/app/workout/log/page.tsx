"use client";

import { Suspense } from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Chip } from "@/components/ui/athletic/chip";
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

function fmtClock(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Elapsed chip (header right) ─────────────────────────────────────
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

  return (
    <Chip variant="ghost" className="gap-1.5">
      <span className="font-mono tabular-nums text-ink">
        {fmtClock(elapsed)}
      </span>
      <span>{t("elapsedLabel")}</span>
    </Chip>
  );
}

// ── Rest timer card (anchored in sessionStorage) ────────────────────
function RestTimerCard({
  seconds,
  storageKey,
  onDone,
}: {
  seconds: number;
  storageKey: string;
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState<number>(() => {
    if (typeof window === "undefined") return seconds;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const startedAt = parseInt(stored, 10);
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      return Math.max(0, seconds - elapsed);
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

  const elapsed = seconds - remaining;
  const pct = Math.min(100, Math.max(0, (elapsed / seconds) * 100));

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-1 p-4 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        REST TIMER
      </div>
      <div
        className="my-2 font-mono font-bold tabular-nums text-lime"
        style={{ fontSize: 56, lineHeight: 1, letterSpacing: "-0.04em" }}
      >
        {fmtClock(remaining)}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        OF {fmtClock(seconds)} · TARGET
      </div>
      <div className="mt-3 h-[3px] overflow-hidden rounded-sm bg-border">
        <div
          className="h-full rounded-sm bg-lime transition-all duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
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
  const [completedSets, setCompletedSets] = useState<
    Record<string, Array<{ setNum: number; weight: number; reps: number; rpe: number | null }>>
  >({});
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
  const doneSetsForCurrent = currentExercise
    ? completedSets[currentExercise.id] ?? []
    : [];
  const currentExDone =
    currentExercise && doneSetsForCurrent.length >= currentExercise.sets;
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

  // ── Steppers ──────────────────────────────────────────────────────
  function bumpWeight(delta: number) {
    const cur = parseFloat(weightInput) || 0;
    const next = Math.max(0, cur + delta);
    setWeightInput(Number.isInteger(next) ? next.toString() : next.toFixed(1));
  }
  function bumpReps(delta: number) {
    const cur = parseInt(repsInput, 10) || 0;
    setRepsInput(Math.max(0, cur + delta).toString());
  }
  function bumpRpe(delta: number) {
    setRpeInput((r) => Math.min(10, Math.max(0, r + delta)));
  }

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
    const savedRpe = rpeInput > 0 ? rpeInput : null;
    setCompletedSets((prev) => {
      const arr = prev[currentExercise.id] ?? [];
      return {
        ...prev,
        [currentExercise.id]: [
          ...arr,
          { setNum: currentSetNum, weight, reps, rpe: savedRpe },
        ],
      };
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
        <div className="mb-5 flex size-20 items-center justify-center rounded-full border border-good/30 bg-good/10">
          <Trophy className="size-9 text-good" />
        </div>
        <h2 className="text-2xl font-bold text-ink">{t("allDone")}</h2>
        <p className="mt-2 font-mono text-ink-2">
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

  // Build set log rows: completed sets carry their saved values; current = inputs; rest = NEXT
  const setRows = Array.from({ length: currentExercise.sets }, (_, i) => {
    const setNum = i + 1;
    const done = doneSetsForCurrent.find((d) => d.setNum === setNum);
    if (done) {
      return {
        setNum,
        status: "done" as const,
        weight: done.weight,
        reps: done.reps,
        rpe: done.rpe,
      };
    }
    if (setNum === currentSetNum && !showRest) {
      const w = parseFloat(weightInput);
      const r = parseInt(repsInput, 10);
      return {
        setNum,
        status: "now" as const,
        weight: Number.isFinite(w) && weightInput !== "" ? w : null,
        reps: Number.isFinite(r) && repsInput !== "" ? r : null,
        rpe: rpeInput > 0 ? rpeInput : null,
      };
    }
    return {
      setNum,
      status: "next" as const,
      weight: null,
      reps: null,
      rpe: null,
    };
  });

  const upcoming = exercises.slice(currentExIdx + 1);
  const restTarget =
    currentExercise.rest_sec && currentExercise.rest_sec > 0
      ? currentExercise.rest_sec
      : 120;

  return (
    <div className="pb-6">
      {/* Sticky-ish header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {t("exShort")} {(currentExIdx + 1).toString().padStart(2, "0")}/
            {totalExercises.toString().padStart(2, "0")} · {t("setShort")}{" "}
            {currentSetNum.toString().padStart(2, "0")}/
            {currentExercise.sets.toString().padStart(2, "0")}
          </span>
          <ElapsedChip startTimestamp={sessionStartRef.current} />
        </div>
        <h1
          className="mt-1.5 font-semibold text-ink"
          style={{ fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          {ex.name}
        </h1>
        {ex.notes ? (
          <p className="mt-1 text-xs text-ink-2">{ex.notes}</p>
        ) : null}
      </div>

      <div className="px-5 py-4">
        {/* Big lifting card */}
        <div
          className="relative overflow-hidden rounded-2xl border border-lime/30 p-5"
          style={{ background: "linear-gradient(180deg, #1A1F12, var(--surface-1))" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 80% 20%, rgba(197,247,59,0.13), transparent 50%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-lime">
              <span className="pulse-live">●</span>
              <span>{t("liftingNow")}</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              {/* LOAD */}
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                  {t("loadLabel")}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder="0"
                    className="w-full min-w-0 bg-transparent p-0 font-mono font-bold tabular-nums text-ink outline-none focus:text-lime"
                    style={{ fontSize: 36, letterSpacing: "-0.02em", lineHeight: 1 }}
                  />
                  <span className="font-mono text-[11px] text-ink-3">kg</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => bumpWeight(-2.5)}
                    className="h-6 w-7 rounded-md border border-border bg-surface-2 font-mono text-[11px] text-ink-2 hover:text-ink"
                    aria-label="−2.5"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => bumpWeight(2.5)}
                    className="h-6 w-7 rounded-md border border-border bg-surface-2 font-mono text-[11px] text-ink-2 hover:text-ink"
                    aria-label="+2.5"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* REPS */}
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                  {t("repsLabelShort")}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={repsInput}
                    onChange={(e) => setRepsInput(e.target.value)}
                    placeholder="0"
                    className="w-full min-w-0 bg-transparent p-0 font-mono font-bold tabular-nums text-ink outline-none focus:text-lime"
                    style={{ fontSize: 36, letterSpacing: "-0.02em", lineHeight: 1 }}
                  />
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => bumpReps(-1)}
                    className="h-6 w-7 rounded-md border border-border bg-surface-2 font-mono text-[11px] text-ink-2 hover:text-ink"
                    aria-label="−1"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => bumpReps(1)}
                    className="h-6 w-7 rounded-md border border-border bg-surface-2 font-mono text-[11px] text-ink-2 hover:text-ink"
                    aria-label="+1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* RPE */}
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                  {t("rpeLabel")}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10}
                    value={rpeInput || ""}
                    onChange={(e) =>
                      setRpeInput(
                        Math.min(10, Math.max(0, parseInt(e.target.value, 10) || 0))
                      )
                    }
                    placeholder="—"
                    className="w-full min-w-0 bg-transparent p-0 font-mono font-bold tabular-nums text-ink outline-none focus:text-lime"
                    style={{ fontSize: 36, letterSpacing: "-0.02em", lineHeight: 1 }}
                  />
                  <span className="font-mono text-[11px] text-ink-3">/10</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => bumpRpe(-1)}
                    className="h-6 w-7 rounded-md border border-border bg-surface-2 font-mono text-[11px] text-ink-2 hover:text-ink"
                    aria-label="−1"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => bumpRpe(1)}
                    className="h-6 w-7 rounded-md border border-border bg-surface-2 font-mono text-[11px] text-ink-2 hover:text-ink"
                    aria-label="+1"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSet}
              disabled={saving}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-lime px-4 py-3.5 text-sm font-bold text-bg transition hover:bg-lime/90 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              <span>{t("saveSet")}</span>
            </button>
          </div>
        </div>

        {/* Set log card */}
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
              SET LOG
            </span>
            <span className="font-mono text-[11px] tabular-nums text-ink-3">
              {currentExercise.sets} × {currentExercise.reps}
            </span>
          </div>
          {setRows.map((r, i) => {
            const isLast = i === setRows.length - 1;
            const inkClass = r.status === "next" ? "text-ink-3" : "text-ink";
            return (
              <div
                key={r.setNum}
                className={`grid items-center px-4 py-3.5 font-mono text-[13px] tabular-nums ${
                  isLast ? "" : "border-b border-border"
                } ${r.status === "now" ? "bg-lime/5" : ""}`}
                style={{ gridTemplateColumns: "40px 1fr 1fr 1fr 80px" }}
              >
                <span
                  className={`text-[16px] font-bold ${
                    r.status === "next" ? "text-ink-3" : "text-ink"
                  }`}
                >
                  #{r.setNum}
                </span>
                <span className={inkClass}>
                  {r.weight != null ? `${r.weight}kg` : "—"}
                </span>
                <span className={inkClass}>
                  {r.reps != null ? `${r.reps} rep` : "—"}
                </span>
                <span className={inkClass}>
                  {r.rpe != null ? `@${r.rpe}` : "—"}
                </span>
                <span className="justify-self-end">
                  {r.status === "done" ? (
                    <Chip variant="good">DONE</Chip>
                  ) : r.status === "now" ? (
                    <span className="inline-flex h-5 items-center rounded-[3px] border border-transparent bg-lime/20 px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-lime">
                      NOW
                    </span>
                  ) : (
                    <Chip variant="neutral">NEXT</Chip>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rest timer (only while resting) */}
        {showRest && (
          <RestTimerCard
            seconds={restTarget}
            storageKey={`rest-${sessionId}-${currentExercise.id}-${currentSetNum}`}
            onDone={handleRestDone}
          />
        )}

        {/* Up next */}
        {upcoming.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              {t("upNext").toUpperCase()}
            </div>
            <ul className="space-y-1.5">
              {upcoming.map((pe, i) => {
                const n = (currentExIdx + 2 + i).toString().padStart(2, "0");
                const meta = `${pe.sets} × ${pe.reps}${
                  pe.rpe ? ` @${pe.rpe}` : ""
                }`;
                return (
                  <li
                    key={pe.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 p-3"
                  >
                    <span className="w-6 shrink-0 font-mono text-[14px] font-bold tabular-nums text-ink-3">
                      {n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {pe.exercises.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-3">
                        {meta}
                      </div>
                    </div>
                    <span className="shrink-0 text-ink-3">›</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Bottom action — finish session */}
        <Button
          variant="outline"
          size="lg"
          className="mt-5 w-full"
          disabled={saving}
          onClick={handleFinishWorkout}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("finishWorkout")}
        </Button>
      </div>
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
