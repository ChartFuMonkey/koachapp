"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function LogPage() {
  const t = useTranslations("app.log");
  const tErrors = useTranslations("app.log.errors");
  const tCommon = useTranslations("common");
  const tCommonErrors = useTranslations("errors");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<Targets | null>(null);

  // Form fields
  const [caloriesKcal, setCaloriesKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fiberG, setFiberG] = useState("");
  const [waterL, setWaterL] = useState("");
  const [steps, setSteps] = useState("");
  const [cardioMin, setCardioMin] = useState("");
  const [sleepH, setSleepH] = useState("");
  const [sleepQuality, setSleepQuality] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [notes, setNotes] = useState("");
  const [followedMealPlan, setFollowedMealPlan] = useState<boolean | null>(null);

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

      if (targetsResult.data) {
        setTargets(targetsResult.data);
      }

      if (logResult.data) {
        const d = logResult.data;
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
        if (d.followed_meal_plan != null) setFollowedMealPlan(d.followed_meal_plan);
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
      weight_kg: null,
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
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label={t("calories")}
          value={caloriesKcal}
          onChange={setCaloriesKcal}
          inputMode="numeric"
          target={
            targets?.target_calories
              ? t("targetWithUnit", { v: targets.target_calories, unit: "kcal" })
              : null
          }
        />

        <Field
          label={t("protein")}
          value={proteinG}
          onChange={setProteinG}
          inputMode="numeric"
          target={
            targets?.target_protein_g
              ? t("targetWithUnit", { v: targets.target_protein_g, unit: "g" })
              : null
          }
        />

        <Field
          label={t("carbs")}
          value={carbsG}
          onChange={setCarbsG}
          inputMode="numeric"
          target={
            targets?.target_carbs_g
              ? t("targetWithUnit", { v: targets.target_carbs_g, unit: "g" })
              : null
          }
        />

        <Field
          label={t("fat")}
          value={fatG}
          onChange={setFatG}
          inputMode="numeric"
          target={
            targets?.target_fat_g
              ? t("targetWithUnit", { v: targets.target_fat_g, unit: "g" })
              : null
          }
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
              ? t("target", { v: targets.target_steps.toLocaleString() })
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
            targets?.target_sleep_h
              ? t("targetWithUnit", { v: targets.target_sleep_h, unit: "h" })
              : null
          }
        />

        {/* Sleep quality slider */}
        <div>
          <Label>
            {t("sleepQuality")}:{" "}
            <span className="text-blue-400">{sleepQuality}</span>/10
          </Label>
          <input
            type="range"
            min={1}
            max={10}
            value={sleepQuality}
            onChange={(e) => setSleepQuality(Number(e.target.value))}
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-blue-500"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Energy level slider */}
        <div>
          <Label>
            {t("energyLevel")}:{" "}
            <span className="text-blue-400">{energyLevel}</span>/10
          </Label>
          <input
            type="range"
            min={1}
            max={10}
            value={energyLevel}
            onChange={(e) => setEnergyLevel(Number(e.target.value))}
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-blue-500"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Note */}
        <div>
          <Label htmlFor="notes">{t("notesLabel")}</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("notesPlaceholder")}
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        {/* Meal plan followed */}
        <div>
          <Label>{t("followedPlanQuestion")}</Label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() =>
                setFollowedMealPlan(followedMealPlan === true ? null : true)
              }
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                followedMealPlan === true
                  ? "border-green-500 bg-green-500/20 text-green-400"
                  : "border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              {tCommon("yes")}
            </button>
            <button
              type="button"
              onClick={() =>
                setFollowedMealPlan(followedMealPlan === false ? null : false)
              }
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                followedMealPlan === false
                  ? "border-red-500 bg-red-500/20 text-red-400"
                  : "border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              {tCommon("no")}
            </button>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={saving}
          className="h-12 w-full text-base font-semibold"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            tCommon("save")
          )}
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
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 text-base"
      />
      {target && (
        <p className="mt-1 text-xs text-gray-500">{target}</p>
      )}
    </div>
  );
}
