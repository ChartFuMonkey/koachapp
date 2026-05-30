"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import {
  createProgram,
  deleteProgram,
  activateProgram,
  updateProgramMeta,
  duplicateProgram,
  addProgramDay,
  deleteProgramDay,
  addProgramExercise,
  removeProgramExercise,
  reorderProgramExercise,
} from "@/actions/programs";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  X,
  Loader2,
  Zap,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Exercise = { id: string; name: string; muscle_group?: string | null };
type ProgramExercise = {
  id: string;
  sets: number | null;
  reps: string | null;
  rest_sec: number | null;
  rpe: number | null;
  sort_order: number;
  exercises: Exercise | null;
};
type ProgramDay = {
  id: string;
  day_label: string;
  sort_order: number;
  program_exercises: ProgramExercise[];
};
type Program = {
  id: string;
  name: string;
  is_active: boolean;
  goal: string | null;
  total_weeks: number | null;
  coach_note: string | null;
  program_days: ProgramDay[];
};

function dayCodeFromLabel(label: string, index: number): string {
  const trimmed = (label ?? "").trim();
  if (trimmed) {
    const first = trimmed[0]?.toUpperCase();
    if (first && /[A-Z]/.test(first)) return first;
  }
  return String.fromCharCode(65 + index);
}

export default function ProgramBuilder({
  clientId,
  clientName,
  programs,
  allExercises,
}: {
  clientId: string;
  clientName: string;
  programs: Program[];
  allExercises: Exercise[];
}) {
  const router = useRouter();
  const t = useTranslations("coach.program");
  const tCommon = useTranslations("common");

  const [showNewProgram, setShowNewProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingDayFor, setAddingDayFor] = useState<string | null>(null);
  const [newDayLabel, setNewDayLabel] = useState("");
  const [addingExerciseFor, setAddingExerciseFor] = useState<string | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "program" | "day" | "exercise";
    id: string;
    label: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Pick the "active" program for the detail view: prefer is_active, else first.
  const activeProgram = programs.find((p) => p.is_active) ?? programs[0] ?? null;

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!newProgramName.trim()) return;
    setSaving(true);
    const res = await createProgram(clientId, newProgramName.trim());
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success(t("programCreatedToast"));
    setShowNewProgram(false);
    setNewProgramName("");
    router.refresh();
  }

  async function handleDeleteProgram(progId: string) {
    const res = await deleteProgram(progId);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success(t("programDeletedToast"));
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleActivate(progId: string) {
    setSaving(true);
    const res = await activateProgram(clientId, progId);
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success(t("programActivatedToast"));
    router.refresh();
  }

  async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeProgram) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const weeksRaw = (fd.get("total_weeks") as string)?.trim();
    const res = await updateProgramMeta(activeProgram.id, {
      name: (fd.get("name") as string) ?? undefined,
      goal: ((fd.get("goal") as string) ?? "").trim() || null,
      total_weeks: weeksRaw ? parseInt(weeksRaw, 10) : null,
      coach_note: ((fd.get("coach_note") as string) ?? "").trim() || null,
    });
    setSaving(false);
    if ("error" in res) {
      toast.error(t("settingsSaveFailed"));
      return;
    }
    toast.success(t("settingsSaved"));
    setSettingsOpen(false);
    router.refresh();
  }

  async function handleDuplicate() {
    if (!activeProgram) return;
    setSaving(true);
    const res = await duplicateProgram(activeProgram.id);
    setSaving(false);
    if ("error" in res) {
      toast.error(t("duplicateFailed"));
      return;
    }
    toast.success(t("duplicatedToast"));
    router.refresh();
  }

  async function handleAddDay(progId: string) {
    if (!newDayLabel.trim()) return;
    setSaving(true);
    const res = await addProgramDay(progId, newDayLabel.trim());
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success(t("dayAddedToast"));
    setAddingDayFor(null);
    setNewDayLabel("");
    router.refresh();
  }

  async function handleDeleteDay(dayId: string) {
    const res = await deleteProgramDay(dayId);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success(t("dayDeletedToast"));
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleRemoveExercise(peId: string) {
    const res = await removeProgramExercise(peId);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleReorder(
    peId: string,
    dayId: string,
    direction: "up" | "down"
  ) {
    await reorderProgramExercise(peId, dayId, direction);
    router.refresh();
  }

  // ── Empty state ────────────────────────────────────────────
  if (!activeProgram) {
    return (
      <div>
        <div className="border-b border-border px-6 py-6 sm:px-10">
          <Link
            href={`/coach/clients/${clientId}`}
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
          >
            <ChevronLeft size={12} /> {clientName}
          </Link>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <MicroLabel>
                {clientName.toUpperCase()} · PROGRAM
              </MicroLabel>
              <h1 className="mt-2 text-[28px] sm:text-[32px] font-semibold tracking-tight text-ink">
                {t("title")}
              </h1>
            </div>
            {!showNewProgram && (
              <Button onClick={() => setShowNewProgram(true)} size="sm">
                <Plus size={14} /> {t("newProgram")}
              </Button>
            )}
          </div>
        </div>

        {showNewProgram ? (
          <div className="px-6 py-6 sm:px-10">
            <form
              onSubmit={handleCreateProgram}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface-1 p-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Label className="mb-1 text-xs">
                  {t("programNameLabel")}
                </Label>
                <Input
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder={t("programNamePlaceholder")}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {t("createProgram")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewProgram(false)}
                >
                  <X size={14} />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-ink-3 sm:px-10">
            {t("emptyPrograms")}
          </p>
        )}
      </div>
    );
  }

  // ── Render with active program ─────────────────────────────
  const prog = activeProgram;
  const dayCount = prog.program_days.length;

  // Aggregate volume per muscle_group across all days
  const volumeByGroup = (() => {
    const totals = new Map<string, number>();
    for (const day of prog.program_days) {
      for (const pe of day.program_exercises) {
        const group = pe.exercises?.muscle_group?.trim();
        if (!group) continue;
        const setCount = typeof pe.sets === "number" ? pe.sets : 1;
        totals.set(group, (totals.get(group) ?? 0) + setCount);
      }
    }
    const arr = Array.from(totals.entries()).map(([name, sets]) => ({
      name,
      sets,
    }));
    arr.sort((a, b) => b.sets - a.sets);
    return arr;
  })();
  const maxVolume = Math.max(20, ...volumeByGroup.map((v) => v.sets));

  return (
    <div>
      {/* Header strip */}
      <div className="border-b border-border px-6 py-6 sm:px-10">
        <Link
          href={`/coach/clients/${clientId}`}
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
        >
          <ChevronLeft size={12} /> {clientName}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel>
              {clientName.toUpperCase()} · PROGRAM
            </MicroLabel>
            <h1 className="mt-2 text-[28px] sm:text-[32px] font-semibold tracking-tight text-ink">
              {prog.name}
            </h1>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {dayCount > 0 && (
                <Chip variant="neutral">{dayCount}D/WEEK</Chip>
              )}
              {prog.total_weeks != null && (
                <Chip variant="neutral">
                  {t("weeksChip", { count: prog.total_weeks })}
                </Chip>
              )}
              {prog.goal && (
                <Chip variant="accent">{prog.goal.toUpperCase()}</Chip>
              )}
              {prog.is_active && <Chip variant="good">{t("active")}</Chip>}
            </div>
          </div>
          <div className="flex gap-2">
            {!prog.is_active && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActivate(prog.id)}
                disabled={saving}
              >
                <Zap size={12} /> {t("activate")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              disabled={saving}
            >
              {t("duplicate")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen((v) => !v)}
            >
              {t("settings")}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setDeleteTarget({
                  type: "program",
                  id: prog.id,
                  label: prog.name,
                })
              }
              className="text-danger hover:text-danger"
              aria-label={tCommon("delete")}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Program settings (goal / weeks / coach note) */}
        {settingsOpen && (
          <form
            onSubmit={handleSaveSettings}
            className="mt-4 rounded-md border border-lime/40 bg-surface-1 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1 block text-xs text-ink-3">
                  {t("programNameLabel")}
                </Label>
                <Input name="name" defaultValue={prog.name} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-ink-3">
                  {t("goalLabel")}
                </Label>
                <Input
                  name="goal"
                  defaultValue={prog.goal ?? ""}
                  placeholder={t("goalPlaceholder")}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-ink-3">
                  {t("totalWeeksLabel")}
                </Label>
                <Input
                  name="total_weeks"
                  type="number"
                  min={1}
                  defaultValue={prog.total_weeks ?? ""}
                  placeholder="8"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-ink-3">
                {t("coachNoteLabel")}
              </Label>
              <Textarea
                name="coach_note"
                rows={2}
                defaultValue={prog.coach_note ?? ""}
                placeholder={t("coachNotePlaceholder")}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {tCommon("save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={14} /> {tCommon("cancel")}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Body: 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* Left column: days */}
        <div className="px-6 py-6 sm:px-10">
          {prog.program_days.length === 0 ? (
            <p className="py-8 text-center text-ink-3">
              {t("noExercisesInDay")}
            </p>
          ) : (
            <div className="space-y-5">
              {prog.program_days.map((day, dayIdx) => {
                const code = dayCodeFromLabel(day.day_label, dayIdx);
                const exerciseCount = day.program_exercises.length;
                const estMin = Math.max(20, exerciseCount * 8 + 20);
                return (
                  <div
                    key={day.id}
                    className="overflow-hidden rounded-md border border-border bg-surface-1"
                  >
                    {/* Day header */}
                    <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                      <span
                        className="flex size-7 items-center justify-center rounded-[6px] font-mono text-[13px] font-bold text-bg"
                        style={{ background: "var(--lime)" }}
                      >
                        {code}
                      </span>
                      <span className="flex-1 truncate text-[16px] font-semibold tracking-[0.05em] text-ink">
                        {day.day_label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                        {exerciseCount} EXERCISES · ~{estMin} MIN
                      </span>
                    </div>

                    {/* Exercise rows */}
                    {day.program_exercises.map((pe, idx) => {
                      const isLast = idx === exerciseCount - 1;
                      return (
                        <div
                          key={pe.id}
                          className={`grid items-center gap-2 px-5 py-3 ${
                            isLast ? "" : "border-b border-border"
                          }`}
                          style={{
                            gridTemplateColumns:
                              "32px 2fr 1fr 0.7fr 0.4fr",
                          }}
                        >
                          <span className="font-mono text-[11px] text-ink-3">
                            {idx + 1}.
                          </span>
                          <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                            {pe.exercises?.name ?? t("unknown")}
                          </span>
                          <span className="font-mono text-[12px] text-ink-2">
                            {pe.sets && pe.reps
                              ? `${pe.sets}×${pe.reps}`
                              : pe.sets
                                ? `${pe.sets}s`
                                : (pe.reps ?? "—")}
                          </span>
                          <span className="justify-self-start">
                            {pe.rpe ? (
                              <span className="inline-flex items-center rounded-[3px] bg-surface-2 px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-lime">
                                RPE {pe.rpe}
                              </span>
                            ) : null}
                          </span>
                          <div className="flex items-center justify-end gap-0.5 text-ink-3">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                handleReorder(pe.id, day.id, "up")
                              }
                              disabled={idx === 0}
                              className="opacity-60 hover:opacity-100"
                              aria-label="Move up"
                            >
                              <ChevronUp size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                handleReorder(pe.id, day.id, "down")
                              }
                              disabled={idx === exerciseCount - 1}
                              className="opacity-60 hover:opacity-100"
                              aria-label="Move down"
                            >
                              <ChevronDown size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "exercise",
                                  id: pe.id,
                                  label:
                                    pe.exercises?.name ?? t("unknown"),
                                })
                              }
                              className="text-danger hover:text-danger"
                              aria-label={tCommon("delete")}
                            >
                              <MoreVertical size={12} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Footer: Add exercise / delete day */}
                    {addingExerciseFor === day.id ? (
                      <AddExerciseForm
                        dayId={day.id}
                        allExercises={allExercises}
                        onDone={() => {
                          setAddingExerciseFor(null);
                          router.refresh();
                        }}
                        onCancel={() => setAddingExerciseFor(null)}
                      />
                    ) : (
                      <div className="flex border-t border-dashed border-border">
                        <button
                          type="button"
                          onClick={() => setAddingExerciseFor(day.id)}
                          className="flex-1 px-5 py-3 text-center font-mono text-[12px] uppercase tracking-[0.08em] text-ink-3 transition-colors hover:bg-surface-2/30 hover:text-ink"
                        >
                          + {t("addExercise")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: "day",
                              id: day.id,
                              label: day.day_label,
                            })
                          }
                          className="border-l border-dashed border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-danger transition-colors hover:bg-surface-2/30"
                          aria-label={t("deleteDay")}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add day */}
          {addingDayFor === prog.id ? (
            <div className="mt-5 flex flex-col gap-2 rounded-md border border-border bg-surface-1 p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label className="mb-1 text-xs">{t("dayNameLabel")}</Label>
                <Input
                  value={newDayLabel}
                  onChange={(e) => setNewDayLabel(e.target.value)}
                  placeholder={t("dayNamePlaceholder")}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDay(prog.id);
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAddDay(prog.id)}
                  disabled={saving}
                >
                  {t("addDay")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAddingDayFor(null);
                    setNewDayLabel("");
                  }}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => setAddingDayFor(prog.id)}
            >
              <Plus size={14} /> {t("addDay")}
            </Button>
          )}

          {/* Switch program */}
          {programs.length > 1 && (
            <div className="mt-8 border-t border-border pt-5">
              <MicroLabel className="block mb-2">OTHER PROGRAMS</MicroLabel>
              <div className="flex flex-wrap gap-2">
                {programs
                  .filter((p) => p.id !== prog.id)
                  .map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      size="xs"
                      onClick={() => handleActivate(p.id)}
                    >
                      {p.name}
                    </Button>
                  ))}
                {!showNewProgram && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowNewProgram(true)}
                  >
                    <Plus size={12} /> {t("newProgram")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {showNewProgram && (
            <form
              onSubmit={handleCreateProgram}
              className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-surface-1 p-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Label className="mb-1 text-xs">
                  {t("programNameLabel")}
                </Label>
                <Input
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder={t("programNamePlaceholder")}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {t("createProgram")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewProgram(false)}
                >
                  <X size={14} />
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Right rail */}
        <aside className="border-t border-border bg-surface-1 p-6 lg:border-l lg:border-t-0">
          {/* DAYS — the program's actual training days */}
          <MicroLabel className="block">{t("daysLabel")}</MicroLabel>
          {prog.program_days.length > 0 ? (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {prog.program_days.map((day, i) => (
                <div
                  key={day.id}
                  className="flex items-center gap-2.5 rounded-[6px] border border-border bg-surface-2 px-2.5 py-2"
                >
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-[5px] font-mono text-[11px] font-bold text-bg"
                    style={{ background: "var(--lime)" }}
                  >
                    {dayCodeFromLabel(day.day_label, i)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                    {day.day_label}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                    {t("exerciseCount", {
                      count: day.program_exercises.length,
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2.5 text-[12px] text-ink-3">
              {t("noDaysYet")}
            </p>
          )}

          {/* VOLUME / GROUP */}
          {volumeByGroup.length > 0 && (
            <>
              <MicroLabel className="mt-7 mb-3 block">
                VOLUME / GROUP
              </MicroLabel>
              <div className="space-y-2.5">
                {volumeByGroup.map((v) => {
                  const pct = Math.min(
                    100,
                    Math.round((v.sets / maxVolume) * 100)
                  );
                  return (
                    <div key={v.name}>
                      <div className="mb-1 flex justify-between text-[12px]">
                        <span className="capitalize text-ink-2">
                          {v.name}
                        </span>
                        <span className="font-mono text-ink">
                          {v.sets} sets
                        </span>
                      </div>
                      <div className="h-1 rounded-sm bg-border">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${pct}%`,
                            background: "var(--lime)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* COACH NOTE — real, editable via Settings */}
          {prog.coach_note ? (
            <>
              <MicroLabel className="mt-7 mb-2 block">
                {t("coachNoteLabel")}
              </MicroLabel>
              <div className="rounded-md border border-border bg-surface-2 p-3 text-[12px] leading-relaxed text-ink-2 whitespace-pre-wrap">
                {prog.coach_note}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="mt-7 block w-full rounded-md border border-dashed border-hairline-2 bg-surface-2/30 p-3 text-left text-[12px] text-ink-3 transition-colors hover:border-lime/40"
            >
              + {t("addCoachNote")}
            </button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === "program"
            ? t("confirmDeleteProgram", { name: deleteTarget?.label ?? "" })
            : deleteTarget?.type === "day"
              ? t("confirmDeleteDay", { name: deleteTarget?.label ?? "" })
              : tCommon("delete")
        }
        description={
          deleteTarget?.type === "program"
            ? t("confirmDeleteProgramDesc")
            : deleteTarget?.type === "day"
              ? t("confirmDeleteDayDesc")
              : (deleteTarget?.label ?? "")
        }
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === "program")
            handleDeleteProgram(deleteTarget.id);
          else if (deleteTarget.type === "day")
            handleDeleteDay(deleteTarget.id);
          else handleRemoveExercise(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Add Exercise to Day Form ──────────────────────────────

function AddExerciseForm({
  dayId,
  allExercises,
  onDone,
  onCancel,
}: {
  dayId: string;
  allExercises: Exercise[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("coach.program");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [restSec, setRestSec] = useState("");
  const [rpe, setRpe] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () =>
      allExercises.filter((ex) =>
        ex.name.toLowerCase().includes(search.toLowerCase())
      ),
    [allExercises, search]
  );

  async function handleSubmit() {
    if (!selectedId) {
      toast.error(t("pickExerciseError"));
      return;
    }
    setSaving(true);
    const res = await addProgramExercise(
      dayId,
      selectedId,
      sets ? parseInt(sets) : null,
      reps || null,
      restSec ? parseInt(restSec) : null,
      rpe ? parseInt(rpe) : null
    );
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success(t("exerciseAddedToast"));
    onDone();
  }

  return (
    <div className="border-t border-dashed border-border bg-surface-2/30 p-4">
      {!selectedId ? (
        <div>
          <Input
            placeholder={t("searchExercises")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="mt-2 max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-2 text-sm text-ink-3">
                {t("noSearchResults")}
              </p>
            ) : (
              filtered.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedId(ex.id)}
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2"
                >
                  {ex.name}
                </button>
              ))
            )}
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="mt-2"
            onClick={onCancel}
          >
            <X size={12} /> {tCommon("cancel")}
          </Button>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-ink">
              {allExercises.find((e) => e.id === selectedId)?.name}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedId("")}
            >
              <X size={10} />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <Label className="mb-1 text-xs">{t("setsLabel")}</Label>
              <Input
                type="number"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                placeholder="3"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs">{t("repsLabel")}</Label>
              <Input
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="8-12"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs">{t("restLabel")}</Label>
              <Input
                type="number"
                value={restSec}
                onChange={(e) => setRestSec(e.target.value)}
                placeholder="90"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs">{t("rpeLabel")}</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                placeholder="7"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {t("saveExercise")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X size={14} /> {tCommon("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
