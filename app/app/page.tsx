import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  Dumbbell,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { todayCET } from "@/lib/date";
import { getTodayMeals } from "@/actions/client-meal-plan";
import MealPlanToday from "@/components/meal-plan-today";

function formatLocalizedDate(date: Date, locale: string): string {
  // Use the active locale; fall back to hr-HR for "hr" and en-US for "en"
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";
  return new Intl.DateTimeFormat(bcp47, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
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

  // Fetch all data in parallel
  const [{ data: client }, mealPlanResult, { data: todaySession }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle(),
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

  // Normalize workout session
  const workout = todaySession
    ? {
        dayLabel:
          (Array.isArray(todaySession.program_days)
            ? todaySession.program_days[0]?.day_label
            : (todaySession.program_days as any)?.day_label) ??
          t("workoutFallback"),
        duration: todaySession.duration_min as number | null,
        exerciseCount: Array.isArray(todaySession.exercise_logs)
          ? todaySession.exercise_logs.length
          : 0,
      }
    : null;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{t("greeting", { name })}</h1>
      <p className="mt-1 text-sm text-gray-400">{dateStr}</p>

      {/* ── Nutrition section ── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <UtensilsCrossed size={18} className="text-orange-400" />
          <h2 className="text-lg font-semibold">{t("nutrition")}</h2>
        </div>

        {mealData && mealData.meals.length > 0 ? (
          <>
            {/* Daily macro summary */}
            <Card size="sm" className="mb-3">
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t("dailyPlan")}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-orange-400">
                      {mealData.dailyTotals.cal} kcal
                    </span>
                    <span className="text-blue-400">
                      {mealData.dailyTotals.protein}g P
                    </span>
                    <span className="text-yellow-400">
                      {mealData.dailyTotals.carbs}g UH
                    </span>
                    <span className="text-pink-400">
                      {mealData.dailyTotals.fat}g M
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meal cards */}
            <MealPlanToday meals={mealData.meals} />
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-6 text-center">
              <UtensilsCrossed className="mb-2 size-8 text-gray-600" />
              <p className="text-sm text-gray-400">
                {mealData?.planName
                  ? t("noMealsToday")
                  : t("noPlanYet")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Training section ── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Dumbbell size={18} className="text-green-400" />
          <h2 className="text-lg font-semibold">{t("training")}</h2>
        </div>

        {workout ? (
          <Link href="/app/workout">
            <Card className="cursor-pointer transition-colors hover:border-gray-700">
              <CardContent className="flex items-center gap-3 p-3">
                <CheckCircle2 size={24} className="shrink-0 text-green-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-200">
                    {workout.dayLabel}
                  </p>
                  <p className="text-xs text-gray-500">
                    {workout.duration != null
                      ? `${workout.duration} min`
                      : t("inProgress")}
                    {workout.exerciseCount > 0 &&
                      ` · ${workout.exerciseCount} ${t("setsSuffix")}`}
                  </p>
                </div>
                <span className="text-xs font-medium text-green-500">
                  {t("done")}
                </span>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-6 text-center">
              <Dumbbell className="mb-2 size-8 text-gray-600" />
              <p className="text-sm text-gray-400">{t("noWorkoutToday")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="mt-6 space-y-3">
        <Link href="/app/log" className="block">
          <Button variant="outline" className="h-10 w-full">
            <ClipboardList className="mr-2 size-4" />
            {t("logDay")}
          </Button>
        </Link>

        <Link href="/app/progress" className="block">
          <Button variant="outline" className="h-10 w-full">
            <TrendingUp className="mr-2 size-4" />
            {t("seeProgress")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
