import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ClipboardList,
  TrendingUp,
  Dumbbell,
  Play,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { todayCET } from "@/lib/date";
import { getTodayMeals } from "@/actions/client-meal-plan";
import MealPlanToday from "@/components/meal-plan-today";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Num } from "@/components/ui/athletic/num";
import { Chip } from "@/components/ui/athletic/chip";
import { ProgressBar, StackedMacroBar } from "@/components/ui/athletic/progress-bar";

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

export default async function DanasPage() {
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
    { data: todayLog },
    { data: recentLogs },
    mealPlanResult,
    { data: todaySession },
  ] = await Promise.all([
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
        program_days ( day_label ),
        exercise_logs ( id )
      `
      )
      .eq("client_id", user.id)
      .eq("session_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const name = client?.first_name || t("nameFallback");
  const dateStr = formatLocalizedDate(new Date(), locale);
  const mealData = mealPlanResult.data;

  // Streak calculation
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

  const targetCal = client?.target_calories ?? 2000;
  const eatenCal = (todayLog?.calories_kcal as number | null) ?? 0;
  const calPct = Math.round((eatenCal / targetCal) * 100);

  const targetP = client?.target_protein_g ?? 0;
  const targetC = client?.target_carbs_g ?? 0;
  const targetF = client?.target_fat_g ?? 0;
  const eatenP = (todayLog?.protein_g as number | null) ?? 0;
  const eatenC = (todayLog?.carbs_g as number | null) ?? 0;
  const eatenF = (todayLog?.fat_g as number | null) ?? 0;

  const targetSteps = client?.target_steps ?? 10000;
  const eatenSteps = (todayLog?.steps as number | null) ?? 0;
  const targetSleep = client?.target_sleep_h ?? 8;
  const eatenSleep = (todayLog?.sleep_h as number | null) ?? 0;

  const workout = todaySession
    ? {
        dayLabel:
          (Array.isArray(todaySession.program_days)
            ? todaySession.program_days[0]?.day_label
            : (todaySession.program_days as { day_label?: string } | null)?.day_label) ??
          t("workoutFallback"),
        duration: todaySession.duration_min as number | null,
        exerciseCount: Array.isArray(todaySession.exercise_logs)
          ? todaySession.exercise_logs.length
          : 0,
        finished: todaySession.duration_min != null,
      }
    : null;

  return (
    <div className="px-5 pt-5 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <MicroLabel>{dateStr}</MicroLabel>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight text-ink tracking-tight">
            {t("greeting", { name })}
          </h1>
        </div>
        {streak > 0 && (
          <Chip variant="warn" size="lg" className="gap-1.5 mt-1">
            <Flame className="size-3" />
            {streak}d
          </Chip>
        )}
      </div>

      {/* Energy budget hero */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <MicroLabel>~/Energy budget</MicroLabel>
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
            {calPct}%
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-[44px] font-bold leading-none tracking-[-0.02em] text-ink tabular-nums">
            <Num value={eatenCal} />
          </span>
          <span className="font-mono text-sm text-ink-3">
            / <Num value={targetCal} /> kcal
          </span>
        </div>
        <ProgressBar
          value={Math.min(eatenCal, targetCal)}
          max={targetCal}
          size="thick"
          className="mt-4"
        />
        {(targetP > 0 || targetC > 0 || targetF > 0) && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                  P
                </span>
                <span className="font-mono text-[11px] text-ink tabular-nums">
                  <Num value={eatenP} />/<Num value={targetP} />
                </span>
              </div>
              <ProgressBar
                value={eatenP}
                max={targetP || 1}
                size="thin"
                color="var(--protein)"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                  C
                </span>
                <span className="font-mono text-[11px] text-ink tabular-nums">
                  <Num value={eatenC} />/<Num value={targetC} />
                </span>
              </div>
              <ProgressBar
                value={eatenC}
                max={targetC || 1}
                size="thin"
                color="var(--carb)"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                  F
                </span>
                <span className="font-mono text-[11px] text-ink tabular-nums">
                  <Num value={eatenF} />/<Num value={targetF} />
                </span>
              </div>
              <ProgressBar
                value={eatenF}
                max={targetF || 1}
                size="thin"
                color="var(--fat)"
              />
            </div>
          </div>
        )}
      </div>

      {/* Today's session */}
      <div className="mt-4">
        <MicroLabel>{t("training").toUpperCase()}</MicroLabel>
        <div className="mt-2">
          {workout ? (
            <Link
              href="/app/workout"
              className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-ink">
                    {workout.dayLabel}
                  </span>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                    {workout.duration != null
                      ? `${workout.duration} min`
                      : t("inProgress")}
                    {workout.exerciseCount > 0 &&
                      ` · ${workout.exerciseCount} ${t("setsSuffix")}`}
                  </p>
                </div>
                {workout.finished ? (
                  <Chip variant="good">DONE</Chip>
                ) : (
                  <Button size="sm">
                    <Play size={12} /> {t("inProgress")}
                  </Button>
                )}
              </div>
            </Link>
          ) : (
            <Link
              href="/app/workout"
              className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Dumbbell size={20} className="text-ink-3" />
                  <span className="text-sm text-ink-2">
                    {t("noWorkoutToday")}
                  </span>
                </div>
                <Button size="sm" variant="outline">
                  {t("training")}
                </Button>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Meal plan */}
      {mealData && mealData.meals.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <MicroLabel>{t("nutrition").toUpperCase()}</MicroLabel>
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
              <Num value={mealData.dailyTotals.cal} /> kcal
            </span>
          </div>
          {(mealData.dailyTotals.protein > 0 ||
            mealData.dailyTotals.carbs > 0 ||
            mealData.dailyTotals.fat > 0) && (
            <StackedMacroBar
              protein={mealData.dailyTotals.protein}
              carb={mealData.dailyTotals.carbs}
              fat={mealData.dailyTotals.fat}
              className="mb-3"
            />
          )}
          <MealPlanToday meals={mealData.meals} />
        </div>
      )}

      {/* 2-up: steps + sleep */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <MicroLabel>STEPS</MicroLabel>
          <div className="mt-2 font-mono text-[22px] font-semibold leading-none text-ink tabular-nums">
            <Num value={eatenSteps} />
          </div>
          <div className="mt-1 font-mono text-[10px] text-ink-3">
            / <Num value={targetSteps} />
          </div>
          <ProgressBar
            value={Math.min(eatenSteps, targetSteps)}
            max={targetSteps}
            size="thin"
            color="var(--violet)"
            className="mt-3"
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <MicroLabel>SLEEP</MicroLabel>
          <div className="mt-2 font-mono text-[22px] font-semibold leading-none text-ink tabular-nums">
            <Num value={eatenSleep} decimals={1} />
            <span className="text-ink-3 text-sm font-normal ml-0.5">h</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-ink-3">
            / <Num value={targetSleep} decimals={0} />h
          </div>
          <ProgressBar
            value={Math.min(eatenSleep, targetSleep)}
            max={targetSleep}
            size="thin"
            color="var(--good)"
            className="mt-3"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href="/app/log">
          <Button variant="outline" size="lg" className="w-full">
            <ClipboardList className="size-4" />
            {t("logDay")}
          </Button>
        </Link>
        <Link href="/app/progress">
          <Button variant="outline" size="lg" className="w-full">
            <TrendingUp className="size-4" />
            {t("seeProgress")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
