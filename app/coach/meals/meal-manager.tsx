"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMeal,
  updateMeal,
  deleteMeal,
  addMealFood,
  removeMealFood,
  reorderMealFood,
} from "@/actions/meals";
import {
  Plus,
  Trash2,
  X,
  Loader2,
  Check,
  Pencil,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/confirm-dialog";
import { foodDisplayName } from "@/lib/food-display";
import { translateError } from "@/lib/translate-error";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import type { Locale } from "@/i18n/request";

/* eslint-disable @typescript-eslint/no-explicit-any */

type FoodRef = {
  id: string;
  name: string;
  name_en: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};

type MealFood = {
  id: string;
  quantity_g: number;
  sort_order: number;
  foods: FoodRef | null;
};

type Meal = {
  id: string;
  name: string;
  notes: string | null;
  meal_foods: MealFood[];
};

function calcMacros(food: FoodRef, qty: number) {
  const factor = qty / 100;
  return {
    cal: Math.round(food.calories_per_100g * factor),
    protein: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat: Math.round(food.fat_per_100g * factor * 10) / 10,
  };
}

function mealTotals(mealFoods: MealFood[]) {
  let cal = 0,
    protein = 0,
    carbs = 0,
    fat = 0;
  for (const mf of mealFoods) {
    if (!mf.foods) continue;
    const m = calcMacros(mf.foods, mf.quantity_g);
    cal += m.cal;
    protein += m.protein;
    carbs += m.carbs;
    fat += m.fat;
  }
  return {
    cal: Math.round(cal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

// Derive a category chip label from a meal name. Pure display heuristic.
function categoryFromName(name: string): string {
  const n = name.toLowerCase();
  if (/\b(pre|pre-?work|pre-?workout)\b/.test(n)) return "PRE";
  if (/\b(post|post-?work|post-?workout|recovery)\b/.test(n)) return "POST";
  if (/breakfast|oats|porridge|cereal|granola|toast|eggs|doru[čc]ak|zajut(a|er)k/.test(n))
    return "BREAKFAST";
  if (/lunch|bowl|ru[čc]ak/.test(n)) return "LUNCH";
  if (/dinner|salmon|steak|ve[čc]era/.test(n)) return "DINNER";
  if (/snack|yogurt|fruit|nuts|u[žz]ina/.test(n)) return "SNACK";
  return "MEAL";
}

export default function MealManager({
  initialMeals,
  allFoods,
}: {
  initialMeals: Meal[];
  allFoods: FoodRef[];
}) {
  const router = useRouter();
  const t = useTranslations("coach.meals");
  const tErr = useTranslations("coach.meals.errors");
  const tCommonErr = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const [showNewMeal, setShowNewMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [newMealNotes, setNewMealNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [addingFoodFor, setAddingFoodFor] = useState<string | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Add food form state
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [foodQuantity, setFoodQuantity] = useState("100");
  const [foodSearch, setFoodSearch] = useState("");

  function toggleExpanded(id: string) {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateMeal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await createMeal(newMealName, newMealNotes || null);
    setSaving(false);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("mealCreatedToast"));
    setNewMealName("");
    setNewMealNotes("");
    setShowNewMeal(false);
    router.refresh();
  }

  async function handleUpdateMeal(id: string) {
    setSaving(true);
    const res = await updateMeal(id, editName, editNotes || null);
    setSaving(false);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("mealUpdatedToast"));
    setEditingMealId(null);
    router.refresh();
  }

  async function handleDeleteMeal(id: string) {
    const res = await deleteMeal(id);
    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }
    toast.success(t("mealDeletedToast"));
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleAddFood(mealId: string) {
    if (!selectedFoodId || !foodQuantity) return;
    setSaving(true);
    const res = await addMealFood(mealId, selectedFoodId, Number(foodQuantity));
    setSaving(false);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("foodAddedToast"));
    setAddingFoodFor(null);
    setSelectedFoodId("");
    setFoodQuantity("100");
    setFoodSearch("");
    router.refresh();
  }

  async function handleRemoveFood(mfId: string) {
    const res = await removeMealFood(mfId);
    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }
    router.refresh();
  }

  async function handleReorder(
    mfId: string,
    mealId: string,
    direction: "up" | "down",
  ) {
    await reorderMealFood(mfId, mealId, direction);
    router.refresh();
  }

  const filteredFoods = foodSearch.trim()
    ? allFoods.filter((f) => {
        const q = foodSearch.toLowerCase();
        return (
          foodDisplayName(f, locale).toLowerCase().includes(q) ||
          f.name.toLowerCase().includes(q)
        );
      })
    : allFoods;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <MicroLabel>
            ~/MEALS — {initialMeals.length} TEMPLATES
          </MicroLabel>
          <h1 className="mt-2 text-[28px] sm:text-[36px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {t("title")}
          </h1>
        </div>
        {!showNewMeal && (
          <button
            type="button"
            onClick={() => setShowNewMeal(true)}
            className="rounded-md bg-lime px-3.5 py-2 text-[13px] font-semibold text-bg transition-colors hover:bg-lime/90"
          >
            + {t("newMeal")}
          </button>
        )}
      </div>

      {/* New meal form */}
      {showNewMeal && (
        <form onSubmit={handleCreateMeal} className="mt-6">
          <div className="rounded-lg border border-border bg-surface-1 p-5">
            <div className="space-y-3">
              <div>
                <Label className="mb-1 text-xs">{t("nameLabel")} *</Label>
                <Input
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  required
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">{t("notesLabel")}</Label>
                <Input
                  value={newMealNotes}
                  onChange={(e) => setNewMealNotes(e.target.value)}
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
                  {t("createSubmit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewMeal(false)}
                >
                  <X size={14} /> {tCommon("cancel")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Meal grid */}
      {initialMeals.length === 0 ? (
        <p className="mt-10 py-8 text-center text-ink-3">{t("emptyList")}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {initialMeals.map((meal) => {
            const totals = mealTotals(meal.meal_foods);
            const isExpanded = expandedMeals.has(meal.id);
            const isEditing = editingMealId === meal.id;
            const category = categoryFromName(meal.name);

            // Stacked bar segment proportions weighted by kcal contribution.
            const energyTotal =
              totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
            const pPct =
              energyTotal > 0 ? (totals.protein * 4 * 100) / energyTotal : 0;
            const cPct =
              energyTotal > 0 ? (totals.carbs * 4 * 100) / energyTotal : 0;
            const fPct =
              energyTotal > 0 ? (totals.fat * 9 * 100) / energyTotal : 0;

            return (
              <div
                key={meal.id}
                className="rounded-md border border-border bg-surface-1 p-5"
              >
                {/* Top row: chip + name on left, kcal on right */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-[3px] border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-2">
                      {category}
                    </span>
                    {isEditing ? (
                      <div className="mt-2.5 flex gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateMeal(meal.id)}
                          disabled={saving}
                        >
                          <Check size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingMealId(null)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(meal.id)}
                        className="mt-2.5 block text-left text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink hover:text-ink-2"
                      >
                        {meal.name}
                      </button>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <div className="font-mono text-2xl font-semibold leading-none text-ink">
                        {totals.cal}
                      </div>
                      <div className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">
                        KCAL
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stacked macro bar */}
                <div className="mt-4 flex h-1.5 overflow-hidden rounded-[3px] bg-surface-2">
                  {pPct > 0 && (
                    <div
                      className="bg-lime"
                      style={{ width: `${pPct}%` }}
                    />
                  )}
                  {cPct > 0 && (
                    <div
                      style={{ width: `${cPct}%`, background: "#FFB84D" }}
                    />
                  )}
                  {fPct > 0 && (
                    <div
                      className="bg-warn"
                      style={{ width: `${fPct}%` }}
                    />
                  )}
                </div>

                {/* Macro labels + foods count */}
                <div className="mt-2.5 flex items-center justify-between font-mono text-[11px]">
                  <span className="text-lime">
                    P {Math.round(totals.protein)}g
                  </span>
                  <span style={{ color: "#FFB84D" }}>
                    C {Math.round(totals.carbs)}g
                  </span>
                  <span className="text-warn">
                    F {Math.round(totals.fat)}g
                  </span>
                  <span className="text-ink-3">
                    {t("mealMeta", { count: meal.meal_foods.length })}
                  </span>
                </div>

                {/* Card action row */}
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(meal.id)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-ink-2"
                  >
                    {isExpanded ? (
                      <ChevronUp size={11} />
                    ) : (
                      <ChevronDown size={11} />
                    )}
                    {t("addFood")}
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => {
                        setEditName(meal.name);
                        setEditNotes(meal.notes || "");
                        setEditingMealId(meal.id);
                      }}
                      className="rounded p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-2"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() =>
                        setDeleteTarget({ id: meal.id, name: meal.name })
                      }
                      className="rounded p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-warn"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Expanded: foods list + add food */}
                {isExpanded && (
                  <div className="mt-3 border-t border-border pt-3">
                    {meal.meal_foods.length === 0 ? (
                      <p className="mb-3 text-sm text-ink-3">
                        {t("noFoodsInMeal")}
                      </p>
                    ) : (
                      <div className="mb-3 space-y-1.5">
                        {meal.meal_foods.map((mf, idx) => {
                          if (!mf.foods) return null;
                          const m = calcMacros(mf.foods, mf.quantity_g);
                          return (
                            <div
                              key={mf.id}
                              className="flex items-center gap-2 rounded-md bg-surface-2/50 p-2 text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-ink-2">
                                  {foodDisplayName(mf.foods, locale)}
                                </span>
                                <span className="ml-2 font-mono text-[11px] text-ink-3">
                                  {mf.quantity_g}g
                                </span>
                                <span className="ml-2 font-mono text-[10px] text-ink-3">
                                  {m.cal} kcal · {m.protein}/{m.carbs}/{m.fat}
                                </span>
                              </div>
                              <div className="flex shrink-0 gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={idx === 0}
                                  onClick={() =>
                                    handleReorder(mf.id, meal.id, "up")
                                  }
                                >
                                  <ChevronUp size={12} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={idx === meal.meal_foods.length - 1}
                                  onClick={() =>
                                    handleReorder(mf.id, meal.id, "down")
                                  }
                                >
                                  <ChevronDown size={12} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-warn hover:text-warn/80"
                                  onClick={() => handleRemoveFood(mf.id)}
                                >
                                  <X size={12} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add food trigger / form */}
                    {addingFoodFor === meal.id ? (
                      <div className="space-y-2 rounded-md border border-border p-3">
                        <Input
                          value={foodSearch}
                          onChange={(e) => setFoodSearch(e.target.value)}
                          placeholder={t("searchFoods")}
                          className="h-8"
                        />
                        <select
                          value={selectedFoodId}
                          onChange={(e) => setSelectedFoodId(e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                        >
                          <option value="">{t("pickFood")}</option>
                          {filteredFoods.map((f) => (
                            <option key={f.id} value={f.id}>
                              {foodDisplayName(f, locale)} (
                              {f.calories_per_100g} kcal/100g)
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={foodQuantity}
                            onChange={(e) => setFoodQuantity(e.target.value)}
                            placeholder="100"
                            className="h-8 w-24"
                          />
                          <span className="text-xs text-ink-3">
                            {t("gramsSuffix")}
                          </span>
                          <Button
                            size="sm"
                            disabled={!selectedFoodId || saving}
                            onClick={() => handleAddFood(meal.id)}
                          >
                            {saving ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            {t("addFood")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAddingFoodFor(null);
                              setFoodSearch("");
                              setSelectedFoodId("");
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddingFoodFor(meal.id)}
                      >
                        <Plus size={12} /> {t("addFood")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("confirmDeleteTitle", { name: deleteTarget?.name ?? "" })}
        description={t("confirmDeleteDesc")}
        onConfirm={() => deleteTarget && handleDeleteMeal(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
