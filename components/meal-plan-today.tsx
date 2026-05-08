"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Num } from "@/components/ui/athletic/num";
import type { MealSlot } from "@/actions/client-meal-plan";

export default function MealPlanToday({ meals }: { meals: MealSlot[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const t = useTranslations("app.meals");

  function toggle(slot: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {meals.map((meal) => {
        const isOpen = expanded.has(meal.slot_number);
        return (
          <div
            key={meal.slot_number}
            className="rounded-xl border border-border bg-surface overflow-hidden"
          >
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between p-3.5 text-left active:bg-surface-2/40"
              onClick={() => toggle(meal.slot_number)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <MicroLabel>
                    {t("slotPrefix", { n: meal.slot_number }).toUpperCase()}
                  </MicroLabel>
                  <span className="font-medium text-sm text-ink truncate">
                    {meal.meal_name}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[11px] text-ink-3">
                  <span>
                    <Num value={meal.totals.cal} /> kcal
                  </span>
                  <span>
                    <span className="text-protein">P</span>{" "}
                    <Num value={meal.totals.protein} />
                  </span>
                  <span>
                    <span className="text-carb">C</span>{" "}
                    <Num value={meal.totals.carbs} />
                  </span>
                  <span>
                    <span className="text-fat">F</span>{" "}
                    <Num value={meal.totals.fat} />
                  </span>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp size={16} className="shrink-0 text-ink-3" />
              ) : (
                <ChevronDown size={16} className="shrink-0 text-ink-3" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-border px-3.5 py-3 bg-surface-2/30">
                <ul className="space-y-1.5">
                  {meal.foods.map((food, i) => (
                    <li
                      key={i}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="text-ink-2 truncate">
                        {food.name}{" "}
                        <span className="font-mono text-[11px] text-ink-3">
                          <Num value={food.quantity_g} />g
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-ink-3">
                        <Num value={food.calories} /> kcal · {food.protein}/{food.carbs}/{food.fat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
