"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createExercise,
  updateExercise,
  deleteExercise,
} from "@/actions/exercises";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Video,
  Loader2,
} from "lucide-react";
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus size={14} /> {t("addExercise")}
          </Button>
        )}
      </div>

      {showAddForm && (
        <ExerciseForm
          onSubmit={handleCreate}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {initialExercises.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {t("emptyList")}
        </p>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-800 md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    {t("colName")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    {t("colMuscleGroup")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    {t("colEquipment")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    {t("colDifficulty")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-400">
                    {t("colVideo")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-400">
                    {t("colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialExercises.map((ex) =>
                  editingId === ex.id ? (
                    <tr key={ex.id}>
                      <td colSpan={6} className="p-0">
                        <ExerciseForm
                          exercise={ex}
                          onSubmit={(e) => handleUpdate(e, ex.id)}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={ex.id}
                      className="border-b border-gray-800/50 last:border-0"
                    >
                      <td className="px-3 py-2 font-medium text-gray-200">
                        {ex.name}
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {ex.muscle_group || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {ex.equipment || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {ex.difficulty ? difficultyLabel(ex.difficulty) : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {ex.video_url ? (
                          <Video
                            size={14}
                            className="mx-auto text-green-400"
                          />
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setEditingId(ex.id)}
                          >
                            <Pencil size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteTarget({ id: ex.id, name: ex.name })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="space-y-3 md:hidden">
            {initialExercises.map((ex) =>
              editingId === ex.id ? (
                <ExerciseForm
                  key={ex.id}
                  exercise={ex}
                  onSubmit={(e) => handleUpdate(e, ex.id)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <Card key={ex.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-200">
                            {ex.name}
                          </h3>
                          {ex.video_url && (
                            <Video size={12} className="shrink-0 text-green-400" />
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {ex.muscle_group && (
                            <Badge variant="secondary" className="text-xs">
                              {ex.muscle_group}
                            </Badge>
                          )}
                          {ex.equipment && (
                            <Badge variant="outline" className="text-xs">
                              {ex.equipment}
                            </Badge>
                          )}
                          {ex.difficulty && (
                            <Badge variant="outline" className="text-xs">
                              {difficultyLabel(ex.difficulty)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEditingId(ex.id)}
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget({ id: ex.id, name: ex.name })}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </>
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
