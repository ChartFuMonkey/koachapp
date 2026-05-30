"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Chip } from "@/components/ui/athletic/chip";
import { SliderScale } from "@/components/ui/athletic/slider-scale";
import { SegmentedControl } from "@/components/ui/athletic/segmented-control";
import {
  getThisWeekCheckin,
  submitCheckin,
  type CheckinData,
} from "@/actions/checkin";

/* eslint-disable @typescript-eslint/no-explicit-any */
type CheckinRow = Record<string, any>;

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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
  const isoWeek = getISOWeek(new Date());

  // Submitted view
  if (submitted) {
    return (
      <div className="px-5 pt-5 pb-6">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
          WEEK {isoWeek} · SUNDAY REVIEW
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {t("title")}
          </h1>
          <Chip variant="good" className="gap-1 mt-1">
            <CheckCircle size={10} />
            {t("badgeSubmitted")}
          </Chip>
        </div>
        {submitted.checkin_date && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
            {new Date(
              (submitted.checkin_date as string) + "T00:00"
            ).toLocaleDateString(bcp47)}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label={t("energy")} value={submitted.energy_level} max={10} />
          <MetricCard label={t("stress")} value={submitted.stress_level} max={10} />
          <MetricCard label={t("motivation")} value={submitted.motivation} max={10} />
          <MetricCard label={t("sleepQuality")} value={submitted.sleep_quality} max={10} />
          <MetricCard label={t("appetite")} value={submitted.appetite} max={10} />
          <MetricCard label={t("dietPct")} value={submitted.adherence_diet_pct} unit="%" />
          <MetricCard
            label={t("trainingPlan")}
            value={submitted.adherence_training ? tCommon("yes") : tCommon("no")}
          />
          <MetricCard label={t("overallRating")} value={submitted.overall_rating} max={10} />
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
    ).length + 1;
  const progressPct = Math.min(100, (filledSections / sections) * 100);

  const adherenceOptions = [
    { value: 0, label: "<60%" },
    { value: 60, label: "60%" },
    { value: 70, label: "70%" },
    { value: 80, label: "80%" },
    { value: 90, label: "90%" },
    { value: 100, label: "100%" },
  ];

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
          WEEK {isoWeek} · SUNDAY REVIEW
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {t("title")}
        </h1>
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full bg-lime transition-[width] duration-400"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
          {filledSections} / {sections} SECTIONS
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 px-5 py-5">
        {/* All sliders consolidated into ONE card per BClientCheckin */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="mb-3.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
            HOW DID YOU FEEL THIS WEEK?
          </div>
          <div className="flex flex-col gap-4">
            <SliderScale
              label={t("energy")}
              value={energyLevel}
              onChange={setEnergyLevel}
              color="var(--lime)"
            />
            <SliderScale
              label={t("stress")}
              value={stressLevel}
              onChange={setStressLevel}
              color="var(--warn)"
            />
            <SliderScale
              label={t("motivation")}
              value={motivation}
              onChange={setMotivation}
              color="var(--violet)"
            />
            <SliderScale
              label={t("sleepQuality")}
              value={sleepQuality}
              onChange={setSleepQuality}
              color="var(--good)"
            />
            <SliderScale
              label={t("appetite")}
              value={appetite}
              onChange={setAppetite}
              color="var(--carb)"
            />
          </div>
        </div>

        {/* Diet adherence */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
            DIET ADHERENCE
          </div>
          <div className="mb-3 flex items-baseline gap-1">
            <span className="font-mono text-[36px] font-bold leading-none tracking-[-0.02em] text-ink tabular-nums">
              {adherenceDietPct ?? "—"}
            </span>
            <span className="font-mono text-sm text-ink-3">%</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {adherenceOptions.map((p) => {
              const active = adherenceDietPct === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setAdherenceDietPct(p.value)}
                  className={`rounded-md py-2 font-mono text-[11px] font-semibold transition-colors ${
                    active
                      ? "bg-lime text-bg"
                      : "bg-surface-2 text-ink-2 hover:bg-surface-3"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Training adherence */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={adherenceTraining}
              onChange={(e) => setAdherenceTraining(e.target.checked)}
              className="size-4 rounded border-border bg-surface-2 accent-lime"
            />
            {t("adherenceTrainingLabel")}
          </label>
        </div>

        <TextareaCard
          label={t("whatWentWellPrompt").toUpperCase()}
          value={whatWentWell}
          onChange={setWhatWentWell}
          placeholder={t("textareaPlaceholder")}
          minHeight={80}
        />
        <TextareaCard
          label={t("challengesPrompt").toUpperCase()}
          value={challenges}
          onChange={setChallenges}
          placeholder={t("textareaPlaceholder")}
          minHeight={60}
        />
        <TextareaCard
          label={t("goalsNextWeek").toUpperCase()}
          value={goalsNextWeek}
          onChange={setGoalsNextWeek}
          placeholder={t("textareaPlaceholder")}
          minHeight={60}
        />
        <TextareaCard
          label={t("questionsForCoach").toUpperCase()}
          value={questionsForCoach}
          onChange={setQuestionsForCoach}
          placeholder={t("textareaPlaceholder")}
          minHeight={60}
        />

        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
            OVERALL WEEKLY RATING
          </div>
          <SliderScale
            label={t("overallRating")}
            value={overallRating}
            onChange={setOverallRating}
            color="var(--lime)"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime px-4 py-4 text-sm font-bold text-bg hover:bg-lime-hover active:bg-lime-press disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? t("sendLoading") : `${t("submit")} →`}
        </button>
      </form>
    </div>
  );
}

function TextareaCard({
  label,
  value,
  onChange,
  placeholder,
  minHeight = 60,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  minHeight?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full rounded-md border border-hairline-2 bg-bg px-3.5 py-3 text-[13px] text-ink-2 leading-relaxed outline-none placeholder:text-ink-3 focus-visible:border-lime focus-visible:ring-2 focus-visible:ring-lime/30"
      />
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
    <div className="rounded-lg border border-border bg-surface-1 p-3">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <p className="mt-1.5 font-mono text-[20px] font-semibold leading-none text-ink tabular-nums">
        {value != null ? value : "—"}
        {max ? <span className="text-xs text-ink-3">/{max}</span> : null}
        {unit ? <span className="ml-0.5 text-xs text-ink-3">{unit}</span> : null}
      </p>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{text}</p>
    </div>
  );
}
