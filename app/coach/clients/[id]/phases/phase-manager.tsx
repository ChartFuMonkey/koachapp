"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPhase, activatePhase, deletePhase } from "@/actions/phases";
import {
  Plus,
  Trash2,
  ChevronLeft,
  X,
  Loader2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";
import { translateError } from "@/lib/translate-error";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Num } from "@/components/ui/athletic/num";
import { StatusDot } from "@/components/ui/athletic/status-dot";

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
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(b + "T00:00").getTime() - new Date(a + "T00:00").getTime();
  return Math.round(ms / 86400000);
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

  function formatDate(d: string) {
    return new Date(d + "T00:00").toLocaleDateString(bcp47, {
      day: "numeric",
      month: "short",
    });
  }

  function formatDateLong(d: string) {
    return new Date(d + "T00:00").toLocaleDateString(bcp47, {
      day: "numeric",
      month: "short",
      year: "numeric",
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

  // Sort phases chronologically and assign state
  const sorted = [...phases].sort(
    (a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const activePhase = phases.find((p) => p.is_active) || null;
  const futurePhases = sorted.filter(
    (p) => p.start_date > todayStr && !p.is_active
  );

  // Build the 4-up display (active + up to 3 future)
  const cards: Array<{
    phase: Phase | null;
    state: "ACTIVE" | "NEXT" | "PLANNED" | "EMPTY";
  }> = [];
  cards.push({ phase: activePhase, state: activePhase ? "ACTIVE" : "EMPTY" });
  cards.push({
    phase: futurePhases[0] ?? null,
    state: futurePhases[0] ? "NEXT" : "EMPTY",
  });
  cards.push({
    phase: futurePhases[1] ?? null,
    state: futurePhases[1] ? "PLANNED" : "EMPTY",
  });
  cards.push({
    phase: futurePhases[2] ?? null,
    state: futurePhases[2] ? "PLANNED" : "EMPTY",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <Link
          href={`/coach/clients/${clientId}`}
          className="mb-2 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
        >
          <ChevronLeft size={12} /> {clientName}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel>{clientName.toUpperCase()} · PHASE MANAGER</MicroLabel>
            <h1 className="mt-1 text-[28px] sm:text-[32px] font-semibold tracking-tight text-ink">
              {t("title")}
            </h1>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus size={14} /> {t("addPhase")}
            </Button>
          )}
        </div>
      </div>

      {/* 4-up phase cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => {
          if (!c.phase) {
            return (
              <div
                key={`empty-${i}`}
                className="rounded-xl border border-dashed border-hairline-2 bg-card/40 p-5 flex flex-col justify-between min-h-[140px]"
              >
                <Chip variant="ghost" size="sm" className="w-fit">
                  EMPTY
                </Chip>
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                  Add phase ›
                </span>
              </div>
            );
          }
          const isActive = c.state === "ACTIVE";
          const variant: "accent" | "neutral" | "ghost" = isActive
            ? "accent"
            : c.state === "NEXT"
              ? "neutral"
              : "ghost";
          return (
            <div
              key={c.phase.id}
              className={`relative rounded-xl border p-5 ${
                isActive
                  ? "border-primary/40 bg-card"
                  : "border-border bg-card"
              }`}
            >
              {isActive && (
                <span className="absolute right-3 top-3">
                  <StatusDot tone="good" />
                </span>
              )}
              <Chip variant={variant} size="sm" className="w-fit">
                {c.state}
              </Chip>
              <div className="mt-3 text-[22px] font-semibold tracking-tight text-ink leading-tight">
                {c.phase.name}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                {formatDate(c.phase.start_date)}
                {c.phase.end_date ? ` — ${formatDate(c.phase.end_date)}` : ""}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                  KCAL
                </span>
                <span
                  className="font-mono text-base font-semibold tabular-nums"
                  style={{
                    color: isActive ? "var(--lime)" : "var(--ink)",
                  }}
                >
                  {c.phase.target_kcal != null ? (
                    <Num value={c.phase.target_kcal} />
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active phase detail */}
      {activePhase && (
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-sm font-semibold text-ink">
              Active phase — {activePhase.name}
            </span>
            <Chip variant="accent">
              {activePhase.end_date
                ? `${daysBetween(activePhase.start_date, todayStr)} / ${daysBetween(activePhase.start_date, activePhase.end_date)} DAYS`
                : `${daysBetween(activePhase.start_date, todayStr)} DAYS`}
            </Chip>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3">
            {[
              {
                label: "CALORIE TARGET",
                value:
                  activePhase.target_kcal != null
                    ? `${activePhase.target_kcal}`
                    : "—",
                sub: activePhase.target_kcal != null ? "kcal / day" : "",
              },
              {
                label: "TYPE",
                value: typeLabel(activePhase.type ?? ""),
                sub: "",
              },
              {
                label: "STARTED",
                value: formatDateLong(activePhase.start_date),
                sub: `${daysBetween(activePhase.start_date, todayStr)} days ago`,
              },
              {
                label: "ENDS",
                value: activePhase.end_date
                  ? formatDateLong(activePhase.end_date)
                  : "—",
                sub: activePhase.end_date
                  ? `in ${daysBetween(todayStr, activePhase.end_date)} days`
                  : "open-ended",
              },
              {
                label: "STATUS",
                value: "ACTIVE",
                sub: "",
              },
              {
                label: "NOTES",
                value: activePhase.notes || "—",
                sub: "",
              },
            ].map((p, i) => (
              <div
                key={p.label}
                className={`p-5 ${
                  i < 3 ? "border-b border-border lg:border-b" : ""
                } ${i % 3 < 2 ? "border-r border-border" : ""} ${
                  i >= 3 ? "border-b border-border lg:border-b-0" : ""
                }`}
              >
                <MicroLabel>{p.label}</MicroLabel>
                <div className="mt-2 font-mono text-[20px] font-semibold tracking-tight text-ink leading-tight">
                  {p.value}
                </div>
                {p.sub && (
                  <div className="mt-1 font-mono text-[11px] text-ink-3">
                    {p.sub}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
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

      {/* All phases list */}
      <MicroLabel>ALL PHASES · {phases.length}</MicroLabel>
      {phases.length === 0 && !showAddForm ? (
        <p className="mt-3 py-8 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
          {t("emptyPhases")}
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {sorted.map((phase, idx) => (
            <div
              key={phase.id}
              className={`flex flex-wrap items-center gap-3 px-5 py-3 ${
                idx < sorted.length - 1 ? "border-b border-border" : ""
              } ${phase.is_active ? "bg-primary/[0.03]" : ""}`}
            >
              <StatusDot
                tone={phase.is_active ? "good" : "neutral"}
                glow={phase.is_active}
              />
              <span className="text-sm font-semibold text-ink min-w-0 flex-1 truncate">
                {phase.name}
              </span>
              {phase.type && (
                <Chip variant="ghost" size="sm">
                  {typeLabel(phase.type).toUpperCase()}
                </Chip>
              )}
              <span className="font-mono text-[11px] text-ink-2 tabular-nums">
                {formatDate(phase.start_date)}
                {phase.end_date ? ` — ${formatDate(phase.end_date)}` : ""}
              </span>
              {phase.target_kcal != null && (
                <span className="font-mono text-[11px] text-ink tabular-nums">
                  {phase.target_kcal} kcal
                </span>
              )}
              <div className="flex items-center gap-1 ml-auto">
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
          ))}
        </div>
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
