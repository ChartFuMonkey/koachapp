"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  createMeal,
  updateMeal,
  deleteMeal,
  addMealFood,
  updateMealFood,
  removeMealFood,
  reorderMealFood,
} from "@/actions/meals";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Check,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/confirm-dialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

type FoodRef = {
  id: string;
  name: string;
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
  let cal = 0, protein = 0, carbs = 0, fat = 0;
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

export default function MealManager({
  initialMeals,
  allFoods,
}: {
  initialMeals: Meal[];
  allFoods: FoodRef[];
}) {
  const router = useRouter();
  const t = useTranslations("coach.meals");
  const tCommon = useTranslations("common");
  const [showNewMeal, setShowNewMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [newMealNotes, setNewMealNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [addingFoodFor, setAddingFoodFor] = useState<string | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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
      toast.error(res.error);
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
      toast.error(res.error);
      return;
    }

    toast.success(t("mealUpdatedToast"));
    setEditingMealId(null);
    router.refresh();
  }

  async function handleDeleteMeal(id: string) {
    const res = await deleteMeal(id);
    if ("error" in res) {
      toast.error(res.error);
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
      toast.error(res.error);
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
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  async function handleReorder(mfId: string, mealId: string, direction: "up" | "down") {
    await reorderMealFood(mfId, mealId, direction);
    router.refresh();
  }

  const filteredFoods = foodSearch.trim()
    ? allFoods.filter((f) => f.name.toLowerCase().includes(foodSearch.toLowerCase()))
    : allFoods;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {!showNewMeal && (
          <Button onClick={() => setShowNewMeal(true)}>
            <Plus size={14} /> {t("newMeal")}
          </Button>
        )}
      </div>

      {/* New meal form */}
      {showNewMeal && (
        <form onSubmit={handleCreateMeal}>
          <Card className="mb-4">
            <CardContent className="space-y-3 p-4">
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
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {t("createSubmit")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowNewMeal(false)}>
                  <X size={14} /> {tCommon("cancel")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {initialMeals.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {t("emptyList")}
        </p>
      ) : (
        <div className="space-y-3">
          {initialMeals.map((meal) => {
            const isExpanded = expandedMeals.has(meal.id);
            const totals = mealTotals(meal.meal_foods);
            const isEditing = editingMealId === meal.id;

            return (
              <Card key={meal.id}>
                <CardContent className="p-0">
                  {/* Header */}
                  <div
                    className="flex cursor-pointer items-center justify-between p-4"
                    onClick={() => toggleExpanded(meal.id)}
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                        <h3 className="font-medium text-gray-200">{meal.name}</h3>
                      )}
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t("mealMeta", { count: meal.meal_foods.length })} &middot;{" "}
                        {totals.cal} kcal &middot; {totals.protein}P &middot;{" "}
                        {totals.carbs}C &middot; {totals.fat}F
                      </p>
                    </div>
                    <div className="ml-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditName(meal.name);
                          setEditNotes(meal.notes || "");
                          setEditingMealId(meal.id);
                        }}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: meal.id, name: meal.name });
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={12} />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 p-4">
                      {meal.meal_foods.length === 0 ? (
                        <p className="mb-3 text-sm text-gray-500">
                          {t("noFoodsInMeal")}
                        </p>
                      ) : (
                        <div className="mb-3 space-y-2">
                          {meal.meal_foods.map((mf, idx) => {
                            if (!mf.foods) return null;
                            const m = calcMacros(mf.foods, mf.quantity_g);
                            return (
                              <div
                                key={mf.id}
                                className="flex items-center gap-2 rounded-lg bg-gray-900/50 p-2 text-sm"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-gray-300">
                                    {mf.foods.name}
                                  </span>
                                  <span className="ml-2 text-gray-500">
                                    {mf.quantity_g}g
                                  </span>
                                  <span className="ml-2 text-xs text-gray-500">
                                    {m.cal} kcal / {m.protein}P / {m.carbs}C / {m.fat}F
                                  </span>
                                </div>
                                <div className="flex shrink-0 gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    disabled={idx === 0}
                                    onClick={() => handleReorder(mf.id, meal.id, "up")}
                                  >
                                    <ChevronUp size={12} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    disabled={idx === meal.meal_foods.length - 1}
                                    onClick={() => handleReorder(mf.id, meal.id, "down")}
                                  >
                                    <ChevronDown size={12} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleRemoveFood(mf.id)}
                                  >
                                    <X size={12} />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Totals row */}
                          <div className="flex items-center rounded-lg bg-gray-800/50 p-2 text-sm font-medium">
                            <span className="flex-1 text-gray-300">{t("totalLabel")}</span>
                            <span className="text-xs text-gray-400">
                              {totals.cal} kcal / {totals.protein}P / {totals.carbs}C / {totals.fat}F
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Add food */}
                      {addingFoodFor === meal.id ? (
                        <div className="space-y-2 rounded-lg border border-gray-800 p-3">
                          <Input
                            value={foodSearch}
                            onChange={(e) => setFoodSearch(e.target.value)}
                            placeholder={t("searchFoods")}
                            className="h-8"
                          />
                          <select
                            value={selectedFoodId}
                            onChange={(e) => setSelectedFoodId(e.target.value)}
                            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                          >
                            <option value="">{t("pickFood")}</option>
                            {filteredFoods.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.calories_per_100g} kcal/100g)
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
                            <span className="text-xs text-gray-500">{t("gramsSuffix")}</span>
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
                </CardContent>
              </Card>
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
