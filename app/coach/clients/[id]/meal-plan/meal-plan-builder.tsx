"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ConfirmDialog from "@/components/confirm-dialog";
import { MicroLabel } from "@/components/ui/athletic/micro-label";

/* eslint-disable @typescript-eslint/no-explicit-any */

type FoodLine = {
  name: string;
  quantity_g: number;
  cal: number;
};

type MealRef = {
  id: string;
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: FoodLine[];
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

// Placeholder time tags by slot index (mirrors prototype: AM / 13:00 / 16:00 / 20:00)
const SLOT_TIME_TAGS = ["AM", "13:00", "16:00", "20:00", "22:00"];

function slotTimeTag(slotNumber: number): string {
  const idx = Math.max(0, slotNumber - 1);
  return SLOT_TIME_TAGS[idx] ?? `+${slotNumber}`;
}

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
  const t = useTranslations("coach.mealPlan");
  const locale = useLocale();
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  // Pick active plan, else most recently created (plans arrive sorted desc)
  const activePlan = useMemo(() => {
    if (plans.length === 0) return null;
    return plans.find((p) => p.is_active) ?? plans[0];
  }, [plans]);

  // Day-of-week labels for the day selector strip
  const dayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(bcp47, { weekday: "short" });
    const result: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(2024, 0, 1 + i)); // Jan 1 2024 = Mon
      const label = fmt.format(d);
      result.push(label.toUpperCase());
    }
    return result;
  }, [bcp47]);

  // Today's day-of-week (1=Mon..7=Sun) as default selection
  const initialDay = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  }, []);

  const [selectedDay, setSelectedDay] = useState<number>(initialDay);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingSlotFor, setAddingSlotFor] = useState<string | null>(null);
  const [selectedMealId, setSelectedMealId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await createMealPlan(clientId, newPlanName);
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success(t("planCreatedToast"));
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
    toast.success(t("planDeletedToast"));
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
    toast.success(t("planActivatedToast"));
    router.refresh();
  }

  async function handleAddSlot(
    planId: string,
    dayOfWeek: number,
    existingEntries: PlanEntry[]
  ) {
    if (!selectedMealId) return;

    const dayEntries = existingEntries.filter(
      (e) => e.day_of_week === dayOfWeek
    );
    const nextSlot =
      dayEntries.length > 0
        ? Math.max(...dayEntries.map((e) => e.slot_number)) + 1
        : 1;

    setSaving(true);
    const res = await setMealPlanEntry(
      planId,
      dayOfWeek,
      nextSlot,
      selectedMealId
    );
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success(t("mealAddedToast"));
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

  // Macros for the currently selected day in the active plan
  const dayTotals = useMemo(() => {
    if (!activePlan) return { cal: 0, protein: 0, carbs: 0, fat: 0 };
    let cal = 0,
      protein = 0,
      carbs = 0,
      fat = 0;
    for (const entry of activePlan.meal_plan_entries) {
      if (entry.day_of_week !== selectedDay) continue;
      const meal = allMeals.find((m) => m.id === entry.meals?.id);
      if (!meal) continue;
      cal += meal.cal;
      protein += meal.protein;
      carbs += meal.carbs;
      fat += meal.fat;
    }
    return {
      cal: Math.round(cal),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    };
  }, [activePlan, selectedDay, allMeals]);

  const dayEntries = useMemo(() => {
    if (!activePlan) return [];
    return activePlan.meal_plan_entries
      .filter((e) => e.day_of_week === selectedDay)
      .sort((a, b) => a.slot_number - b.slot_number);
  }, [activePlan, selectedDay]);

  const totalKcalFormatted = dayTotals.cal.toLocaleString(bcp47);
  const upperClientName = clientName.toUpperCase();

  return (
    <div className="px-10 py-8">
      {/* Back link */}
      <Link
        href={`/coach/clients/${clientId}`}
        className="mb-4 inline-flex items-center gap-1 text-[12px] text-ink-2 hover:text-ink"
      >
        <ChevronLeft size={14} /> {clientName}
      </Link>

      {/* Top row: label + headline on left, totals on right */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <MicroLabel>
            {upperClientName} · {t("title").toUpperCase()}
          </MicroLabel>
          <h1 className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {t("title")}
          </h1>
        </div>

        {activePlan && (
          <div className="flex items-baseline gap-4">
            <div className="text-right">
              <MicroLabel>TOTAL</MicroLabel>
              <div className="mt-1 font-mono text-[24px] font-semibold leading-none text-ink">
                {totalKcalFormatted}{" "}
                <span className="text-[12px] text-ink-3">kcal</span>
              </div>
            </div>
            <div className="flex gap-2">
              <MacroTile label="P" value={dayTotals.protein} colorClass="text-lime" />
              <MacroTile label="C" value={dayTotals.carbs} colorClass="text-carb" />
              <MacroTile label="F" value={dayTotals.fat} colorClass="text-warn" />
            </div>
          </div>
        )}
      </div>

      {/* Plan switcher / actions row */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {plans.map((plan) => {
          const isCurrent = activePlan?.id === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => !plan.is_active && handleActivate(plan.id)}
              className={
                "inline-flex items-center gap-2 rounded-[3px] border px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition-colors " +
                (isCurrent
                  ? "border-lime bg-lime/10 text-lime"
                  : "border-border bg-surface-2 text-ink-2 hover:text-ink")
              }
              title={plan.is_active ? t("active") : t("activate")}
            >
              {plan.is_active && <Zap size={10} />}
              {plan.name}
            </button>
          );
        })}
        {activePlan && (
          <button
            type="button"
            onClick={() =>
              setDeleteTarget({ id: activePlan.id, name: activePlan.name })
            }
            className="ml-1 inline-flex items-center rounded p-1.5 text-ink-3 hover:bg-surface-2 hover:text-warn"
            aria-label={t("confirmDeleteTitle", { name: activePlan.name })}
          >
            <Trash2 size={14} />
          </button>
        )}
        <div className="ml-auto">
          {!showNewPlan ? (
            <button
              type="button"
              onClick={() => setShowNewPlan(true)}
              className="rounded-md bg-lime px-3.5 py-2 text-[13px] font-semibold text-bg transition-colors hover:bg-lime/90"
            >
              + {t("newPlan")}
            </button>
          ) : null}
        </div>
      </div>

      {/* New plan form */}
      {showNewPlan && (
        <form onSubmit={handleCreatePlan} className="mt-4">
          <div className="rounded-md border border-border bg-surface-1 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Label className="mb-1 text-xs">{t("planNameLabel")} *</Label>
                <Input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder={t("planNamePlaceholder")}
                  required
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                {t("createPlan")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowNewPlan(false)}
              >
                <X size={14} />
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Day selector (only when an active plan exists) */}
      {activePlan && (
        <div className="mt-6 flex gap-1">
          {dayLabels.map((label, idx) => {
            const dayOfWeek = idx + 1;
            const isSelected = dayOfWeek === selectedDay;
            return (
              <button
                key={dayOfWeek}
                type="button"
                onClick={() => setSelectedDay(dayOfWeek)}
                className={
                  "rounded-[3px] border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] transition-colors " +
                  (isSelected
                    ? "border-lime bg-lime/10 text-lime"
                    : "border-border bg-surface-2 text-ink-2 hover:text-ink")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty / cards */}
      {plans.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-md border border-border bg-surface-1 py-10 text-center">
          <UtensilsCrossed className="mb-3 size-10 text-ink-3" />
          <p className="text-lg font-medium text-ink">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-ink-2">{t("emptyHint")}</p>
        </div>
      ) : !activePlan ? null : dayEntries.length === 0 ? (
        <div className="mt-6 rounded-md border border-border bg-surface-1 px-5 py-8 text-center">
          <p className="text-sm text-ink-2">
            {t("mealCount", { count: 0 })}
          </p>
          <div className="mt-4">
            <AddSlotControl
              planId={activePlan.id}
              dayOfWeek={selectedDay}
              entries={activePlan.meal_plan_entries}
              isOpen={addingSlotFor === `${activePlan.id}-${selectedDay}-new`}
              setOpen={(open) =>
                setAddingSlotFor(
                  open ? `${activePlan.id}-${selectedDay}-new` : null
                )
              }
              allMeals={allMeals}
              selectedMealId={selectedMealId}
              setSelectedMealId={setSelectedMealId}
              saving={saving}
              onAdd={handleAddSlot}
              t={t}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {dayEntries.map((entry, idx) => {
            const meal = allMeals.find((m) => m.id === entry.meals?.id);
            const tag = slotTimeTag(idx + 1);
            const mealName = entry.meals?.name ?? "—";
            const kcal = meal?.cal ?? 0;
            const foods = meal?.foods ?? [];
            return (
              <div
                key={entry.id}
                className="overflow-hidden rounded-md border border-border bg-surface-1"
              >
                {/* Card header */}
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block rounded-[3px] border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-2">
                      {tag}
                    </span>
                    <span className="text-[16px] font-semibold text-ink">
                      {mealName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] text-ink-2">
                      {kcal} kcal
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="rounded p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-warn"
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Item rows */}
                {foods.length === 0 ? (
                  <div className="px-5 py-2.5 text-[12px] text-ink-3">—</div>
                ) : (
                  foods.map((f, j) => (
                    <div
                      key={j}
                      className={
                        "grid grid-cols-[2fr_1fr_1fr] items-center px-5 py-2.5 text-[13px] " +
                        (j < foods.length - 1
                          ? "border-b border-border"
                          : "")
                      }
                    >
                      <span className="text-ink">{f.name}</span>
                      <span className="font-mono text-ink-2">
                        {f.quantity_g}g
                      </span>
                      <span className="text-right font-mono text-ink">
                        {f.cal}
                      </span>
                    </div>
                  ))
                )}

                {/* Footer: add food (re-styled as add-meal trigger for this slot) */}
                <div className="border-t border-dashed border-border">
                  {addingSlotFor === `${activePlan.id}-${selectedDay}-${entry.id}` ? (
                    <div className="flex items-center gap-2 px-5 py-2.5">
                      <select
                        value={selectedMealId}
                        onChange={(e) => setSelectedMealId(e.target.value)}
                        className="h-8 flex-1 rounded-[3px] border border-border bg-surface-2 px-2.5 text-[12px] text-ink outline-none"
                      >
                        <option value="">{t("pickMeal")}</option>
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
                            activePlan.id,
                            selectedDay,
                            activePlan.meal_plan_entries
                          )
                        }
                      >
                        {saving ? (
                          <Loader2 size={12} className="animate-spin" />
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
                    <button
                      type="button"
                      onClick={() =>
                        setAddingSlotFor(
                          `${activePlan.id}-${selectedDay}-${entry.id}`
                        )
                      }
                      className="w-full bg-transparent px-5 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-ink-2"
                    >
                      + {t("addMeal").toUpperCase()}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Trailing add-meal card */}
          <div className="overflow-hidden rounded-md border border-dashed border-border bg-surface-1">
            <div className="px-5 py-3.5">
              <AddSlotControl
                planId={activePlan.id}
                dayOfWeek={selectedDay}
                entries={activePlan.meal_plan_entries}
                isOpen={
                  addingSlotFor === `${activePlan.id}-${selectedDay}-new`
                }
                setOpen={(open) =>
                  setAddingSlotFor(
                    open ? `${activePlan.id}-${selectedDay}-new` : null
                  )
                }
                allMeals={allMeals}
                selectedMealId={selectedMealId}
                setSelectedMealId={setSelectedMealId}
                saving={saving}
                onAdd={handleAddSlot}
                t={t}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("confirmDeleteTitle", { name: deleteTarget?.name ?? "" })}
        description={t("confirmDeleteDesc")}
        onConfirm={() => deleteTarget && handleDeletePlan(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MacroTile({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-1 px-3.5 py-2 text-center">
      <div className={`font-mono text-[16px] font-semibold leading-none ${colorClass}`}>
        {value}g
      </div>
      <div className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </div>
    </div>
  );
}

function AddSlotControl({
  planId,
  dayOfWeek,
  entries,
  isOpen,
  setOpen,
  allMeals,
  selectedMealId,
  setSelectedMealId,
  saving,
  onAdd,
  t,
}: {
  planId: string;
  dayOfWeek: number;
  entries: PlanEntry[];
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  allMeals: MealRef[];
  selectedMealId: string;
  setSelectedMealId: (id: string) => void;
  saving: boolean;
  onAdd: (
    planId: string,
    dayOfWeek: number,
    entries: PlanEntry[]
  ) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-transparent py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-ink-2"
      >
        + {t("addMeal").toUpperCase()}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedMealId}
        onChange={(e) => setSelectedMealId(e.target.value)}
        className="h-8 flex-1 rounded-[3px] border border-border bg-surface-2 px-2.5 text-[12px] text-ink outline-none"
      >
        <option value="">{t("pickMeal")}</option>
        {allMeals.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.cal} kcal)
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!selectedMealId || saving}
        onClick={() => onAdd(planId, dayOfWeek, entries)}
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setSelectedMealId("");
        }}
      >
        <X size={12} />
      </Button>
    </div>
  );
}
