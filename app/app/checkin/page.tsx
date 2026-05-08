"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { ProgressBar } from "@/components/ui/athletic/progress-bar";
import {
  getThisWeekCheckin,
  submitCheckin,
  type CheckinData,
} from "@/actions/checkin";

/* eslint-disable @typescript-eslint/no-explicit-any */
type CheckinRow = Record<string, any>;

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

function SliderRow({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm text-ink-2">{label}</Label>
        <span className="font-mono text-sm text-ink tabular-nums">
          {value}
          <span className="text-ink-3">/10</span>
        </span>
      </div>
      <DiscreteSlider value={value} onChange={onChange} color={color} />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Label className="text-sm text-ink-2 mb-2 inline-block">{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink resize-none outline-none placeholder:text-ink-3 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      />
    </div>
  );
}

export default function CheckinPage() {
  const t = useTranslations("app.checkin");
  const tErrors = useTranslations("app.checkin.errors");
  const tCommon = useTranslations("common");
  const tCommonErrors = useTranslations("errors");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<CheckinRow | null>(null);

  const [energyLevel, setEnergyLevel] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [motivation, setMotivation] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [appetite, setAppetite] = useState(5);
  const [adherenceDietPct, setAdherenceDietPct] = useState<number | null>(null);
  const [adherenceTraining, setAdherenceTraining] = useState(false);
  const [whatWentWell, setWhatWentWell] = useState("");
  const [challenges, setChallenges] = useState("");
  const [goalsNextWeek, setGoalsNextWeek] = useState("");
  const [questionsForCoach, setQuestionsForCoach] = useState("");
  const [overallRating, setOverallRating] = useState(5);

  function translateError(code: string): string {
    if (code === "unauthenticated") return tCommonErrors("unauthenticated");
    try {
      return tErrors(code as any);
    } catch {
      return tCommonErrors("genericLoad");
    }
  }

  useEffect(() => {
    async function load() {
      const result = await getThisWeekCheckin();
      if (result.data) setSubmitted(result.data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const data: CheckinData = {
      energy_level: energyLevel,
      stress_level: stressLevel,
      motivation,
      sleep_quality: sleepQuality,
      appetite,
      adherence_diet_pct: adherenceDietPct,
      adherence_training: adherenceTraining,
      what_went_well: whatWentWell.trim() || null,
      challenges: challenges.trim() || null,
      goals_next_week: goalsNextWeek.trim() || null,
      questions_for_coach: questionsForCoach.trim() || null,
      overall_rating: overallRating,
    };
    const result = await submitCheckin(data);
    if (result.error) {
      toast.error(translateError(result.error));
    } else {
      toast.success(t("submittedToast"));
      setSubmitted({
        ...data,
        checkin_date: new Date().toISOString().split("T")[0],
      });
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

  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  // Submitted view
  if (submitted) {
    return (
      <div className="px-5 pt-5 pb-6">
        <MicroLabel>~/Weekly check-in</MicroLabel>
        <div className="mt-1 flex items-center gap-3 mb-4">
          <h1 className="text-[28px] font-semibold leading-tight text-ink tracking-tight">
            {t("title")}
          </h1>
          <Chip variant="good" className="gap-1 mt-1">
            <CheckCircle size={10} />
            {t("badgeSubmitted")}
          </Chip>
        </div>
        {submitted.checkin_date && (
          <p className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.06em] mb-4">
            {new Date(
              (submitted.checkin_date as string) + "T00:00"
            ).toLocaleDateString(bcp47)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label={t("energy")} value={submitted.energy_level} max={10} />
          <MetricCard label={t("stress")} value={submitted.stress_level} max={10} />
          <MetricCard
            label={t("motivation")}
            value={submitted.motivation}
            max={10}
          />
          <MetricCard
            label={t("sleepQuality")}
            value={submitted.sleep_quality}
            max={10}
          />
          <MetricCard label={t("appetite")} value={submitted.appetite} max={10} />
          <MetricCard
            label={t("dietPct")}
            value={submitted.adherence_diet_pct}
            unit="%"
          />
          <MetricCard
            label={t("trainingPlan")}
            value={submitted.adherence_training ? tCommon("yes") : tCommon("no")}
          />
          <MetricCard
            label={t("overallRating")}
            value={submitted.overall_rating}
            max={10}
          />
        </div>
        <div className="mt-5 space-y-3">
          {submitted.what_went_well && (
            <TextBlock label={t("whatWentWell")} text={submitted.what_went_well as string} />
          )}
          {submitted.challenges && (
            <TextBlock label={t("challenges")} text={submitted.challenges as string} />
          )}
          {submitted.goals_next_week && (
            <TextBlock label={t("goalsNextWeek")} text={submitted.goals_next_week as string} />
          )}
          {submitted.questions_for_coach && (
            <TextBlock
              label={t("questionsForCoach")}
              text={submitted.questions_for_coach as string}
            />
          )}
        </div>
      </div>
    );
  }

  // Form view
  const sections = 5;
  const filledSections =
    [whatWentWell, challenges, goalsNextWeek, questionsForCoach].filter(
      (s) => s.trim().length > 0
    ).length + 1; // ratings always count as section 1

  return (
    <div className="px-5 pt-5 pb-6">
      <MicroLabel>~/Weekly check-in</MicroLabel>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight text-ink tracking-tight">
        {t("title")}
      </h1>

      {/* Section progress */}
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar
          value={filledSections}
          max={sections}
          size="thin"
          className="flex-1"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 shrink-0">
          {filledSections} / {sections} SECTIONS
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <SliderRow label={t("energyLevel")} value={energyLevel} onChange={setEnergyLevel} />
        <SliderRow label={t("stressLevel")} value={stressLevel} onChange={setStressLevel} color="var(--warn)" />
        <SliderRow label={t("motivation")} value={motivation} onChange={setMotivation} />
        <SliderRow
          label={t("sleepQuality")}
          value={sleepQuality}
          onChange={setSleepQuality}
          color="var(--good)"
        />
        <SliderRow label={t("appetite")} value={appetite} onChange={setAppetite} />

        {/* Diet adherence */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Label className="text-sm text-ink-2 mb-2 inline-block">
            {t("adherenceDietLabel")}
          </Label>
          <div className="grid grid-cols-6 gap-1.5">
            {[0, 20, 40, 60, 80, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAdherenceDietPct(p)}
                className={`rounded-md py-2 font-mono text-[12px] transition-colors ${
                  adherenceDietPct === p
                    ? "bg-primary text-bg font-semibold"
                    : "bg-surface-2 text-ink-2 hover:bg-surface-3"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={adherenceDietPct ?? ""}
            onChange={(e) =>
              setAdherenceDietPct(
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            placeholder={t("adherenceDietPlaceholder")}
            className="mt-2"
          />
        </div>

        {/* Training adherence */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Label
            htmlFor="training"
            className="flex cursor-pointer items-center gap-3 text-sm text-ink-2"
          >
            <input
              id="training"
              type="checkbox"
              checked={adherenceTraining}
              onChange={(e) => setAdherenceTraining(e.target.checked)}
              className="size-4 rounded border-border bg-surface accent-primary"
            />
            {t("adherenceTrainingLabel")}
          </Label>
        </div>

        <TextareaField
          label={t("whatWentWellPrompt")}
          value={whatWentWell}
          onChange={setWhatWentWell}
          placeholder={t("textareaPlaceholder")}
        />
        <TextareaField
          label={t("challengesPrompt")}
          value={challenges}
          onChange={setChallenges}
          placeholder={t("textareaPlaceholder")}
        />
        <TextareaField
          label={t("goalsNextWeek")}
          value={goalsNextWeek}
          onChange={setGoalsNextWeek}
          placeholder={t("textareaPlaceholder")}
        />
        <TextareaField
          label={t("questionsForCoach")}
          value={questionsForCoach}
          onChange={setQuestionsForCoach}
          placeholder={t("textareaPlaceholder")}
        />

        <SliderRow
          label={t("overallRatingPrompt")}
          value={overallRating}
          onChange={setOverallRating}
        />

        <Button type="submit" size="lg" disabled={saving} className="w-full mt-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? t("sendLoading") : t("submit")}
        </Button>
      </form>
    </div>
  );
}

function MetricCard({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: any;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <p className="mt-1.5 font-mono text-[20px] font-semibold text-ink tabular-nums leading-none">
        {value != null ? value : "—"}
        {max ? <span className="text-ink-3 text-xs">/{max}</span> : null}
        {unit ? <span className="text-ink-3 text-xs ml-0.5">{unit}</span> : null}
      </p>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">{text}</p>
    </div>
  );
}
