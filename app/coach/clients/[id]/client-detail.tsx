"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { updateClientNotes, updateClientTargets } from "@/actions/coach";
import { sendReminder } from "@/actions/send-reminder";
import {
  Save,
  Pencil,
  X,
  Dumbbell,
  Layers,
  Bell,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Avatar } from "@/components/ui/athletic/avatar";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Num } from "@/components/ui/athletic/num";
import { RingChart } from "@/components/ui/athletic/ring-chart";
import { StatusDot } from "@/components/ui/athletic/status-dot";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

type Props = {
  client: Row;
  profile: Row;
  phase: Row | null;
  logs: Row[];
  checkins: Row[];
  measurements: Row[];
  photos: Row[];
};

type MacroSpec = {
  label: string;
  current: number | null;
  target: number | null;
  unit: string;
  color: string;
  decimals?: number;
};

function pct(current: number | null, target: number | null): number {
  if (current == null || target == null || target === 0) return 0;
  return Math.round((current / target) * 100);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ClientDetail({
  client,
  profile,
  phase,
  logs,
  checkins,
  measurements,
  photos,
}: Props) {
  const t = useTranslations("coach.clients.detail");
  const locale = useLocale();
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  const [editingTargets, setEditingTargets] = useState(false);
  const [notes, setNotes] = useState((client.notes as string) || "");
  const [injuries, setInjuries] = useState((client.injuries as string) || "");
  const [saving, setSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const [targets, setTargets] = useState({
    target_calories: client.target_calories as number | null,
    target_protein_g: client.target_protein_g as number | null,
    target_carbs_g: client.target_carbs_g as number | null,
    target_fat_g: client.target_fat_g as number | null,
    target_steps: client.target_steps as number | null,
    target_sleep_h: client.target_sleep_h as number | null,
  });

  useEffect(() => {
    if (!notesSaved) return;
    const timer = setTimeout(() => setNotesSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [notesSaved]);

  // Latest log = first item (logs come ordered desc)
  const latestLog = logs[0] ?? {};

  // Weight series (chronological)
  const weightData = useMemo(() => {
    return logs
      .filter((l) => l.weight_kg != null)
      .slice()
      .reverse()
      .map((l) => ({
        date: l.log_date as string,
        weight: Number(l.weight_kg),
      }));
  }, [logs]);

  // 14-day adherence histogram from daily_logs presence
  const adherence14 = useMemo(() => {
    const days: { date: string; logged: boolean }[] = [];
    const logsByDate = new Map<string, Row>();
    logs.forEach((l) => logsByDate.set(l.log_date as string, l));
    for (let i = 13; i >= 0; i--) {
      const date = daysAgo(i);
      days.push({ date, logged: logsByDate.has(date) });
    }
    return days;
  }, [logs]);
  const adherenceAvg = Math.round(
    (adherence14.filter((d) => d.logged).length / 14) * 100
  );

  // Streak: consecutive logged days walking back from today
  const streak = useMemo(() => {
    const dates = new Set(logs.map((l) => l.log_date as string));
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const date = daysAgo(i);
      if (dates.has(date)) {
        count++;
      } else if (i > 0) {
        break;
      } else {
        break;
      }
    }
    return count;
  }, [logs]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function handleSendReminder() {
    setSendingReminder(true);
    const result = await sendReminder(client.id as string);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(t("reminderSentToast", { count: result.sent }));
    }
    setSendingReminder(false);
  }

  async function handleSaveNotes() {
    setSaving(true);
    await updateClientNotes(client.id as string, notes, injuries);
    setSaving(false);
    setNotesSaved(true);
  }

  async function handleSaveTargets() {
    setSaving(true);
    await updateClientTargets(client.id as string, targets);
    setSaving(false);
    setEditingTargets(false);
  }

  function targetField(
    label: string,
    key: keyof typeof targets,
    unit: string
  ) {
    return (
      <div>
        <Label className="mb-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          {label} ({unit})
        </Label>
        <Input
          type="number"
          value={targets[key] ?? ""}
          onChange={(e) =>
            setTargets((t) => ({
              ...t,
              [key]: e.target.value ? parseFloat(e.target.value) : null,
            }))
          }
        />
      </div>
    );
  }

  const macros: MacroSpec[] = [
    {
      label: t("targetCalories"),
      current: latestLog.calories_kcal ?? null,
      target: targets.target_calories,
      unit: "kcal",
      color: "var(--lime)",
    },
    {
      label: t("targetProtein"),
      current: latestLog.protein_g ?? null,
      target: targets.target_protein_g,
      unit: "g",
      color: "var(--info)",
    },
    {
      label: t("targetCarbs"),
      current: latestLog.carbs_g ?? null,
      target: targets.target_carbs_g,
      unit: "g",
      color: "var(--carb)",
    },
    {
      label: t("targetFat"),
      current: latestLog.fat_g ?? null,
      target: targets.target_fat_g,
      unit: "g",
      color: "var(--fat)",
    },
    {
      label: t("targetSteps"),
      current: latestLog.steps ?? null,
      target: targets.target_steps,
      unit: "",
      color: "var(--violet)",
    },
    {
      label: t("targetSleep"),
      current: latestLog.sleep_h ?? null,
      target: targets.target_sleep_h,
      unit: "h",
      color: "var(--good)",
      decimals: 1,
    },
  ];

  const fullName = (profile.full_name as string) || t("unknownClient");
  const isActive = client.is_active as boolean;

  return (
    <div>
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-start gap-4">
        <Avatar name={fullName} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] sm:text-[32px] font-semibold leading-tight tracking-tight text-ink truncate">
              {fullName}
            </h1>
            {isActive ? (
              <Chip variant="good" size="lg" className="gap-1.5">
                <StatusDot tone="good" size="sm" />
                ACTIVE
              </Chip>
            ) : (
              <Chip variant="neutral" size="lg">
                {t("inactive").toUpperCase()}
              </Chip>
            )}
            {phase && (
              <Chip variant="ghost" size="lg">
                {(phase.name as string).toUpperCase()}
              </Chip>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-3">
            {client.start_date != null && (
              <span>
                {t("startDate")}{" "}
                {new Date(
                  (client.start_date as string) + "T00:00"
                ).toLocaleDateString(bcp47)}
              </span>
            )}
            <span>
              STREAK <span className="text-ink">{streak}d</span>
            </span>
            <span>
              ADHERENCE 14D{" "}
              <span className="text-ink">{adherenceAvg}%</span>
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendReminder}
          disabled={sendingReminder}
        >
          <Bell size={14} />
          {sendingReminder ? t("sendReminderLoading") : t("sendReminder")}
        </Button>
      </div>

      {/* Macro ring grid */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <MicroLabel>~/Latest snapshot</MicroLabel>
          {!editingTargets ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingTargets(true)}
            >
              <Pencil size={12} /> {t("editTargets")}
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Button onClick={handleSaveTargets} disabled={saving} size="sm">
                <Save size={12} /> {t("saveTargets")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingTargets(false)}
              >
                <X size={12} /> {t("cancelEdit")}
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {macros.map((m) => {
            const p = pct(m.current, m.target);
            return (
              <div
                key={m.label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <MicroLabel>{m.label.toUpperCase()}</MicroLabel>
                  <RingChart
                    percent={Math.min(p, 100)}
                    color={m.color}
                    size={28}
                    stroke={2.5}
                  />
                </div>
                <div className="mt-3 font-mono text-[22px] font-semibold tracking-tight text-ink leading-none tabular-nums">
                  <Num value={m.current} decimals={m.decimals} />
                </div>
                <div className="mt-1 font-mono text-[10px] text-ink-3 leading-none">
                  / <Num value={m.target} decimals={m.decimals} /> · {p}%
                </div>
              </div>
            );
          })}
        </div>
        {editingTargets && (
          <div className="mt-3 rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {targetField(t("targetCalories"), "target_calories", "kcal")}
              {targetField(t("targetProtein"), "target_protein_g", "g")}
              {targetField(t("targetCarbs"), "target_carbs_g", "g")}
              {targetField(t("targetFat"), "target_fat_g", "g")}
              {targetField(t("targetSteps"), "target_steps", "")}
              {targetField(t("targetSleep"), "target_sleep_h", "h")}
            </div>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Weight chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <MicroLabel>{t("weightTrend").toUpperCase()} · 30D</MicroLabel>
            {weightData.length > 0 && (
              <span className="font-mono text-[18px] font-semibold tracking-tight text-ink tabular-nums">
                <Num
                  value={weightData[weightData.length - 1]?.weight}
                  decimals={1}
                />
                <span className="text-ink-3 text-xs ml-1">kg</span>
              </span>
            )}
          </div>
          {weightData.length >= 2 ? (
            <div className="mt-3 h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={weightData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="weightGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--lime)"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--lime)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <YAxis
                    domain={["dataMin - 0.5", "dataMax + 0.5"]}
                    hide
                  />
                  <Tooltip
                    cursor={{
                      stroke: "var(--hairline-2)",
                      strokeWidth: 1,
                      strokeDasharray: "3 3",
                    }}
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--hairline-2)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "var(--ink)",
                      padding: "6px 10px",
                      fontFamily: "var(--font-geist-mono)",
                    }}
                    labelStyle={{ color: "var(--ink-3)" }}
                    formatter={(v) => [`${v} kg`, t("weightLabel")]}
                    labelFormatter={(l) =>
                      new Date(String(l) + "T00:00").toLocaleDateString(bcp47)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--lime)"
                    strokeWidth={2}
                    fill="url(#weightGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "var(--lime)",
                      stroke: "var(--bg)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-6 text-center font-mono text-[11px] text-ink-3">
              {t("noLogs")}
            </p>
          )}
        </div>

        {/* Adherence histogram */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <MicroLabel>ADHERENCE · 14D</MicroLabel>
            <span className="font-mono text-[18px] font-semibold tracking-tight text-ink tabular-nums">
              {adherenceAvg}
              <span className="text-ink-3 text-xs ml-0.5">%</span>
            </span>
          </div>
          <div className="mt-4 flex h-[100px] items-end gap-1">
            {adherence14.map((d, i) => {
              const isToday = i === 13;
              return (
                <div
                  key={d.date}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: d.logged ? "100%" : "8%",
                    backgroundColor: d.logged
                      ? "var(--lime)"
                      : "var(--hairline-2)",
                    opacity: isToday ? 1 : d.logged ? 0.7 : 1,
                  }}
                  title={d.date}
                />
              );
            })}
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            <span>14D AGO</span>
            <span>TODAY</span>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/coach/clients/${client.id}/program`}>
          <Button variant="outline" size="sm">
            <Dumbbell size={14} /> {t("programBuilder")}
          </Button>
        </Link>
        <Link href={`/coach/clients/${client.id}/phases`}>
          <Button variant="outline" size="sm">
            <Layers size={14} /> {t("phaseManager")}
          </Button>
        </Link>
        <Link href={`/coach/clients/${client.id}/meal-plan`}>
          <Button variant="outline" size="sm">
            <UtensilsCrossed size={14} /> {t("mealPlan")}
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logs">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="logs">{t("tabLogs")}</TabsTrigger>
          <TabsTrigger value="checkins">{t("tabCheckins")}</TabsTrigger>
          <TabsTrigger value="measurements">{t("tabMeasurements")}</TabsTrigger>
          <TabsTrigger value="notes">{t("tabNotes")}</TabsTrigger>
          <TabsTrigger value="photos">{t("tabPhotos")}</TabsTrigger>
        </TabsList>

        {/* LOGS */}
        <TabsContent value="logs">
          {logs.length === 0 ? (
            <p className="py-10 text-center font-mono text-[11px] text-ink-3 uppercase tracking-[0.08em]">
              {t("noLogs")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.6fr] items-center border-b border-border px-5 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                <span>{t("colDate")}</span>
                <span className="text-right">{t("colWeight")}</span>
                <span className="text-right">{t("colKcal")}</span>
                <span className="text-right">{t("colProtein")}</span>
                <span className="text-right">{t("colSteps")}</span>
                <span className="text-right">{t("colSleep")}</span>
              </div>
              {logs.map((l, idx) => (
                <div
                  key={l.id as string}
                  className={`grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.6fr] items-center px-5 py-2.5 text-sm hover:bg-surface-2/40 transition-colors ${
                    idx < logs.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-ink">
                    {new Date(
                      (l.log_date as string) + "T00:00"
                    ).toLocaleDateString(bcp47)}
                  </span>
                  <span className="text-right font-mono text-ink-2 tabular-nums">
                    <Num value={l.weight_kg} decimals={1} />
                  </span>
                  <span className="text-right font-mono text-ink-2 tabular-nums">
                    <Num value={l.calories_kcal} />
                  </span>
                  <span className="text-right font-mono text-ink-2 tabular-nums">
                    <Num value={l.protein_g} unit="g" />
                  </span>
                  <span className="text-right font-mono text-ink-2 tabular-nums">
                    <Num value={l.steps} />
                  </span>
                  <span className="text-right font-mono text-ink-2 tabular-nums">
                    <Num value={l.sleep_h} decimals={1} unit="h" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CHECKINS */}
        <TabsContent value="checkins">
          {checkins.length === 0 ? (
            <p className="py-10 text-center font-mono text-[11px] text-ink-3 uppercase tracking-[0.08em]">
              {t("noCheckins")}
            </p>
          ) : (
            <Accordion>
              {checkins.map((ci) => (
                <AccordionItem key={ci.id as string} value={ci.id as string}>
                  <AccordionTrigger className="px-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[12px] text-ink">
                        {new Date(
                          (ci.checkin_date as string) + "T00:00"
                        ).toLocaleDateString(bcp47)}
                      </span>
                      {ci.overall_rating != null && (
                        <Chip variant="ghost">
                          {ci.overall_rating as number}/10
                        </Chip>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 font-mono text-[12px]">
                      {ci.energy_level != null && (
                        <div>
                          <span className="text-ink-3">{t("ciEnergy")}: </span>
                          <span className="text-ink">
                            {ci.energy_level as number}/10
                          </span>
                        </div>
                      )}
                      {ci.stress_level != null && (
                        <div>
                          <span className="text-ink-3">{t("ciStress")}: </span>
                          <span className="text-ink">
                            {ci.stress_level as number}/10
                          </span>
                        </div>
                      )}
                      {ci.motivation != null && (
                        <div>
                          <span className="text-ink-3">
                            {t("ciMotivation")}:{" "}
                          </span>
                          <span className="text-ink">
                            {ci.motivation as number}/10
                          </span>
                        </div>
                      )}
                      {ci.sleep_quality != null && (
                        <div>
                          <span className="text-ink-3">
                            {t("ciSleepQuality")}:{" "}
                          </span>
                          <span className="text-ink">
                            {ci.sleep_quality as number}/10
                          </span>
                        </div>
                      )}
                      {ci.appetite != null && (
                        <div>
                          <span className="text-ink-3">{t("ciAppetite")}: </span>
                          <span className="text-ink">
                            {ci.appetite as number}/10
                          </span>
                        </div>
                      )}
                      {ci.adherence_diet_pct != null && (
                        <div>
                          <span className="text-ink-3">{t("ciDiet")}: </span>
                          <span className="text-ink">
                            {ci.adherence_diet_pct as number}%
                          </span>
                        </div>
                      )}
                    </div>
                    {[
                      ["pain_discomfort", t("ciPain")],
                      ["what_went_well", t("ciWhatWentWell")],
                      ["challenges", t("ciChallenges")],
                      ["goals_next_week", t("ciGoalsNextWeek")],
                      ["questions_for_coach", t("ciQuestionsForCoach")],
                    ].map(([key, label]) =>
                      ci[key] ? (
                        <div key={key} className="mt-3">
                          <MicroLabel>{label}</MicroLabel>
                          <p className="mt-1 text-sm text-ink-2 leading-relaxed">
                            {ci[key] as string}
                          </p>
                        </div>
                      ) : null
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        {/* MEASUREMENTS */}
        <TabsContent value="measurements">
          {measurements.length === 0 ? (
            <p className="py-10 text-center font-mono text-[11px] text-ink-3 uppercase tracking-[0.08em]">
              {t("noMeasurements")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    {[
                      "colDate",
                      "colNeck",
                      "colChest",
                      "colWaist",
                      "colHips",
                      "colArmL",
                      "colArmR",
                      "colThighL",
                      "colThighR",
                      "colBfPct",
                    ].map((k, i) => (
                      <th
                        key={k}
                        className={`px-3 py-3 ${i === 0 ? "text-left" : "text-right"} font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3`}
                      >
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {t(k as any)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m, idx) => (
                    <tr
                      key={m.id as string}
                      className={
                        idx < measurements.length - 1
                          ? "border-b border-border"
                          : ""
                      }
                    >
                      <td className="px-3 py-2.5 text-ink">
                        {new Date(
                          (m.meas_date as string) + "T00:00"
                        ).toLocaleDateString(bcp47)}
                      </td>
                      {[
                        "neck_cm",
                        "chest_cm",
                        "waist_cm",
                        "hips_cm",
                        "arm_l_cm",
                        "arm_r_cm",
                        "thigh_l_cm",
                        "thigh_r_cm",
                      ].map((k) => (
                        <td
                          key={k}
                          className="px-3 py-2.5 text-right font-mono text-ink-2 tabular-nums"
                        >
                          <Num value={m[k] ?? null} decimals={1} />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right font-mono text-ink-2 tabular-nums">
                        <Num value={m.body_fat_pct ?? null} decimals={1} unit="%" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes">
          <div className="max-w-2xl space-y-4">
            <div>
              <Label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                {t("notesLabel")}
              </Label>
              <Textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
              />
            </div>
            <div>
              <Label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                {t("injuriesLabel")}
              </Label>
              <Textarea
                rows={4}
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder={t("injuriesPlaceholder")}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSaveNotes} disabled={saving}>
                <Save size={14} />{" "}
                {saving ? t("savingNotes") : t("saveNotes")}
              </Button>
              {notesSaved && (
                <span className="font-mono text-[11px] text-good uppercase tracking-[0.06em]">
                  ✓ {t("notesSaved")}
                </span>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PHOTOS */}
        <TabsContent value="photos">
          {photos.length === 0 ? (
            <p className="py-10 text-center font-mono text-[11px] text-ink-3 uppercase tracking-[0.08em]">
              {t("noPhotos")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <div
                  key={p.id as string}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/progress-photos/${p.storage_path as string}`}
                    alt={`${p.angle || "photo"} - ${p.photo_date}`}
                    className="aspect-[3/4] w-full object-cover"
                    loading="lazy"
                  />
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.06em]">
                      {new Date(
                        (p.photo_date as string) + "T00:00"
                      ).toLocaleDateString(bcp47)}
                    </span>
                    {p.angle && (
                      <Chip variant="ghost" size="sm">
                        {(p.angle as string).toUpperCase()}
                      </Chip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
