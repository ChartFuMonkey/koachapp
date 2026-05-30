"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPhase, activatePhase, deletePhase } from "@/actions/phases";
import { Plus, Trash2, ChevronLeft, X, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";
import { translateError } from "@/lib/translate-error";
import { MicroLabel } from "@/components/ui/athletic/micro-label";

type Phase = {
  id: string;
  name: string;
  type: string | null;
  start_date: string;
  end_date: string | null;
  target_kcal: number | null;
  notes: string | null;
  is_active: boolean;
};

type PhaseState = "ACTIVE" | "NEXT" | "PLANNED";

const PHASE_TYPE_VALUES = [
  "",
  "fat_loss",
  "muscle_gain",
  "maintenance",
  "strength",
  "rest",
  "other",
] as const;

const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface-1 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(a + "T00:00").getTime() - new Date(b + "T00:00").getTime();
  return Math.round(ms / 86400000);
}

// Maps phase type to a sensible kcal delta string for the card / panel sub.
function kcalDeltaForType(type: string | null, target: number | null): string {
  switch (type) {
    case "fat_loss":
      return "−400";
    case "muscle_gain":
      return "+300";
    case "recomp":
      return "+50";
    case "maintenance":
      return "0";
    case "strength":
      return "+200";
    case "rest":
      return "0";
    default:
      return target != null ? `${target}` : "—";
  }
}

export default function PhaseManager({
  clientId,
  clientName,
  phases,
}: {
  clientId: string;
  clientName: string;
  phases: Phase[];
}) {
  const router = useRouter();
  const t = useTranslations("coach.phases");
  const tTypes = useTranslations("coach.phases.types");
  const tErr = useTranslations("coach.phases.errors");
  const tCommonErr = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  function formatShort(d: string) {
    return new Date(d + "T00:00").toLocaleDateString(bcp47, {
      day: "numeric",
      month: "short",
    });
  }

  function typeLabel(value: string) {
    if (!value) return tTypes("none");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return tTypes(value as any);
    } catch {
      return value;
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const res = await createPhase(clientId, formData);
    setSaving(false);
    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }
    toast.success(t("phaseCreatedToast"));
    setShowAddForm(false);
    router.refresh();
  }

  async function handleActivate(phaseId: string) {
    setSaving(true);
    const res = await activatePhase(clientId, phaseId);
    setSaving(false);
    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }
    toast.success(t("phaseActivatedToast"));
    router.refresh();
  }

  async function handleDelete(phaseId: string) {
    const res = await deletePhase(phaseId);
    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }
    toast.success(t("phaseDeletedToast"));
    setDeleteTarget(null);
    router.refresh();
  }

  // Phase ordering & state assignment ---------------------------------------
  const sorted = [...phases].sort(
    (a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const activePhase = sorted.find((p) => p.is_active) ?? null;

  // Earliest non-active phase whose start_date > today is "NEXT".
  const nextPhase =
    sorted.find((p) => !p.is_active && p.start_date > todayStr) ?? null;

  function stateFor(p: Phase): PhaseState {
    if (p.is_active) return "ACTIVE";
    if (nextPhase && p.id === nextPhase.id) return "NEXT";
    return "PLANNED";
  }

  // Build up to four cards: prefer ACTIVE first, NEXT second, then PLANNED.
  const ordered: Phase[] = [];
  if (activePhase) ordered.push(activePhase);
  if (nextPhase && nextPhase.id !== activePhase?.id) ordered.push(nextPhase);
  for (const p of sorted) {
    if (ordered.find((o) => o.id === p.id)) continue;
    ordered.push(p);
  }
  const cardPhases = ordered.slice(0, 4);

  // Active panel weekly progress -------------------------------------------
  let weekChip = "";
  if (activePhase) {
    const dayInPhase = Math.max(
      1,
      daysBetween(todayStr, activePhase.start_date) + 1
    );
    const curWeek = Math.max(1, Math.ceil(dayInPhase / 7));
    if (activePhase.end_date) {
      const totalDays =
        daysBetween(activePhase.end_date, activePhase.start_date) + 1;
      const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
      weekChip = `WEEK ${Math.min(curWeek, totalWeeks)} / ${totalWeeks}`;
    } else {
      weekChip = `WEEK ${curWeek}`;
    }
  }

  // Active panel metric cells ----------------------------------------------
  const activeMetrics: Array<[string, string, string]> = activePhase
    ? [
        [
          "Calorie target",
          activePhase.target_kcal != null
            ? `${activePhase.target_kcal} kcal`
            : "— kcal",
          `${kcalDeltaForType(activePhase.type, activePhase.target_kcal)} from maint.`,
        ],
        ["Protein target", "180g", "2.2 g/kg"],
        ["Step target", "10,000", "per day"],
        ["Cardio", "2 × 30min", "zone 2"],
        ["Lift volume", "−15%", "vs. baseline"],
        ["Weigh-ins", "Daily", "fasted, AM"],
      ]
    : [];

  return (
    <div className="px-10 py-8">
      {/* Back link */}
      <Link
        href={`/coach/clients/${clientId}`}
        className="mb-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
      >
        <ChevronLeft size={12} /> {clientName}
      </Link>

      {/* Header: micro-label + 36px headline */}
      <MicroLabel>{clientName.toUpperCase()} · PHASE MANAGER</MicroLabel>
      <h1 className="mt-2 text-[36px] font-semibold leading-none tracking-tight text-ink">
        {t("title")}
      </h1>

      {/* 4-column phase cards */}
      {cardPhases.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {cardPhases.map((p) => {
            const state = stateFor(p);
            const isActive = state === "ACTIVE";
            const chipClasses =
              state === "ACTIVE"
                ? "bg-lime text-bg border-transparent"
                : state === "NEXT"
                  ? "bg-surface-2 text-ink-2 border-hairline-2"
                  : "bg-surface-2 text-ink-3 border-hairline-2";
            return (
              <div
                key={p.id}
                className={`relative rounded-md border bg-surface-1 p-5 ${
                  isActive ? "border-lime" : "border-border"
                }`}
              >
                {isActive && (
                  <span
                    className="absolute right-3 top-3 size-2 rounded-full bg-lime"
                    style={{ boxShadow: "0 0 10px var(--lime)" }}
                  />
                )}
                <span
                  className={`inline-flex h-5 items-center rounded-[3px] border px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] ${chipClasses}`}
                >
                  {state}
                </span>
                <div className="mt-3.5 text-[26px] font-semibold leading-tight tracking-tight text-ink">
                  {p.name}
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                  {formatShort(p.start_date)}
                  {p.end_date ? ` · ${formatShort(p.end_date)}` : ""}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    KCAL Δ
                  </span>
                  <span
                    className={`font-mono text-base font-semibold tabular-nums ${
                      isActive ? "text-lime" : "text-ink"
                    }`}
                  >
                    {kcalDeltaForType(p.type, p.target_kcal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active phase panel */}
      {activePhase && (
        <div className="mt-8 overflow-hidden rounded-md border border-border bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="text-sm font-semibold text-ink">
              Active phase — {activePhase.name}
            </span>
            <span className="inline-flex h-5 items-center rounded-[3px] border border-transparent bg-lime px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-bg">
              {weekChip}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {activeMetrics.map(([k, v, sub], i) => (
              <div
                key={k}
                className={`p-5 ${
                  i < 3 ? "border-b border-border" : ""
                } ${i % 3 < 2 ? "sm:border-r sm:border-border" : ""}`}
              >
                <MicroLabel>{k}</MicroLabel>
                <div className="mt-2 font-mono text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-ink">
                  {v}
                </div>
                <div className="mt-1 text-[11px] text-ink-3">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit / Add buttons */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-border bg-surface-1 px-4 py-2.5 text-[13px] text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
          disabled={!activePhase}
          onClick={() => {
            // Edit flow placeholder — dedicated edit modal lands in a follow-up.
            toast.message(t("editComingSoon"));
          }}
        >
          {t("editPhase")}
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md bg-lime px-4 py-2.5 text-[13px] font-semibold text-bg hover:bg-lime-hover active:bg-lime-press transition-all"
        >
          <Plus size={14} /> {t("addPhase")}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mt-6 rounded-md border border-border bg-surface-1 p-5">
          <MicroLabel>NEW PHASE</MicroLabel>
          <form onSubmit={handleCreate} className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1 block text-xs text-ink-3">
                  {t("nameLabel")} *
                </Label>
                <Input
                  name="name"
                  required
                  placeholder={t("namePlaceholder")}
                  autoFocus
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-ink-3">
                  {t("typeLabel")}
                </Label>
                <select name="type" className={selectClass}>
                  {PHASE_TYPE_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {typeLabel(v)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-ink-3">
                  {t("targetKcalLabel")}
                </Label>
                <Input name="target_kcal" type="number" placeholder="2200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs text-ink-3">
                  {t("startDateLabel")} *
                </Label>
                <Input name="start_date" type="date" required />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-ink-3">
                  {t("endDateLabel")}
                </Label>
                <Input name="end_date" type="date" />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-ink-3">
                {t("notesLabel")}
              </Label>
              <Textarea
                name="notes"
                rows={2}
                placeholder={t("notesPlaceholder")}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                {t("createSubmit")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
              >
                <X size={14} /> {tCommon("cancel")}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* All phases list (compact) */}
      {phases.length > 0 && (
        <>
          <div className="mt-8">
            <MicroLabel>ALL PHASES · {phases.length}</MicroLabel>
          </div>
          <div className="mt-3 overflow-hidden rounded-md border border-border bg-surface-1">
            {sorted.map((phase, idx) => {
              const state = stateFor(phase);
              const stateChip =
                state === "ACTIVE"
                  ? "bg-lime text-bg border-transparent"
                  : state === "NEXT"
                    ? "bg-surface-2 text-ink-2 border-hairline-2"
                    : "bg-surface-2 text-ink-3 border-hairline-2";
              return (
                <div
                  key={phase.id}
                  className={`flex flex-wrap items-center gap-3 px-5 py-3 ${
                    idx < sorted.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span
                    className={`inline-flex h-5 items-center rounded-[3px] border px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] ${stateChip}`}
                  >
                    {state}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {phase.name}
                  </span>
                  {phase.type && (
                    <span className="hidden sm:inline-flex h-5 items-center rounded-[3px] border border-hairline-2 bg-surface-2 px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-ink-2">
                      {typeLabel(phase.type).toUpperCase()}
                    </span>
                  )}
                  <span className="font-mono text-[11px] tabular-nums text-ink-2">
                    {formatShort(phase.start_date)}
                    {phase.end_date ? ` — ${formatShort(phase.end_date)}` : ""}
                  </span>
                  {phase.target_kcal != null && (
                    <span className="font-mono text-[11px] tabular-nums text-ink">
                      {phase.target_kcal} kcal
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {!phase.is_active && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleActivate(phase.id)}
                        disabled={saving}
                      >
                        <Zap size={11} /> {t("activate")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setDeleteTarget({ id: phase.id, name: phase.name })
                      }
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {phases.length === 0 && !showAddForm && (
        <p className="mt-8 py-8 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
          {t("emptyPhases")}
        </p>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("confirmDeleteTitle", { name: deleteTarget?.name ?? "" })}
        description={t("confirmDeleteDesc")}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
