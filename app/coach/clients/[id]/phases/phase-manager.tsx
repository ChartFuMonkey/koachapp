"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const PHASE_TYPES = [
  { value: "", label: "—" },
  { value: "fat_loss", label: "Gubitak masti" },
  { value: "muscle_gain", label: "Dobivanje mišića" },
  { value: "maintenance", label: "Održavanje" },
  { value: "strength", label: "Snaga" },
  { value: "rest", label: "Odmor" },
  { value: "other", label: "Ostalo" },
];

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

function formatDate(d: string) {
  return new Date(d + "T00:00").toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

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

    toast.success("Faza kreirana");
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

    toast.success("Faza aktivirana");
    router.refresh();
  }

  async function handleDelete(phaseId: string, name: string) {
    if (!confirm(`Obriši fazu "${name}"?`)) return;
    const res = await deletePhase(phaseId);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success("Faza obrisana");
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
          <h1 className="text-xl font-bold sm:text-2xl">Phase Manager</h1>
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
              className="shrink-0"
            >
              <Plus size={14} /> Dodaj fazu
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
                  <Label className="mb-1 text-xs">Naziv faze *</Label>
                  <Input
                    name="name"
                    required
                    placeholder='e.g. "Cut — Faza 1"'
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="mb-1 text-xs">Tip</Label>
                  <select name="type" className={selectClass}>
                    {PHASE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 text-xs">Target kcal</Label>
                  <Input name="target_kcal" type="number" placeholder="2200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-xs">Početak *</Label>
                  <Input name="start_date" type="date" required />
                </div>
                <div>
                  <Label className="mb-1 text-xs">Kraj</Label>
                  <Input name="end_date" type="date" />
                </div>
              </div>
              <div>
                <Label className="mb-1 text-xs">Bilješke</Label>
                <Textarea name="notes" rows={2} placeholder="Napomene..." />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Kreiraj
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                >
                  <X size={14} /> Odustani
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {phases.length === 0 && !showAddForm ? (
        <p className="py-8 text-center text-gray-500">
          Nema faza. Dodajte prvu fazu za ovog klijenta.
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
                            {PHASE_TYPES.find((t) => t.value === phase.type)
                              ?.label ?? phase.type}
                          </Badge>
                        )}
                        {phase.is_active && (
                          <Badge className="border-green-500/30 bg-green-500/20 text-xs text-green-400">
                            Aktivan
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
                          <Zap size={12} /> Aktiviraj
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(phase.id, phase.name)}
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
    </div>
  );
}
