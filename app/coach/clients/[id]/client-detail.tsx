"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateClientNotes, updateClientTargets } from "@/actions/coach";
import { sendReminder } from "@/actions/send-reminder";
import { Save, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Avatar } from "@/components/ui/athletic/avatar";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Num } from "@/components/ui/athletic/num";
import { RingChart } from "@/components/ui/athletic/ring-chart";
import { StatusDot } from "@/components/ui/athletic/status-dot";
import { LineChart } from "@/components/ui/athletic/line-chart";
import { AdherenceBars } from "@/components/ui/athletic/adherence-bars";
import MessageDialog from "@/components/coach-shell/message-dialog";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  normalizePhase,
  weightDeltaTone,
} from "@/lib/metric-direction";

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

type TabKey = "logs" | "checkins" | "measurements" | "notes" | "photos";
type RangeKey = "7D" | "30D" | "90D" | "ALL";

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

function dayName(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { weekday: "short" }).toUpperCase();
}

function monthNameUpper(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { month: "short" }).toUpperCase();
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

  const [activeTab, setActiveTab] = useState<TabKey>("logs");
  const [range, setRange] = useState<RangeKey>("30D");
  const [editingTargets, setEditingTargets] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState((client.notes as string) || "");
  const [injuries, setInjuries] = useState((client.injuries as string) || "");
  const [saving, setSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Messaging
  const [messageOpen, setMessageOpen] = useState(false);
  const [coachUserId, setCoachUserId] = useState<string | null>(null);
  useEffect(() => {
    if (!messageOpen) return;
    if (coachUserId) return;
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCoachUserId(data.user.id);
    });
  }, [messageOpen, coachUserId]);

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

  const rangeDays: Record<RangeKey, number | null> = {
    "7D": 7,
    "30D": 30,
    "90D": 90,
    ALL: null,
  };

  const filteredWeight = useMemo(() => {
    const days = rangeDays[range];
    if (days == null) return weightData;
    return weightData.slice(-days);
  }, [weightData, range]);

  const latestWeight = filteredWeight.length
    ? filteredWeight[filteredWeight.length - 1].weight
    : null;
  const firstWeight = filteredWeight.length ? filteredWeight[0].weight : null;
  const weightDelta =
    latestWeight != null && firstWeight != null
      ? latestWeight - firstWeight
      : null;

  // 14-day adherence: 100 if logged, 0 if not
  const adherence14 = useMemo(() => {
    const logsByDate = new Map<string, Row>();
    logs.forEach((l) => logsByDate.set(l.log_date as string, l));
    const arr: number[] = [];
    for (let i = 13; i >= 0; i--) {
      arr.push(logsByDate.has(daysAgo(i)) ? 100 : 0);
    }
    return arr;
  }, [logs]);
  const loggedDays = adherence14.filter((v) => v > 0).length;
  const adherenceAvg = Math.round((loggedDays / 14) * 100);

  // Streak: consecutive logged days walking back from today
  const streak = useMemo(() => {
    const dates = new Set(logs.map((l) => l.log_date as string));
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const date = daysAgo(i);
      if (dates.has(date)) {
        count++;
      } else if (i === 0) {
        // allow today to be missing, but stop if yesterday is also missing
        continue;
      } else {
        break;
      }
    }
    return count;
  }, [logs]);

  // Days since start
  const daysSinceStart = useMemo(() => {
    if (!client.start_date) return null;
    const start = new Date((client.start_date as string) + "T00:00");
    const today = new Date();
    const diff = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 ? diff : 0;
  }, [client.start_date]);

  // Next check-in: next Sunday from today
  const nextCheckin = useMemo(() => {
    const today = new Date();
    const dow = today.getDay(); // 0 = Sunday
    const daysUntilSunday = dow === 0 ? 7 : 7 - dow;
    const next = new Date(today);
    next.setDate(today.getDate() + daysUntilSunday);
    return dayName(next, bcp47);
  }, [bcp47]);

  // Format start date: "14_APR_2026"
  const startedDisplay = useMemo(() => {
    if (!client.start_date) return null;
    const d = new Date((client.start_date as string) + "T00:00");
    const day = String(d.getDate()).padStart(2, "0");
    const month = monthNameUpper(d, bcp47);
    return `${day}_${month}_${d.getFullYear()}`;
  }, [client.start_date, bcp47]);

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
    setEditingNotes(false);
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
      color: "#7DD3FC",
    },
    {
      label: t("targetCarbs"),
      current: latestLog.carbs_g ?? null,
      target: targets.target_carbs_g,
      unit: "g",
      color: "#FBBF24",
    },
    {
      label: t("targetFat"),
      current: latestLog.fat_g ?? null,
      target: targets.target_fat_g,
      unit: "g",
      color: "#FB7185",
    },
    {
      label: t("targetSteps"),
      current: latestLog.steps ?? null,
      target: targets.target_steps,
      unit: "",
      color: "#A78BFA",
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
  const phaseLabel = phase?.name
    ? (phase.name as string).toUpperCase()
    : "—";

  const tabs: { key: TabKey; label: string }[] = [
    { key: "logs", label: t("tabLogs") },
    { key: "checkins", label: t("tabCheckins") },
    { key: "measurements", label: t("tabMeasurements") },
    { key: "notes", label: t("tabNotes") },
    { key: "photos", label: t("tabPhotos") },
  ];

  const tabRowCount: Record<TabKey, number> = {
    logs: logs.length,
    checkins: checkins.length,
    measurements: measurements.length,
    notes: notes ? 1 : 0,
    photos: photos.length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 px-10 py-6">
        <Avatar name={fullName} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink truncate m-0">
              {fullName}
            </h1>
            {isActive ? (
              <Chip variant="good" size="lg" className="gap-1.5">
                <StatusDot tone="good" size="sm" />
                ON TRACK
              </Chip>
            ) : (
              <Chip variant="neutral" size="lg">
                {t("inactive").toUpperCase()}
              </Chip>
            )}
            <Chip variant="ghost" size="lg">
              {phaseLabel}
            </Chip>
          </div>
          <div className="mt-1 font-mono text-[11px] text-ink-3 tracking-[0.04em]">
            {startedDisplay && <>STARTED {startedDisplay} · </>}
            {daysSinceStart != null && <>{daysSinceStart} DAYS · </>}
            NEXT CHECK-IN: {nextCheckin}
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessageOpen(true)}
          >
            {t("message")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            {sendingReminder
              ? t("sendReminderLoading")
              : `↻ ${t("reminder")}`}
          </Button>
          <Link href={`/coach/clients/${client.id}/program`}>
            <Button size="sm">{t("openProgram")} ↗</Button>
          </Link>
        </div>
      </div>

      <div className="px-10 pb-10">
        {/* Macro ring grid */}
        <div className="mb-3 flex items-center justify-between">
          <MicroLabel>~/Latest snapshot</MicroLabel>
          {!editingTargets ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setEditingTargets(true)}
            >
              <Pencil size={12} /> {t("editTargets")}
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Button onClick={handleSaveTargets} disabled={saving} size="xs">
                <Save size={12} /> {t("saveTargets")}
              </Button>
              <Button
                variant="ghost"
                size="xs"
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
                className="rounded-lg bg-surface-1 border border-border p-3.5"
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
                <div className="mt-2 font-mono text-[22px] font-semibold tracking-tight text-ink leading-none tabular-nums">
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
          <div className="mt-3 rounded-lg bg-surface-1 border border-border p-4">
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

        {/* Charts row */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
          {/* Body weight chart */}
          <div className="rounded-lg bg-surface-1 border border-border p-5">
            <div className="flex items-start justify-between">
              <div>
                <MicroLabel>
                  {t("weightTrend").toUpperCase()} · {range}
                </MicroLabel>
                <div className="mt-2 flex items-baseline gap-2">
                  {latestWeight != null ? (
                    <>
                      <span className="font-mono text-[32px] font-semibold tracking-tight tabular-nums text-ink leading-none">
                        <Num value={latestWeight} decimals={1} />
                      </span>
                      <span className="text-[14px] text-ink-3">kg</span>
                      {weightDelta != null && weightDelta !== 0 && (() => {
                        const tone = weightDeltaTone(
                          weightDelta,
                          normalizePhase(phase?.name as string | null | undefined)
                        );
                        const chipVariant =
                          tone === "good"
                            ? "good"
                            : tone === "warn"
                              ? "warn"
                              : tone === "danger"
                                ? "danger"
                                : "neutral";
                        return (
                          <Chip variant={chipVariant} className="ml-1">
                            {weightDelta < 0 ? "↓" : "↑"}{" "}
                            {Math.abs(weightDelta).toFixed(1)} kg
                          </Chip>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="font-mono text-[18px] text-ink-3">—</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {(["7D", "30D", "90D", "ALL"] as RangeKey[]).map((r) => {
                  const active = r === range;
                  return (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={
                        "rounded-[3px] border px-1.5 h-5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] cursor-pointer transition-colors " +
                        (active
                          ? "bg-surface-2 text-ink border-hairline-2"
                          : "bg-transparent text-ink-3 border-transparent hover:text-ink-2")
                      }
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
            {filteredWeight.length >= 2 ? (
              <div className="mt-4">
                <LineChart
                  data={filteredWeight.map((d) => d.weight)}
                  color="var(--lime)"
                  height={160}
                  ariaLabel={t("weightLabel")}
                />
              </div>
            ) : (
              <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                {t("noLogs")}
              </p>
            )}
          </div>

          {/* Adherence */}
          <div className="rounded-lg bg-surface-1 border border-border p-5">
            <MicroLabel>ADHERENCE · 14D</MicroLabel>
            <div className="mt-2 font-mono text-[18px] font-semibold tabular-nums text-ink leading-none">
              {adherenceAvg}
              <span className="text-ink-3 text-xs ml-0.5">%</span>
            </div>
            <div className="mt-4">
              <AdherenceBars values={adherence14} height={100} />
            </div>
            <div className="mt-2.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
              <span>2W AGO</span>
              <span>TODAY</span>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="text-ink-2">{t("avgAdherence")}</span>
                <span className="font-mono font-semibold text-ink tabular-nums">
                  {adherenceAvg}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-2">{t("streak")}</span>
                <span className="font-mono font-semibold text-lime tabular-nums">
                  {streak} {t("days")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/coach/clients/${client.id}/program`}>
            <Button variant="outline" size="sm">
              {t("programBuilder")}
            </Button>
          </Link>
          <Link href={`/coach/clients/${client.id}/phases`}>
            <Button variant="outline" size="sm">
              {t("phaseManager")}
            </Button>
          </Link>
          <Link href={`/coach/clients/${client.id}/meal-plan`}>
            <Button variant="outline" size="sm">
              {t("mealPlan")}
            </Button>
          </Link>
        </div>

        {/* Tabbed table */}
        <div className="mt-4 rounded-lg bg-surface-1 border border-border overflow-hidden">
          {/* Tab row */}
          <div className="flex items-center gap-5 px-5 border-b border-border h-[46px]">
            {tabs.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    "relative h-full flex items-center text-[13px] cursor-pointer transition-colors " +
                    (active
                      ? "text-ink font-semibold"
                      : "text-ink-3 hover:text-ink-2 font-normal")
                  }
                >
                  {tab.label}
                  {active && (
                    <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-lime" />
                  )}
                </button>
              );
            })}
            <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              {tabRowCount[activeTab]} {t("rows")}
            </span>
          </div>

          {activeTab === "logs" && (
            <LogsTab logs={logs} t={t} bcp47={bcp47} />
          )}
          {activeTab === "checkins" && (
            <CheckinsTab checkins={checkins} t={t} bcp47={bcp47} />
          )}
          {activeTab === "measurements" && (
            <MeasurementsTab measurements={measurements} t={t} bcp47={bcp47} />
          )}
          {activeTab === "notes" && (
            <NotesTab
              notes={notes}
              setNotes={setNotes}
              injuries={injuries}
              setInjuries={setInjuries}
              editing={editingNotes}
              setEditing={setEditingNotes}
              saving={saving}
              notesSaved={notesSaved}
              onSave={handleSaveNotes}
              t={t}
            />
          )}
          {activeTab === "photos" && (
            <PhotosTab
              photos={photos}
              supabaseUrl={supabaseUrl}
              t={t}
              bcp47={bcp47}
            />
          )}
        </div>
      </div>

      {/* Message dialog */}
      <MessageDialog
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        clientId={client.id as string}
        clientName={(profile.full_name as string) || "Client"}
        currentUserId={coachUserId ?? ""}
      />
    </div>
  );
}

/* ============ Tab content components ============ */

type TFn = ReturnType<typeof useTranslations>;

function LogsTab({
  logs,
  t,
  bcp47,
}: {
  logs: Row[];
  t: TFn;
  bcp47: string;
}) {
  if (logs.length === 0) {
    return (
      <p className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {t("noLogs")}
      </p>
    );
  }
  return (
    <>
      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] items-center px-5 py-2.5 border-b border-border font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
        <span>{t("colDate")}</span>
        <span>{t("colWeight")}</span>
        <span>{t("colKcal")}</span>
        <span>P</span>
        <span>C</span>
        <span>{t("colSteps")}</span>
        <span>{t("colSleep")}</span>
      </div>
      {logs.map((l, idx) => (
        <div
          key={l.id as string}
          className={
            "grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] items-center px-5 py-3 font-mono text-[12px] hover:bg-surface-2/40 transition-colors " +
            (idx < logs.length - 1 ? "border-b border-border" : "")
          }
        >
          <CellText
            value={new Date(
              (l.log_date as string) + "T00:00"
            ).toLocaleDateString(bcp47, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          />
          <CellNum value={l.weight_kg as number | null} decimals={1} />
          <CellNum value={l.calories_kcal as number | null} />
          <CellNum value={l.protein_g as number | null} />
          <CellNum value={l.carbs_g as number | null} />
          <CellNum value={l.steps as number | null} />
          <CellNum value={l.sleep_h as number | null} decimals={1} />
        </div>
      ))}
    </>
  );
}

function CellText({ value }: { value: string }) {
  return <span className="text-ink">{value}</span>;
}

function CellNum({
  value,
  decimals,
}: {
  value: number | null;
  decimals?: number;
}) {
  return (
    <span
      className={
        value == null
          ? "text-ink-3 tabular-nums"
          : "text-ink tabular-nums"
      }
    >
      <Num value={value} decimals={decimals} />
    </span>
  );
}

function CheckinsTab({
  checkins,
  t,
  bcp47,
}: {
  checkins: Row[];
  t: TFn;
  bcp47: string;
}) {
  if (checkins.length === 0) {
    return (
      <p className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {t("noCheckins")}
      </p>
    );
  }
  return (
    <>
      <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr] items-center px-5 py-2.5 border-b border-border font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
        <span>{t("colDate")}</span>
        <span>{t("ciEnergy")}</span>
        <span>{t("ciStress")}</span>
        <span>{t("ciMotivation")}</span>
        <span>{t("ciSleepQuality")}</span>
        <span>{t("ciAppetite")}</span>
      </div>
      {checkins.map((ci, idx) => (
        <div
          key={ci.id as string}
          className={
            "grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr] items-center px-5 py-3 font-mono text-[12px] hover:bg-surface-2/40 transition-colors " +
            (idx < checkins.length - 1 ? "border-b border-border" : "")
          }
        >
          <CellText
            value={new Date(
              (ci.checkin_date as string) + "T00:00"
            ).toLocaleDateString(bcp47, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          />
          <CellNum value={ci.energy_level as number | null} />
          <CellNum value={ci.stress_level as number | null} />
          <CellNum value={ci.motivation as number | null} />
          <CellNum value={ci.sleep_quality as number | null} />
          <CellNum value={ci.appetite as number | null} />
        </div>
      ))}
    </>
  );
}

function MeasurementsTab({
  measurements,
  t,
  bcp47,
}: {
  measurements: Row[];
  t: TFn;
  bcp47: string;
}) {
  if (measurements.length === 0) {
    return (
      <p className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {t("noMeasurements")}
      </p>
    );
  }
  return (
    <>
      <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr] items-center px-5 py-2.5 border-b border-border font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
        <span>{t("colDate")}</span>
        <span>{t("colNeck")}</span>
        <span>{t("colChest")}</span>
        <span>{t("colWaist")}</span>
        <span>{t("colHips")}</span>
        <span>{t("colArmL")}</span>
        <span>{t("colArmR")}</span>
        <span>{t("colThighL")}</span>
        <span>{t("colThighR")}</span>
        <span>{t("colBfPct")}</span>
      </div>
      {measurements.map((m, idx) => (
        <div
          key={m.id as string}
          className={
            "grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr] items-center px-5 py-3 font-mono text-[12px] hover:bg-surface-2/40 transition-colors " +
            (idx < measurements.length - 1 ? "border-b border-border" : "")
          }
        >
          <CellText
            value={new Date(
              (m.meas_date as string) + "T00:00"
            ).toLocaleDateString(bcp47, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          />
          <CellNum value={m.neck_cm as number | null} decimals={1} />
          <CellNum value={m.chest_cm as number | null} decimals={1} />
          <CellNum value={m.waist_cm as number | null} decimals={1} />
          <CellNum value={m.hips_cm as number | null} decimals={1} />
          <CellNum value={m.arm_l_cm as number | null} decimals={1} />
          <CellNum value={m.arm_r_cm as number | null} decimals={1} />
          <CellNum value={m.thigh_l_cm as number | null} decimals={1} />
          <CellNum value={m.thigh_r_cm as number | null} decimals={1} />
          <CellNum value={m.body_fat_pct as number | null} decimals={1} />
        </div>
      ))}
    </>
  );
}

function NotesTab({
  notes,
  setNotes,
  injuries,
  setInjuries,
  editing,
  setEditing,
  saving,
  notesSaved,
  onSave,
  t,
}: {
  notes: string;
  setNotes: (v: string) => void;
  injuries: string;
  setInjuries: (v: string) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  saving: boolean;
  notesSaved: boolean;
  onSave: () => void | Promise<void>;
  t: TFn;
}) {
  if (editing) {
    return (
      <div className="p-5 space-y-4 max-w-2xl">
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
          <Button onClick={onSave} disabled={saving} size="sm">
            <Save size={14} /> {saving ? t("savingNotes") : t("saveNotes")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            <X size={14} /> {t("cancelEdit")}
          </Button>
          {notesSaved && (
            <span className="font-mono text-[11px] text-good uppercase tracking-[0.06em]">
              ✓ {t("notesSaved")}
            </span>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="p-5 max-w-2xl">
      <div className="flex items-center justify-between mb-3">
        <MicroLabel>{t("notesLabel").toUpperCase()}</MicroLabel>
        <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
          <Pencil size={12} /> {t("edit")}
        </Button>
      </div>
      <p className="text-[13px] text-ink-2 whitespace-pre-wrap leading-relaxed">
        {notes || (
          <span className="text-ink-3">{t("notesPlaceholder")}</span>
        )}
      </p>
      {injuries && (
        <>
          <div className="mt-5 mb-2">
            <MicroLabel>{t("injuriesLabel").toUpperCase()}</MicroLabel>
          </div>
          <p className="text-[13px] text-ink-2 whitespace-pre-wrap leading-relaxed">
            {injuries}
          </p>
        </>
      )}
    </div>
  );
}

function PhotosTab({
  photos,
  supabaseUrl,
  t,
  bcp47,
}: {
  photos: Row[];
  supabaseUrl: string | undefined;
  t: TFn;
  bcp47: string;
}) {
  if (photos.length === 0) {
    return (
      <p className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {t("noPhotos")}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 p-5">
      {photos.map((p) => (
        <div
          key={p.id as string}
          className="overflow-hidden rounded-lg bg-surface-2 border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${supabaseUrl}/storage/v1/object/public/progress-photos/${p.storage_path as string}`}
            alt={`${(p.angle as string) || "photo"} - ${p.photo_date as string}`}
            className="aspect-[3/4] w-full object-cover"
            loading="lazy"
          />
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
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
  );
}
