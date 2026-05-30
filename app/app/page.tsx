import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayCET } from "@/lib/date";
import { getTodayMeals } from "@/actions/client-meal-plan";
import { Num } from "@/components/ui/athletic/num";
import { CountUp } from "@/components/ui/athletic/count-up";
import { StackedMacroBar } from "@/components/ui/athletic/progress-bar";
import InboxCard from "@/components/client-shell/inbox-card";

function getInitials(name: string | null | undefined): string {
  if (!name) return "K";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatLocalizedDate(date: Date, locale: string): string {
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";
  return new Intl.DateTimeFormat(bcp47, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(date)
    .toUpperCase();
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function TodayPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = await getTranslations("app.home");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayCET();

  const [
    { data: client },
    { data: selfProfile },
    { data: todayLog },
    { data: recentLogs },
    mealPlanResult,
    { data: todaySession },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "target_calories, target_protein_g, target_carbs_g, target_fat_g, target_steps, target_sleep_h, start_date"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", user.id)
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("log_date")
      .eq("client_id", user.id)
      .order("log_date", { ascending: false })
      .limit(60),
    getTodayMeals(),
    supabase
      .from("workout_sessions")
      .select(
        `
        id, duration_min, session_date,
        program_days ( day_label, program_exercises ( id, sets, rpe ) ),
        exercise_logs ( id )
      `
      )
      .eq("client_id", user.id)
      .eq("session_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const fullName = (selfProfile?.full_name as string | null) ?? null;
  const name = fullName?.trim().split(/\s+/)[0] || t("nameFallback");
  const dateStr = formatLocalizedDate(new Date(), locale);
  const mealData = mealPlanResult.data;

  // Coach info for the inbox card
  const coachId = process.env.NEXT_PUBLIC_COACH_UUID;
  const { data: coachProfile } = coachId
    ? await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", coachId)
        .maybeSingle()
    : { data: null };
  const coachFullName = (coachProfile?.full_name as string | null) ?? "Coach";
  const coachFirstName = coachFullName.split(" ")[0] || "Coach";
  const coachInitials = getInitials(coachFullName);

  // Day number since start
  const dayNumber = client?.start_date
    ? Math.max(
        1,
        Math.floor(
          (Date.now() -
            new Date((client.start_date as string) + "T00:00").getTime()) /
            86400000
        ) + 1
      )
    : null;

  // Streak
  const loggedDates = new Set(
    (recentLogs || []).map((l) => l.log_date as string)
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = daysAgoStr(i);
    if (loggedDates.has(d)) {
      streak++;
    } else if (i > 0) {
      break;
    } else {
      break;
    }
  }

  const targetCal = client?.target_calories ?? 2400;
  const eatenCal = (todayLog?.calories_kcal as number | null) ?? 0;
  const calPct = Math.min(100, Math.round((eatenCal / targetCal) * 100));

  const targetP = (client?.target_protein_g as number | null) ?? 180;
  const targetC = (client?.target_carbs_g as number | null) ?? 240;
  const targetF = (client?.target_fat_g as number | null) ?? 70;
  const eatenP = (todayLog?.protein_g as number | null) ?? 0;
  const eatenC = (todayLog?.carbs_g as number | null) ?? 0;
  const eatenF = (todayLog?.fat_g as number | null) ?? 0;

  const targetSteps = (client?.target_steps as number | null) ?? 10000;
  const eatenSteps = (todayLog?.steps as number | null) ?? 0;
  const targetSleep = (client?.target_sleep_h as number | null) ?? 8;
  const eatenSleep = (todayLog?.sleep_h as number | null) ?? 0;
  const stepsPct = Math.min(100, Math.round((eatenSteps / targetSteps) * 100));
  const sleepPct = Math.min(100, Math.round((eatenSleep / targetSleep) * 100));

  const programDay = todaySession
    ? Array.isArray(todaySession.program_days)
      ? todaySession.program_days[0]
      : (todaySession.program_days as
          | {
              day_label?: string;
              program_exercises?: {
                id: string;
                sets: number | null;
                rpe: number | null;
              }[];
            }
          | null)
    : null;

  const plannedExerciseList = Array.isArray(programDay?.program_exercises)
    ? programDay!.program_exercises!
    : [];

  // Average planned RPE across the day's exercises (only if any are set).
  const rpeValues = plannedExerciseList
    .map((pe) => pe.rpe)
    .filter((r): r is number => r != null);
  const avgPlannedRpe =
    rpeValues.length > 0
      ? Math.round(
          (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10
        ) / 10
      : null;

  const workout = todaySession
    ? {
        dayLabel: programDay?.day_label ?? t("workoutFallback"),
        duration: todaySession.duration_min as number | null,
        loggedSets: Array.isArray(todaySession.exercise_logs)
          ? todaySession.exercise_logs.length
          : 0,
        plannedExercises: plannedExerciseList.length,
        // Sum of planned sets across the day's exercises (default 3 when unset).
        plannedSets: plannedExerciseList.reduce(
          (sum, pe) => sum + (pe.sets ?? 3),
          0
        ),
        finished: todaySession.duration_min != null,
      }
    : null;

  return (
    <div className="flex flex-col">
      {/* Top header */}
      <div className="px-5 md:px-8 pt-5 md:pt-8 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
              {dateStr}
              {dayNumber != null && ` · DAY ${dayNumber}`}
            </div>
            <h1 className="mt-1.5 text-[28px] md:text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink">
              {t("greeting", { name })}
            </h1>
          </div>
          {streak > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[0.06em]"
              style={{
                background: "rgba(197,247,59,0.12)",
                color: "var(--lime)",
                borderColor: "rgba(197,247,59,0.3)",
              }}
            >
              🔥 {streak}D
            </span>
          )}
        </div>
      </div>

      <div className="px-5 md:px-8 pb-6 flex flex-col gap-3.5 mt-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:items-start">
        {/* Hero card — Energy budget (full-width across the grid) */}
        <div className="md:col-span-2 lg:col-span-3 relative overflow-hidden rounded-xl border border-border bg-surface-1 p-5 lg:p-6">
          <div
            aria-hidden
            className="absolute -top-10 -right-10 size-40"
            style={{
              background:
                "radial-gradient(circle, rgba(197,247,59,0.35), transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
              ENERGY BUDGET
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <CountUp
                value={eatenCal}
                className="font-mono text-[44px] font-bold leading-none tracking-[-0.02em] text-ink"
              />
              <span className="text-sm text-ink-2">
                / <Num value={targetCal} /> kcal
              </span>
            </div>
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-lime transition-[width] duration-400"
                style={{ width: `${calPct}%` }}
              />
            </div>
            {/* Macros 3-up */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                {
                  label: "PROTEIN",
                  v: eatenP,
                  target: targetP,
                  color: "var(--protein)",
                },
                {
                  label: "CARBS",
                  v: eatenC,
                  target: targetC,
                  color: "var(--carb)",
                },
                {
                  label: "FAT",
                  v: eatenF,
                  target: targetF,
                  color: "var(--fat)",
                },
              ].map((m) => {
                const pct = Math.min(100, (m.v / Math.max(1, m.target)) * 100);
                return (
                  <div key={m.label}>
                    <div className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">
                      {m.label}
                    </div>
                    <div className="mt-1 flex items-baseline gap-0.5">
                      <span className="font-mono text-base font-semibold tabular-nums text-ink">
                        <Num value={m.v} />
                      </span>
                      <span className="font-mono text-[10px] text-ink-3">
                        /<Num value={m.target} />g
                      </span>
                    </div>
                    <div className="mt-1 h-[2px] rounded-full bg-hairline">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: m.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inbox — messages from coach */}
        <InboxCard
          clientId={user.id}
          currentUserId={user.id}
          coachInitials={coachInitials}
          coachFirstName={coachFirstName}
        />

        {/* Today's session card */}
        <div className="rounded-xl border border-border bg-surface-1 p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
              TODAY&apos;S SESSION
            </span>
            {avgPlannedRpe != null && (
              <span className="inline-flex rounded-[3px] border border-hairline-2 bg-surface-2 px-1.5 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-ink-2">
                RPE {avgPlannedRpe}
              </span>
            )}
          </div>
          {workout ? (
            <>
              <div className="mt-3 flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl">
                  🦵
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-ink truncate">
                    {workout.dayLabel}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                    {workout.plannedExercises > 0
                      ? `${workout.plannedExercises} EX`
                      : ""}
                    {workout.duration != null
                      ? ` · ~${workout.duration} MIN`
                      : ""}
                    {workout.loggedSets > 0
                      ? ` · ${workout.loggedSets} SETS`
                      : ""}
                  </div>
                </div>
              </div>
              {workout.plannedSets > 0 && (
                <div className="mt-3.5">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                    <span>{t("setsLogged")}</span>
                    <span className="tabular-nums">
                      {Math.min(workout.loggedSets, workout.plannedSets)}/
                      {workout.plannedSets}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full rounded-full bg-good transition-[width] duration-400"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (workout.loggedSets / workout.plannedSets) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <Link
                href="/app/workout"
                className="mt-3.5 inline-flex w-full items-center justify-center rounded-lg bg-lime px-4 py-3.5 text-sm font-bold text-bg hover:bg-lime-hover active:bg-lime-press transition-all"
              >
                ▶ {workout.finished ? t("training") : t("startWorkout")}
              </Link>
            </>
          ) : (
            <Link
              href="/app/workout"
              className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-hairline-2 bg-surface-2/30 p-3.5 transition-colors hover:border-lime/40"
            >
              <span className="text-sm text-ink-2">{t("noWorkoutToday")}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                {t("training")} ›
              </span>
            </Link>
          )}
        </div>

        {/* Meals + day stats — stacked within the grid cell. */}
        <div className="flex flex-col gap-3.5">
        {/* Meals list */}
        {mealData && mealData.meals.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
                MEALS · {mealData.meals.length}
              </span>
              <Link
                href="/app/log"
                className="font-mono text-[12px] text-lime hover:bg-lime-hover active:bg-lime-press"
              >
                + {t("logDay")}
              </Link>
            </div>
            {(mealData.dailyTotals.protein > 0 ||
              mealData.dailyTotals.carbs > 0 ||
              mealData.dailyTotals.fat > 0) && (
              <StackedMacroBar
                protein={mealData.dailyTotals.protein}
                carb={mealData.dailyTotals.carbs}
                fat={mealData.dailyTotals.fat}
                size="thin"
                className="mb-2.5"
              />
            )}
            <div className="flex flex-col gap-1.5">
              {mealData.meals.map((m, i) => {
                const summary = m.foods
                  .map((f) => f.name)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(", ");
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-3.5 py-3"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-surface-2 font-mono text-[11px] text-ink-3 tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink truncate">
                        {m.meal_name || t("training") + " " + (i + 1)}
                      </div>
                      {summary && (
                        <div className="mt-0.5 text-[11px] text-ink-3 truncate">
                          {summary}
                        </div>
                      )}
                    </div>
                    <div className="font-mono text-[12px] tabular-nums shrink-0">
                      <span className="text-ink">
                        <Num value={m.totals.cal} />
                      </span>
                      <span className="text-[9px] text-ink-3 ml-0.5">kcal</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2-up stats: steps + sleep */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-surface-1 p-3.5">
            <div className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">
              STEPS
            </div>
            <div className="mt-1.5 font-mono text-[22px] font-semibold leading-none text-ink tabular-nums">
              <Num value={eatenSteps} />
            </div>
            <div className="mt-1 h-[2px] rounded-full bg-hairline">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${stepsPct}%`,
                  background: "var(--violet)",
                }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-3.5">
            <div className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">
              SLEEP
            </div>
            <div className="mt-1.5 font-mono text-[22px] font-semibold leading-none text-ink tabular-nums">
              <Num value={eatenSleep} decimals={1} />
              <span className="text-xs text-ink-3 ml-0.5">h</span>
            </div>
            <div className="mt-1 h-[2px] rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-good"
                style={{ width: `${sleepPct}%` }}
              />
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
