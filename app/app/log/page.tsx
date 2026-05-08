"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
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

function DiscreteSlider({
  value,
  onChange,
  color = "var(--lime)",
}: {
  value: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div className="mt-2 flex gap-[3px]">
      {Array.from({ length: 10 }, (_, i) => {
        const cellValue = i + 1;
        const isActive = cellValue <= value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(cellValue)}
            aria-label={`${cellValue}`}
            className="flex-1 h-2 rounded-[2px] transition-colors"
            style={{
              backgroundColor: isActive ? color : "var(--hairline-2)",
            }}
          />
        );
      })}
    </div>
  );
}

export default function LogPage() {
  const t = useTranslations("app.log");
  const tErrors = useTranslations("app.log.errors");
  const tCommon = useTranslations("common");
  const tCommonErrors = useTranslations("errors");
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

  return (
    <div className="px-5 pt-5 pb-6">
      <MicroLabel>~/Daily log</MicroLabel>
      <h1 className="mt-1 mb-5 text-[28px] font-semibold leading-tight text-ink tracking-tight">
        {t("title")}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label={t("calories")}
          value={caloriesKcal}
          onChange={setCaloriesKcal}
          inputMode="numeric"
          target={
            targets?.target_calories
              ? `${targets.target_calories} kcal`
              : null
          }
        />
        <Field
          label={t("protein")}
          value={proteinG}
          onChange={setProteinG}
          inputMode="numeric"
          target={
            targets?.target_protein_g ? `${targets.target_protein_g}g` : null
          }
        />
        <Field
          label={t("carbs")}
          value={carbsG}
          onChange={setCarbsG}
          inputMode="numeric"
          target={
            targets?.target_carbs_g ? `${targets.target_carbs_g}g` : null
          }
        />
        <Field
          label={t("fat")}
          value={fatG}
          onChange={setFatG}
          inputMode="numeric"
          target={targets?.target_fat_g ? `${targets.target_fat_g}g` : null}
        />
        <Field
          label={t("fiber")}
          value={fiberG}
          onChange={setFiberG}
          inputMode="numeric"
          target={null}
        />
        <Field
          label={t("water")}
          value={waterL}
          onChange={setWaterL}
          inputMode="decimal"
          target={null}
        />
        <Field
          label={t("steps")}
          value={steps}
          onChange={setSteps}
          inputMode="numeric"
          target={
            targets?.target_steps
              ? targets.target_steps.toLocaleString()
              : null
          }
        />
        <Field
          label={t("cardio")}
          value={cardioMin}
          onChange={setCardioMin}
          inputMode="numeric"
          target={null}
        />
        <Field
          label={t("sleepHours")}
          value={sleepH}
          onChange={setSleepH}
          inputMode="decimal"
          target={
            targets?.target_sleep_h ? `${targets.target_sleep_h}h` : null
          }
        />

        {/* Sleep quality */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <Label className="text-sm text-ink-2">{t("sleepQuality")}</Label>
            <span className="font-mono text-sm text-ink tabular-nums">
              {sleepQuality}
              <span className="text-ink-3">/10</span>
            </span>
          </div>
          <DiscreteSlider value={sleepQuality} onChange={setSleepQuality} />
        </div>

        {/* Energy */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <Label className="text-sm text-ink-2">{t("energyLevel")}</Label>
            <span className="font-mono text-sm text-ink tabular-nums">
              {energyLevel}
              <span className="text-ink-3">/10</span>
            </span>
          </div>
          <DiscreteSlider value={energyLevel} onChange={setEnergyLevel} />
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Label
            htmlFor="notes"
            className="text-sm text-ink-2 mb-2 inline-block"
          >
            {t("notesLabel")}
          </Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("notesPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink resize-none outline-none placeholder:text-ink-3 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>

        {/* Meal plan followed */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Label className="text-sm text-ink-2">
            {t("followedPlanQuestion")}
          </Label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() =>
                setFollowedMealPlan(followedMealPlan === true ? null : true)
              }
              className={`flex-1 rounded-lg border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
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
              className={`flex-1 rounded-lg border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                followedMealPlan === false
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-border text-ink-3 hover:border-hairline-2"
              }`}
            >
              {tCommon("no")}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {saving ? tCommon("saving") : tCommon("save")}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  target,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode: "decimal" | "numeric";
  target: string | null;
}) {
  const id = label.toLowerCase().replace(/[^a-z]/g, "_");
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between mb-1.5">
        <Label htmlFor={id} className="text-sm text-ink-2">
          {label}
        </Label>
        {target && (
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
            target {target}
          </span>
        )}
      </div>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-base"
      />
    </div>
  );
}
