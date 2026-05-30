"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPhase,
  updatePhase,
  activatePhase,
  deletePhase,
} from "@/actions/phases";
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
  target_protein_g: number | null;
  target_steps: number | null;
  cardio_note: string | null;
  lift_volume_note: string | null;
  weighin_freq: string | null;
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

// Shared editable fields for both the create and edit phase forms.
function PhaseFormFields({
  phase,
  t,
  typeLabel,
  selectClass,
}: {
  phase: Phase | null;
  t: (key: string) => string;
  typeLabel: (value: string) => string;
  selectClass: string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("nameLabel")} *
          </Label>
          <Input
            name="name"
            required
            defaultValue={phase?.name ?? ""}
            placeholder={t("namePlaceholder")}
            autoFocus
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("typeLabel")}
          </Label>
          <select
            name="type"
            className={selectClass}
            defaultValue={phase?.type ?? ""}
          >
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
          <Input
            name="target_kcal"
            type="number"
            defaultValue={phase?.target_kcal ?? ""}
            placeholder="2200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("startDateLabel")} *
          </Label>
          <Input
            name="start_date"
            type="date"
            required
            defaultValue={phase?.start_date ?? ""}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("endDateLabel")}
          </Label>
          <Input
            name="end_date"
            type="date"
            defaultValue={phase?.end_date ?? ""}
          />
        </div>
      </div>
      {/* Prescription targets (all optional) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("targetProteinLabel")}
          </Label>
          <Input
            name="target_protein_g"
            type="number"
            defaultValue={phase?.target_protein_g ?? ""}
            placeholder="180"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("targetStepsLabel")}
          </Label>
          <Input
            name="target_steps"
            type="number"
            defaultValue={phase?.target_steps ?? ""}
            placeholder="10000"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("weighinLabel")}
          </Label>
          <Input
            name="weighin_freq"
            defaultValue={phase?.weighin_freq ?? ""}
            placeholder={t("weighinPlaceholder")}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("cardioLabel")}
          </Label>
          <Input
            name="cardio_note"
            defaultValue={phase?.cardio_note ?? ""}
            placeholder={t("cardioPlaceholder")}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-ink-3">
            {t("liftVolumeLabel")}
          </Label>
          <Input
            name="lift_volume_note"
            defaultValue={phase?.lift_volume_note ?? ""}
            placeholder={t("liftVolumePlaceholder")}
          />
        </div>
      </div>
      <div>
        <Label className="mb-1 block text-xs text-ink-3">
          {t("notesLabel")}
        </Label>
        <Textarea
          name="notes"
          rows={2}
          defaultValue={phase?.notes ?? ""}
          placeholder={t("notesPlaceholder")}
        />
      </div>
    </>
  );
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
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
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

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingPhase) return;
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const res = await updatePhase(editingPhase.id, formData);
    setSaving(false);
    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }
    toast.success(t("phaseUpdatedToast"));
    setEditingPhase(null);
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

  // Active panel metric cells — only rows the coach actually set are shown.
  const activeMetrics: Array<[string, string]> = [];
  if (activePhase) {
    if (activePhase.target_kcal != null)
      activeMetrics.push([t("mCalories"), `${activePhase.target_kcal} kcal`]);
    if (activePhase.target_protein_g != null)
      activeMetrics.push([t("mProtein"), `${activePhase.target_protein_g} g`]);
    if (activePhase.target_steps != null)
      activeMetrics.push([
        t("mSteps"),
        activePhase.target_steps.toLocaleString(bcp47),
      ]);
    if (activePhase.cardio_note)
      activeMetrics.push([t("mCardio"), activePhase.cardio_note]);
    if (activePhase.lift_volume_note)
      activeMetrics.push([t("mLiftVolume"), activePhase.lift_volume_note]);
    if (activePhase.weighin_freq)
      activeMetrics.push([t("mWeighins"), activePhase.weighin_freq]);
  }

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
                    {t("mCalories")}
                  </span>
                  <span
                    className={`font-mono text-base font-semibold tabular-nums ${
                      isActive ? "text-lime" : "text-ink"
                    }`}
                  >
                    {p.target_kcal != null ? `${p.target_kcal}` : "—"}
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
          {activeMetrics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {activeMetrics.map(([k, v]) => (
                <div
                  key={k}
                  className="border-b border-border p-5 sm:[&:nth-child(odd)]:sm:border-r lg:[&:nth-child(3n+1)]:border-r lg:[&:nth-child(3n+2)]:border-r"
                >
                  <MicroLabel>{k}</MicroLabel>
                  <div className="mt-2 font-mono text-[20px] font-semibold leading-tight tracking-tight tabular-nums text-ink">
                    {v}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-[13px] text-ink-3">
              {t("noTargetsSet")}
            </div>
          )}
        </div>
      )}

      {/* Edit / Add buttons */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-border bg-surface-1 px-4 py-2.5 text-[13px] text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
          disabled={!activePhase}
          onClick={() => {
            if (activePhase) {
              setShowAddForm(false);
              setEditingPhase(activePhase);
            }
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
          <MicroLabel>{t("newPhase")}</MicroLabel>
          <form onSubmit={handleCreate} className="mt-3 space-y-3">
            <PhaseFormFields
              phase={null}
              t={t}
              typeLabel={typeLabel}
              selectClass={selectClass}
            />
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

      {/* Edit form */}
      {editingPhase && (
        <div className="mt-6 rounded-md border border-lime/40 bg-surface-1 p-5">
          <MicroLabel>{t("editingPhase", { name: editingPhase.name })}</MicroLabel>
          <form onSubmit={handleEdit} className="mt-3 space-y-3">
            <PhaseFormFields
              phase={editingPhase}
              t={t}
              typeLabel={typeLabel}
              selectClass={selectClass}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {tCommon("save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingPhase(null)}
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
