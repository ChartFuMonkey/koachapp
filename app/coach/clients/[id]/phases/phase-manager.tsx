"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createPhase, activatePhase, deletePhase } from "@/actions/phases";
import {
  Plus,
  Trash2,
  ChevronLeft,
  X,
  Loader2,
  Zap,
  Calendar,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";

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

const TYPE_BADGE_COLORS: Record<string, string> = {
  fat_loss: "border-red-500/30 bg-red-500/20 text-red-400",
  muscle_gain: "border-green-500/30 bg-green-500/20 text-green-400",
  maintenance: "border-blue-500/30 bg-blue-500/20 text-blue-400",
  strength: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400",
  rest: "border-gray-500/30 bg-gray-500/20 text-gray-400",
  other: "border-purple-500/30 bg-purple-500/20 text-purple-400",
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

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
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  function formatDate(d: string) {
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
      toast.error(res.error);
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
      toast.error(res.error);
      return;
    }

    toast.success(t("phaseActivatedToast"));
    router.refresh();
  }

  async function handleDelete(phaseId: string) {
    const res = await deletePhase(phaseId);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success(t("phaseDeletedToast"));
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/coach/clients/${clientId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
        >
          <ChevronLeft size={14} /> {clientName}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">{t("title")}</h1>
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
              className="shrink-0"
            >
              <Plus size={14} /> {t("addPhase")}
            </Button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardContent className="p-3 sm:p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="mb-1 text-xs">{t("nameLabel")} *</Label>
                  <Input
                    name="name"
                    required
                    placeholder={t("namePlaceholder")}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="mb-1 text-xs">{t("typeLabel")}</Label>
                  <select name="type" className={selectClass}>
                    {PHASE_TYPE_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {typeLabel(v)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 text-xs">{t("targetKcalLabel")}</Label>
                  <Input name="target_kcal" type="number" placeholder="2200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-xs">{t("startDateLabel")} *</Label>
                  <Input name="start_date" type="date" required />
                </div>
                <div>
                  <Label className="mb-1 text-xs">{t("endDateLabel")}</Label>
                  <Input name="end_date" type="date" />
                </div>
              </div>
              <div>
                <Label className="mb-1 text-xs">{t("notesLabel")}</Label>
                <Textarea name="notes" rows={2} placeholder={t("notesPlaceholder")} />
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
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {phases.length === 0 && !showAddForm ? (
        <p className="py-8 text-center text-gray-500">
          {t("emptyPhases")}
        </p>
      ) : (
        <div className="relative space-y-0">
          {phases.map((phase, idx) => (
            <div key={phase.id} className="relative flex gap-3 sm:gap-4">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`mt-1 size-3 shrink-0 rounded-full border-2 ${
                    phase.is_active
                      ? "border-green-400 bg-green-400"
                      : "border-gray-600 bg-gray-900"
                  }`}
                />
                {idx < phases.length - 1 && (
                  <div className="w-px flex-1 bg-gray-800" />
                )}
              </div>

              {/* Phase card */}
              <Card
                className={`mb-3 min-w-0 flex-1 sm:mb-4 ${
                  phase.is_active ? "border-green-500/30" : ""
                }`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-semibold text-gray-200">
                          {phase.name}
                        </h3>
                        {phase.type && (
                          <Badge
                            className={`text-xs ${
                              TYPE_BADGE_COLORS[phase.type] ??
                              TYPE_BADGE_COLORS.other
                            }`}
                          >
                            {typeLabel(phase.type)}
                          </Badge>
                        )}
                        {phase.is_active && (
                          <Badge className="border-green-500/30 bg-green-500/20 text-xs text-green-400">
                            {t("active")}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 sm:text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(phase.start_date)}
                          {phase.end_date &&
                            ` — ${formatDate(phase.end_date)}`}
                        </span>
                        {phase.target_kcal != null && (
                          <span className="inline-flex items-center gap-1">
                            <Flame size={12} />
                            {phase.target_kcal} kcal
                          </span>
                        )}
                      </div>

                      {phase.notes && (
                        <p className="mt-2 text-xs text-gray-500 sm:text-sm">
                          {phase.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {!phase.is_active && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActivate(phase.id)}
                          disabled={saving}
                        >
                          <Zap size={12} /> {t("activate")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteTarget({ id: phase.id, name: phase.name })}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
