"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  createMealPlan,
  deleteMealPlan,
  activateMealPlan,
  setMealPlanEntry,
  removeMealPlanEntry,
} from "@/actions/meal-plans";
import {
  Plus,
  Trash2,
  ChevronLeft,
  X,
  Loader2,
  Zap,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY_LABELS = [
  "Ponedjeljak",
  "Utorak",
  "Srijeda",
  "Četvrtak",
  "Petak",
  "Subota",
  "Nedjelja",
];

type MealRef = {
  id: string;
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
};

type PlanEntry = {
  id: string;
  day_of_week: number;
  slot_number: number;
  meals: { id: string; name: string } | null;
};

type MealPlan = {
  id: string;
  name: string;
  is_active: boolean;
  meal_plan_entries: PlanEntry[];
};

export default function MealPlanBuilder({
  clientId,
  clientName,
  plans,
  allMeals,
}: {
  clientId: string;
  clientName: string;
  plans: MealPlan[];
  allMeals: MealRef[];
}) {
  const router = useRouter();
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [addingSlotFor, setAddingSlotFor] = useState<string | null>(null);
  const [selectedMealId, setSelectedMealId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  function toggleDay(key: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await createMealPlan(clientId, newPlanName);
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success("Plan kreiran");
    setNewPlanName("");
    setShowNewPlan(false);
    router.refresh();
  }

  async function handleDeletePlan(id: string) {
    const res = await deleteMealPlan(id);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Plan obrisan");
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleActivate(planId: string) {
    setSaving(true);
    const res = await activateMealPlan(clientId, planId);
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Plan aktiviran");
    router.refresh();
  }

  async function handleAddSlot(
    planId: string,
    dayOfWeek: number,
    existingEntries: PlanEntry[]
  ) {
    if (!selectedMealId) return;

    // Find next slot number for this day
    const dayEntries = existingEntries.filter((e) => e.day_of_week === dayOfWeek);
    const nextSlot =
      dayEntries.length > 0
        ? Math.max(...dayEntries.map((e) => e.slot_number)) + 1
        : 1;

    setSaving(true);
    const res = await setMealPlanEntry(planId, dayOfWeek, nextSlot, selectedMealId);
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success("Obrok dodan");
    setAddingSlotFor(null);
    setSelectedMealId("");
    router.refresh();
  }

  async function handleRemoveEntry(entryId: string) {
    const res = await removeMealPlanEntry(entryId);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  function getDayMacros(entries: PlanEntry[], dayOfWeek: number) {
    const dayEntries = entries.filter((e) => e.day_of_week === dayOfWeek);
    let cal = 0, protein = 0, carbs = 0, fat = 0;
    for (const entry of dayEntries) {
      const meal = allMeals.find((m) => m.id === entry.meals?.id);
      if (meal) {
        cal += meal.cal;
        protein += meal.protein;
        carbs += meal.carbs;
        fat += meal.fat;
      }
    }
    return { cal, protein, carbs, fat };
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/coach/clients/${clientId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ChevronLeft size={14} /> {clientName}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Plan prehrane</h1>
          {!showNewPlan && (
            <Button onClick={() => setShowNewPlan(true)}>
              <Plus size={14} /> Novi plan
            </Button>
          )}
        </div>
      </div>

      {/* New plan form */}
      {showNewPlan && (
        <form onSubmit={handleCreatePlan}>
          <Card className="mb-4">
            <CardContent className="flex items-end gap-3 p-4">
              <div className="flex-1">
                <Label className="mb-1 text-xs">Naziv plana *</Label>
                <Input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="npr. Cut plan"
                  required
                />
              </div>
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
                onClick={() => setShowNewPlan(false)}
              >
                <X size={14} />
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-center">
            <UtensilsCrossed className="mb-3 size-10 text-gray-500" />
            <p className="text-lg font-medium">Nema planova prehrane</p>
            <p className="mt-1 text-sm text-gray-400">
              Kreirajte prvi plan iznad
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="p-4">
                {/* Plan header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    {plan.is_active ? (
                      <Badge className="bg-green-600 text-white">Aktivan</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(plan.id)}
                      >
                        <Zap size={12} /> Aktiviraj
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      setDeleteTarget({ id: plan.id, name: plan.name })
                    }
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>

                {/* 7-day grid */}
                <div className="space-y-2">
                  {DAY_LABELS.map((dayLabel, idx) => {
                    const dayOfWeek = idx + 1;
                    const dayKey = `${plan.id}-${dayOfWeek}`;
                    const isExpanded = expandedDays.has(dayKey);
                    const dayEntries = plan.meal_plan_entries
                      .filter((e) => e.day_of_week === dayOfWeek)
                      .sort((a, b) => a.slot_number - b.slot_number);
                    const macros = getDayMacros(
                      plan.meal_plan_entries,
                      dayOfWeek
                    );

                    return (
                      <div
                        key={dayKey}
                        className="rounded-lg border border-gray-800"
                      >
                        <div
                          className="flex cursor-pointer items-center justify-between p-3"
                          onClick={() => toggleDay(dayKey)}
                        >
                          <div>
                            <span className="font-medium text-gray-200">
                              {dayLabel}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              {dayEntries.length} obrok(a)
                            </span>
                            {dayEntries.length > 0 && (
                              <span className="ml-2 text-xs text-gray-500">
                                &middot; {macros.cal} kcal / {macros.protein}P /{" "}
                                {macros.carbs}UH / {macros.fat}M
                              </span>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-gray-500" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-500" />
                          )}
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-800 p-3 space-y-2">
                            {dayEntries.map((entry) => {
                              const meal = allMeals.find(
                                (m) => m.id === entry.meals?.id
                              );
                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between rounded-lg bg-gray-900/50 p-2 text-sm"
                                >
                                  <div>
                                    <span className="font-medium text-gray-300">
                                      Obrok {entry.slot_number}:
                                    </span>{" "}
                                    <span className="text-gray-400">
                                      {entry.meals?.name ?? "—"}
                                    </span>
                                    {meal && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        {meal.cal} kcal
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleRemoveEntry(entry.id)}
                                  >
                                    <X size={12} />
                                  </Button>
                                </div>
                              );
                            })}

                            {/* Add slot */}
                            {addingSlotFor === dayKey ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={selectedMealId}
                                  onChange={(e) =>
                                    setSelectedMealId(e.target.value)
                                  }
                                  className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
                                >
                                  <option value="">Odaberi obrok...</option>
                                  {allMeals.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.cal} kcal)
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  disabled={!selectedMealId || saving}
                                  onClick={() =>
                                    handleAddSlot(
                                      plan.id,
                                      dayOfWeek,
                                      plan.meal_plan_entries
                                    )
                                  }
                                >
                                  {saving ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Plus size={12} />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAddingSlotFor(null);
                                    setSelectedMealId("");
                                  }}
                                >
                                  <X size={12} />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAddingSlotFor(dayKey)}
                              >
                                <Plus size={12} /> Dodaj obrok
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Obriši "${deleteTarget?.name}"?`}
        description="Ovaj plan prehrane će biti trajno obrisan sa svim unosima."
        confirmLabel="Obriši"
        onConfirm={() => deleteTarget && handleDeletePlan(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
