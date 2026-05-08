"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import {
  createProgram,
  deleteProgram,
  activateProgram,
  addProgramDay,
  deleteProgramDay,
  addProgramExercise,
  removeProgramExercise,
  reorderProgramExercise,
} from "@/actions/programs";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  X,
  Loader2,
  Zap,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Exercise = { id: string; name: string };
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
  program_days: ProgramDay[];
};

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
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [addingDayFor, setAddingDayFor] = useState<string | null>(null);
  const [newDayLabel, setNewDayLabel] = useState("");
  const [addingExerciseFor, setAddingExerciseFor] = useState<string | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "program" | "day";
    id: string;
    label: string;
  } | null>(null);

  function toggleDay(dayId: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

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
            <MicroLabel>{clientName.toUpperCase()} · PROGRAM</MicroLabel>
            <h1 className="mt-1 text-[28px] sm:text-[32px] font-semibold tracking-tight text-ink">
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

      {/* New program form */}
      {showNewProgram && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <form
              onSubmit={handleCreateProgram}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Label className="mb-1 text-xs">{t("programNameLabel")}</Label>
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
          </CardContent>
        </Card>
      )}

      {/* Programs list */}
      {programs.length === 0 && !showNewProgram ? (
        <p className="py-8 text-center text-ink-3">
          {t("emptyPrograms")}
        </p>
      ) : (
        <div className="space-y-6">
          {programs.map((prog) => (
            <Card
              key={prog.id}
              className={prog.is_active ? "border-good/30" : ""}
            >
              <CardContent className="p-3 sm:p-4">
                {/* Program header */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Dumbbell
                      size={16}
                      className="hidden text-ink-2 sm:block"
                    />
                    <h2 className="text-lg font-semibold text-ink tracking-tight">
                      {prog.name}
                    </h2>
                    {prog.program_days.length > 0 && (
                      <Chip variant="ghost" size="sm">
                        {prog.program_days.length}D/WEEK
                      </Chip>
                    )}
                    {prog.is_active && (
                      <Chip variant="good" size="sm">
                        ACTIVE
                      </Chip>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!prog.is_active && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleActivate(prog.id)}
                        disabled={saving}
                      >
                        <Zap size={12} /> {t("activate")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setDeleteTarget({ type: "program", id: prog.id, label: prog.name })
                      }
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>

                {/* Schedule strip — 7-day grid showing days assigned */}
                {prog.program_days.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-7 gap-1.5">
                      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
                        // Map: assign program days sequentially across weekdays as a visual default
                        // (M=0, T=1, W=2, T=3, F=4 typically used for 5-day; rest for shorter)
                        const isAssigned =
                          i < prog.program_days.length &&
                          // simple heuristic: spread N days across the week
                          [0, 2, 4, 1, 3, 5, 6].slice(0, prog.program_days.length).includes(i);
                        const dayIdx = isAssigned
                          ? [0, 2, 4, 1, 3, 5, 6]
                              .slice(0, prog.program_days.length)
                              .indexOf(i)
                          : -1;
                        const dayLabel = dayIdx >= 0
                          ? String.fromCharCode(65 + dayIdx)
                          : "";
                        return (
                          <div
                            key={i}
                            className={`aspect-square rounded-md flex flex-col items-center justify-center border ${
                              isAssigned
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-surface-2/50 border-border text-ink-3"
                            }`}
                          >
                            <span className="font-mono text-[9px] uppercase tracking-[0.08em] opacity-70">
                              {d}
                            </span>
                            {isAssigned && (
                              <span className="font-mono text-[12px] font-bold leading-none mt-0.5">
                                {dayLabel}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Days */}
                <div className="space-y-2">
                  {prog.program_days.map((day, dayIdx) => (
                    <div
                      key={day.id}
                      className="rounded-lg border border-border bg-surface/30 overflow-hidden"
                    >
                      {/* Day header */}
                      <button
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2/30"
                      >
                        <span
                          className="flex size-7 items-center justify-center rounded-md font-mono text-[12px] font-bold text-bg"
                          style={{ background: "var(--lime)" }}
                        >
                          {String.fromCharCode(65 + dayIdx)}
                        </span>
                        <span className="text-sm font-semibold text-ink sm:text-base flex-1 truncate">
                          {day.day_label}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 shrink-0">
                          {day.program_exercises.length} VJ
                        </span>
                        <ChevronDown
                          size={14}
                          className={`text-ink-3 transition-transform ${
                            expandedDays.has(day.id) ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Day content (expanded) */}
                      {expandedDays.has(day.id) && (
                        <div className="border-t border-border px-2 py-2 sm:px-3">
                          {day.program_exercises.length === 0 ? (
                            <p className="py-2 text-sm text-ink-3">
                              {t("noExercisesInDay")}
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {day.program_exercises.map((pe, idx) => (
                                <div
                                  key={pe.id}
                                  className="flex items-center gap-1.5 rounded px-1.5 py-1.5 text-sm hover:bg-surface-2/30 sm:gap-2 sm:px-2"
                                >
                                  <span className="w-4 shrink-0 text-center text-xs text-ink-3 sm:w-5">
                                    {idx + 1}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-medium text-gray-200">
                                    {pe.exercises?.name ?? t("unknown")}
                                  </span>
                                  <span className="shrink-0 text-xs text-ink-2 sm:text-sm">
                                    {pe.sets && pe.reps
                                      ? `${pe.sets}×${pe.reps}`
                                      : pe.sets
                                        ? `${pe.sets}s`
                                        : pe.reps ?? "—"}
                                  </span>
                                  {pe.rest_sec && (
                                    <span className="hidden text-xs text-ink-3 sm:inline">
                                      {pe.rest_sec}s
                                    </span>
                                  )}
                                  {pe.rpe && (
                                    <span className="hidden text-xs text-primary sm:inline">
                                      RPE {pe.rpe}
                                    </span>
                                  )}
                                  <div className="flex shrink-0 gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() =>
                                        handleReorder(pe.id, day.id, "up")
                                      }
                                      disabled={idx === 0}
                                      className="opacity-50 hover:opacity-100"
                                    >
                                      <ChevronUp size={10} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() =>
                                        handleReorder(pe.id, day.id, "down")
                                      }
                                      disabled={
                                        idx ===
                                        day.program_exercises.length - 1
                                      }
                                      className="opacity-50 hover:opacity-100"
                                    >
                                      <ChevronDown size={10} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() =>
                                        handleRemoveExercise(pe.id)
                                      }
                                      className="text-danger hover:text-red-300"
                                    >
                                      <Trash2 size={10} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add exercise to day */}
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
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setAddingExerciseFor(day.id)}
                              >
                                <Plus size={12} /> {t("addExercise")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() =>
                                  setDeleteTarget({ type: "day", id: day.id, label: day.day_label })
                                }
                                className="text-danger hover:text-red-300"
                              >
                                <Trash2 size={12} /> {t("deleteDay")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add day */}
                {addingDayFor === prog.id ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
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
                    className="mt-3"
                    onClick={() => setAddingDayFor(prog.id)}
                  >
                    <Plus size={14} /> {t("addDay")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === "program"
            ? t("confirmDeleteProgram", { name: deleteTarget?.label ?? "" })
            : t("confirmDeleteDay", { name: deleteTarget?.label ?? "" })
        }
        description={
          deleteTarget?.type === "program"
            ? t("confirmDeleteProgramDesc")
            : t("confirmDeleteDayDesc")
        }
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === "program") handleDeleteProgram(deleteTarget.id);
          else handleDeleteDay(deleteTarget.id);
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

  const filtered = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
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
    <div className="mt-2 rounded-lg border border-border bg-surface-2/50 p-3">
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
              <p className="py-2 text-sm text-ink-3">{t("noSearchResults")}</p>
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
            <span className="text-sm font-medium text-gray-200">
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
