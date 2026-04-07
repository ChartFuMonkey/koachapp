"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MealSlot } from "@/actions/client-meal-plan";

export default function MealPlanToday({ meals }: { meals: MealSlot[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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
          <Card key={meal.slot_number}>
            <CardContent className="p-0">
              <div
                className="flex cursor-pointer items-center justify-between p-3"
                onClick={() => toggle(meal.slot_number)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-500">
                      Obrok {meal.slot_number}
                    </span>
                    <span className="font-medium text-gray-200">
                      {meal.meal_name}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {meal.totals.cal} kcal &middot; {meal.totals.protein}P &middot;{" "}
                    {meal.totals.carbs}UH &middot; {meal.totals.fat}M
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp size={16} className="shrink-0 text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="shrink-0 text-gray-500" />
                )}
              </div>

              {isOpen && (
                <div className="border-t border-gray-800 p-3">
                  <div className="space-y-1.5">
                    {meal.foods.map((food, i) => (
                      <div
                        key={i}
                        className="flex items-baseline justify-between text-sm"
                      >
                        <span className="text-gray-300">
                          {food.name}{" "}
                          <span className="text-gray-500">{food.quantity_g}g</span>
                        </span>
                        <span className="shrink-0 text-xs text-gray-500">
                          {food.calories} kcal / {food.protein}P / {food.carbs}UH / {food.fat}M
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
