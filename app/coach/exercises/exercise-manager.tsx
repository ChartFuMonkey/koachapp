"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import {
  createExercise,
  updateExercise,
  deleteExercise,
} from "@/actions/exercises";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/confirm-dialog";
import { translateError } from "@/lib/translate-error";

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  difficulty: string | null;
  notes: string | null;
  video_url: string | null;
};

const DIFFICULTY_VALUES = ["", "beginner", "intermediate", "advanced"] as const;

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// Top-level filter buttons — match the prototype's fixed categories.
const FILTERS = ["All", "Legs", "Back", "Chest", "Shoulders", "Arms", "Core"] as const;
type Filter = (typeof FILTERS)[number];

// Deterministic pseudo-random bar height (0..100) — stable per (card, bar) so SSR/CSR agree.
function barHeight(i: number, j: number) {
  return 20 + Math.sin(i * 1.3 + j) * 50 + 50;
}

export default function ExerciseManager({
  initialExercises,
}: {
  initialExercises: Exercise[];
}) {
  const router = useRouter();
  const t = useTranslations("coach.exercises");
  const tErr = useTranslations("coach.exercises.errors");
  const tCommonErr = useTranslations("errors");
  const tCommon = useTranslations("common");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");

  function difficultyLabel(value: string) {
    switch (value) {
      case "":
        return t("difficultyNone");
      case "beginner":
        return t("difficultyBeginner");
      case "intermediate":
        return t("difficultyIntermediate");
      case "advanced":
        return t("difficultyAdvanced");
      default:
        return value;
    }
  }

  const visibleExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialExercises.filter((ex) => {
      if (activeFilter !== "All") {
        const mg = (ex.muscle_group || "").toLowerCase();
        if (!mg.includes(activeFilter.toLowerCase())) return false;
      }
      if (!q) return true;
      const hay = [ex.name, ex.muscle_group, ex.equipment, ex.difficulty, ex.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initialExercises, activeFilter, search]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const res = await createExercise(formData);
    setSaving(false);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("exerciseAddedToast"));
    setShowAddForm(false);
    router.refresh();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const res = await updateExercise(id, formData);
    setSaving(false);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("exerciseUpdatedToast"));
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await deleteExercise(id);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("exerciseDeletedToast"));
    setDeleteTarget(null);
    router.refresh();
  }

  function ExerciseForm({
    exercise,
    onSubmit,
    onCancel,
  }: {
    exercise?: Exercise;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
  }) {
    return (
      <form onSubmit={onSubmit}>
        <Card className="mb-4">
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <Label className="mb-1 text-xs">{t("nameLabel")} *</Label>
                <Input
                  name="name"
                  required
                  defaultValue={exercise?.name ?? ""}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">{t("muscleGroupLabel")}</Label>
                <Input
                  name="muscle_group"
                  defaultValue={exercise?.muscle_group ?? ""}
                  placeholder={t("muscleGroupPlaceholder")}
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">{t("equipmentLabel")}</Label>
                <Input
                  name="equipment"
                  defaultValue={exercise?.equipment ?? ""}
                  placeholder={t("equipmentPlaceholder")}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="mb-1 text-xs">{t("difficultyLabel")}</Label>
                <select
                  name="difficulty"
                  className={selectClass}
                  defaultValue={exercise?.difficulty ?? ""}
                >
                  {DIFFICULTY_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {difficultyLabel(v)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1 lg:col-span-3">
                <Label className="mb-1 text-xs">{t("videoUrlLabel")}</Label>
                <Input
                  name="video_url"
                  type="url"
                  defaultValue={exercise?.video_url ?? ""}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 text-xs">{t("notesLabel")}</Label>
              <Textarea
                name="notes"
                rows={2}
                defaultValue={exercise?.notes ?? ""}
                placeholder={t("notesPlaceholder")}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {exercise ? t("saveLabel") : t("addExerciseSubmit")}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel}>
                <X size={14} /> {tCommon("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <MicroLabel>
            ~/EXERCISES — {initialExercises.length} ENTRIES
          </MicroLabel>
          <h1 className="mt-2 text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] leading-[1.05] text-ink">
            {t("title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Import CSV
          </Button>
          {!showAddForm && (
            <Button
              size="sm"
              onClick={() => {
                setEditingId(null);
                setShowAddForm(true);
              }}
            >
              + {t("addExercise")}
            </Button>
          )}
        </div>
      </div>

      {/* Inline create form */}
      {showAddForm && (
        <div className="mt-6">
          <ExerciseForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Filter chip row + search */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={
                isActive
                  ? "inline-flex h-5 items-center rounded-[3px] border border-ink bg-ink px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-bg whitespace-nowrap leading-[1.4]"
                  : "inline-flex h-5 items-center rounded-[3px] border border-hairline-2 bg-surface-2 px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-ink-2 whitespace-nowrap leading-[1.4] hover:text-ink"
              }
            >
              {f}
            </button>
          );
        })}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search…"
          className="ml-auto w-full max-w-[220px] rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-ink-3 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {/* Cards grid */}
      {visibleExercises.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-3">
          {initialExercises.length === 0 ? t("emptyList") : tCommon("loading")}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleExercises.map((ex, i) => {
            if (editingId === ex.id) {
              return (
                <div key={ex.id} className="sm:col-span-2 lg:col-span-3">
                  <ExerciseForm
                    exercise={ex}
                    onSubmit={(e) => handleUpdate(e, ex.id)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              );
            }

            const indexLabel = String(i + 1).padStart(3, "0");
            const usedCount = 0; // TODO: wire to real workout usage count

            return (
              <div
                key={ex.id}
                className="group/card rounded-lg border border-border bg-surface p-4 transition-colors hover:border-hairline-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <MicroLabel className="text-[9px]">
                      {indexLabel}
                      {ex.equipment ? ` · ${ex.equipment}` : ""}
                    </MicroLabel>
                    <div className="mt-1.5 text-base font-semibold text-ink leading-tight truncate">
                      {ex.name}
                    </div>
                    {ex.difficulty && (
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                        {difficultyLabel(ex.difficulty)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {ex.muscle_group && (
                      <Chip variant="neutral">{ex.muscle_group}</Chip>
                    )}
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingId(ex.id);
                        }}
                        aria-label={tCommon("edit")}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          setDeleteTarget({ id: ex.id, name: ex.name })
                        }
                        className="text-danger hover:text-red-300"
                        aria-label={tCommon("delete")}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex items-baseline gap-3">
                  <div>
                    <MicroLabel className="text-[9px]">USED</MicroLabel>
                    <div className="font-mono text-lg font-semibold text-ink tabular-nums">
                      {usedCount}×
                    </div>
                  </div>
                  <div className="flex h-5 flex-1 items-end gap-0.5">
                    {Array.from({ length: 12 }).map((_, j) => {
                      const h = barHeight(i, j);
                      return (
                        <div
                          key={j}
                          className={`flex-1 rounded-[1px] ${
                            j > 8 ? "bg-lime" : "bg-hairline-2"
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
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
