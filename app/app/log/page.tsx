"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SliderScale } from "@/components/ui/athletic/slider-scale";
import {
  saveDailyLog,
  getTodayLog,
  getClientTargets,
  type DailyLogData,
} from "@/actions/daily-log";

type Targets = {
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  target_steps: number | null;
  target_sleep_h: number | null;
};

function formatDateHeader(locale: string): string {
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";
  return new Intl.DateTimeFormat(bcp47, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date())
    .toUpperCase();
}

export default function LogPage() {
  const t = useTranslations("app.log");
  const tErrors = useTranslations("app.log.errors");
  const tCommon = useTranslations("common");
  const tCommonErrors = useTranslations("errors");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<Targets | null>(null);

  const [caloriesKcal, setCaloriesKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fiberG, setFiberG] = useState("");
  const [waterL, setWaterL] = useState("");
  const [steps, setSteps] = useState("");
  const [cardioMin, setCardioMin] = useState("");
  const [sleepH, setSleepH] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [sleepQuality, setSleepQuality] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [notes, setNotes] = useState("");
  const [followedMealPlan, setFollowedMealPlan] = useState<boolean | null>(
    null
  );

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
    async function loadData() {
      const [logResult, targetsResult] = await Promise.all([
        getTodayLog(),
        getClientTargets(),
      ]);
      if (targetsResult.data) setTargets(targetsResult.data);
      if (logResult.data) {
        const d = logResult.data;
        if (d.weight_kg != null) setWeightKg(String(d.weight_kg));
        if (d.calories_kcal != null) setCaloriesKcal(String(d.calories_kcal));
        if (d.protein_g != null) setProteinG(String(d.protein_g));
        if (d.carbs_g != null) setCarbsG(String(d.carbs_g));
        if (d.fat_g != null) setFatG(String(d.fat_g));
        if (d.fiber_g != null) setFiberG(String(d.fiber_g));
        if (d.water_l != null) setWaterL(String(d.water_l));
        if (d.steps != null) setSteps(String(d.steps));
        if (d.cardio_min != null) setCardioMin(String(d.cardio_min));
        if (d.sleep_h != null) setSleepH(String(d.sleep_h));
        if (d.sleep_quality != null) setSleepQuality(d.sleep_quality);
        if (d.energy_level != null) setEnergyLevel(d.energy_level);
        if (d.notes != null) setNotes(d.notes);
        if (d.followed_meal_plan != null)
          setFollowedMealPlan(d.followed_meal_plan);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  function parseNum(val: string): number | null {
    if (val.trim() === "") return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const data: DailyLogData = {
      weight_kg: parseNum(weightKg),
      calories_kcal: parseNum(caloriesKcal),
      protein_g: parseNum(proteinG),
      carbs_g: parseNum(carbsG),
      fat_g: parseNum(fatG),
      fiber_g: parseNum(fiberG),
      water_l: parseNum(waterL),
      steps: parseNum(steps),
      cardio_min: parseNum(cardioMin),
      sleep_h: parseNum(sleepH),
      sleep_quality: sleepQuality,
      energy_level: energyLevel,
      notes: notes.trim() || null,
      followed_meal_plan: followedMealPlan,
    };
    const result = await saveDailyLog(data);
    if (result.error) {
      toast.error(translateError(result.error));
    } else {
      toast.success(t("savedToast"));
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-ink-3" />
      </div>
    );
  }

  const dateHeader = formatDateHeader(locale);

  const statRows = [
    {
      key: "weight",
      label: t("title").replace("Daily log", "Body weight") /* fallback */,
      labelFallback: "Body weight",
      value: weightKg,
      onChange: setWeightKg,
      mode: "decimal" as const,
      unit: "kg",
      color: "var(--lime)",
      target: null,
    },
    {
      key: "calories",
      label: t("calories"),
      value: caloriesKcal,
      onChange: setCaloriesKcal,
      mode: "numeric" as const,
      unit: "kcal",
      color: "var(--carb)",
      target: targets?.target_calories ?? null,
    },
    {
      key: "protein",
      label: t("protein"),
      value: proteinG,
      onChange: setProteinG,
      mode: "numeric" as const,
      unit: "g",
      color: "var(--lime)",
      target: targets?.target_protein_g ?? null,
    },
    {
      key: "carbs",
      label: t("carbs"),
      value: carbsG,
      onChange: setCarbsG,
      mode: "numeric" as const,
      unit: "g",
      color: "var(--carb)",
      target: targets?.target_carbs_g ?? null,
    },
    {
      key: "fat",
      label: t("fat"),
      value: fatG,
      onChange: setFatG,
      mode: "numeric" as const,
      unit: "g",
      color: "var(--fat)",
      target: targets?.target_fat_g ?? null,
    },
    {
      key: "fiber",
      label: t("fiber"),
      value: fiberG,
      onChange: setFiberG,
      mode: "numeric" as const,
      unit: "g",
      color: "var(--ink)",
      target: null,
    },
    {
      key: "water",
      label: t("water"),
      value: waterL,
      onChange: setWaterL,
      mode: "decimal" as const,
      unit: "L",
      color: "var(--info)",
      target: null,
    },
    {
      key: "steps",
      label: t("steps"),
      value: steps,
      onChange: setSteps,
      mode: "numeric" as const,
      unit: "",
      color: "var(--violet)",
      target: targets?.target_steps ?? null,
    },
    {
      key: "cardio",
      label: t("cardio"),
      value: cardioMin,
      onChange: setCardioMin,
      mode: "numeric" as const,
      unit: "min",
      color: "var(--ink)",
      target: null,
    },
    {
      key: "sleep",
      label: t("sleepHours"),
      value: sleepH,
      onChange: setSleepH,
      mode: "decimal" as const,
      unit: "h",
      color: "var(--good)",
      target: targets?.target_sleep_h ?? null,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <div className="px-5 md:px-8 pt-5 md:pt-8 pb-4 border-b border-border">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
          {dateHeader}
        </div>
        <h1 className="mt-1.5 text-[28px] md:text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {t("title")}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 px-5 md:px-8 py-5 md:py-8"
      >
        {/* Numeric stat rows — single column on phone, multi-column on bigger screens */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {statRows.map((row) => {
            const { key, labelFallback: _ignore, ...rest } = row;
            return <StatRow key={key} {...rest} />;
          })}
        </div>

        {/* Sliders — side-by-side from tablet up */}
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <SliderScale
              label={t("sleepQuality")}
              value={sleepQuality}
              onChange={setSleepQuality}
              color="var(--good)"
            />
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <SliderScale
              label={t("energyLevel")}
              value={energyLevel}
              onChange={setEnergyLevel}
              color="var(--lime)"
            />
          </div>
        </div>

        {/* Meal plan followed */}
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
            {t("followedPlanQuestion")}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setFollowedMealPlan(followedMealPlan === true ? null : true)
              }
              className={`flex-1 rounded-md border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                followedMealPlan === true
                  ? "border-good/40 bg-good/10 text-good"
                  : "border-border text-ink-3 hover:border-hairline-2"
              }`}
            >
              {tCommon("yes")}
            </button>
            <button
              type="button"
              onClick={() =>
                setFollowedMealPlan(followedMealPlan === false ? null : false)
              }
              className={`flex-1 rounded-md border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                followedMealPlan === false
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-border text-ink-3 hover:border-hairline-2"
              }`}
            >
              {tCommon("no")}
            </button>
          </div>
        </div>

        {/* Note for coach */}
        <div className="mt-2 rounded-lg border border-border bg-surface-1 p-4">
          <div className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
            {t("notesLabel").toUpperCase()}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            className="w-full rounded-md border border-hairline-2 bg-bg px-3.5 py-3 text-[13px] text-ink-2 leading-relaxed outline-none placeholder:text-ink-3 focus-visible:border-lime focus-visible:ring-2 focus-visible:ring-lime/30"
            style={{ minHeight: 60 }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime px-4 py-4 text-sm font-bold uppercase tracking-[0.02em] text-bg hover:bg-lime-hover active:bg-lime-press disabled:opacity-50 transition-all md:max-w-xs md:self-end"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? tCommon("saving") : `${tCommon("save")} →`}
        </button>
      </form>
    </div>
  );
}

function StatRow({
  label,
  value,
  onChange,
  mode,
  unit,
  color,
  target,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode: "decimal" | "numeric";
  unit: string;
  color: string;
  target: number | null;
}) {
  const id = label.toLowerCase().replace(/[^a-z]/g, "_");
  const hasValue = value.trim() !== "";
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-4 py-3.5 cursor-text focus-within:border-lime/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {target != null && (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
            TARGET {target.toLocaleString()}
            {unit && ` ${unit}`}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 shrink-0">
        <input
          id={id}
          type="text"
          inputMode={mode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="w-20 bg-transparent text-right font-mono text-[22px] font-semibold tabular-nums outline-none placeholder:text-ink-3 placeholder:font-normal"
          style={{ color: hasValue ? color : "var(--ink-3)" }}
        />
        {unit && hasValue && (
          <span className="font-mono text-[11px] text-ink-3">{unit}</span>
        )}
      </div>
    </label>
  );
}
