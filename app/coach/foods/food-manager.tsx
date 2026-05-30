"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createFood, updateFood, deleteFood } from "@/actions/foods";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/confirm-dialog";
import { foodDisplayName } from "@/lib/food-display";
import { translateError } from "@/lib/translate-error";
import type { Locale } from "@/i18n/request";

type Food = {
  id: string;
  name: string;
  name_en: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  category: string | null;
  is_preset: boolean;
};

// DB-side values stay Croatian (phase 2 will handle localization of food content).
// The UI chrome is translated; category labels are mapped from DB values to the active locale.
const CATEGORY_VALUES = [
  { value: "", key: "none" as const },
  { value: "Meso/Riba", key: "meatFish" as const },
  { value: "Jaja", key: "eggs" as const },
  { value: "Mliječni", key: "dairy" as const },
  { value: "Žitarice", key: "grains" as const },
  { value: "Mahunarke", key: "legumes" as const },
  { value: "Voće", key: "fruit" as const },
  { value: "Povrće", key: "vegetables" as const },
  { value: "Masti/Ulja", key: "fatsOils" as const },
  { value: "Ostalo", key: "other" as const },
];

// Map a DB category value to a coarse "kind" used for color tagging.
type CategoryKind =
  | "protein"
  | "carb"
  | "fat"
  | "veg"
  | "fruit"
  | "dairy"
  | "legume"
  | "grain"
  | "other";

function categoryKind(value: string | null | undefined): CategoryKind {
  switch (value) {
    case "Meso/Riba":
    case "Jaja":
      return "protein";
    case "Mliječni":
      return "dairy";
    case "Žitarice":
      return "grain";
    case "Mahunarke":
      return "legume";
    case "Voće":
      return "fruit";
    case "Povrće":
      return "veg";
    case "Masti/Ulja":
      return "fat";
    default:
      return "other";
  }
}

const categoryColorClass: Record<CategoryKind, string> = {
  protein: "text-lime",
  carb: "text-[#FFB84D]",
  fat: "text-warn",
  veg: "text-good",
  fruit: "text-[#9BC53D]",
  dairy: "text-info",
  legume: "text-violet",
  grain: "text-[#FFB84D]",
  other: "text-ink-2",
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default function FoodManager({
  initialFoods,
}: {
  initialFoods: Food[];
}) {
  const router = useRouter();
  const t = useTranslations("coach.foods");
  const tCat = useTranslations("coach.foods.categories");
  const tErr = useTranslations("coach.foods.errors");
  const tCommonErr = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [search, setSearch] = useState("");

  function categoryLabel(value: string | null | undefined) {
    if (!value) return tCat("none");
    const match = CATEGORY_VALUES.find((c) => c.value === value);
    if (match) return tCat(match.key);
    return value;
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return initialFoods;
    const q = search.toLowerCase();
    return initialFoods.filter(
      (f) =>
        foodDisplayName(f, locale).toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q)
    );
  }, [initialFoods, search, locale]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const res = await createFood(formData);
    setSaving(false);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("foodAddedToast"));
    setShowAddForm(false);
    router.refresh();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const res = await updateFood(id, formData);
    setSaving(false);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("foodUpdatedToast"));
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await deleteFood(id);

    if ("error" in res) {
      toast.error(translateError(res.error, tErr, tCommonErr));
      return;
    }

    toast.success(t("foodDeletedToast"));
    setDeleteTarget(null);
    router.refresh();
  }

  function FoodForm({
    food,
    onSubmit,
    onCancel,
  }: {
    food?: Food;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
  }) {
    return (
      <form onSubmit={onSubmit}>
        <Card className="mb-4">
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <Label className="mb-1 text-xs">{t("nameLabel")} *</Label>
                <Input
                  name="name"
                  required
                  defaultValue={food?.name ?? ""}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">{t("categoryLabel")}</Label>
                <select
                  name="category"
                  className={selectClass}
                  defaultValue={food?.category ?? ""}
                >
                  {CATEGORY_VALUES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {tCat(c.key)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label className="mb-1 text-xs">{t("caloriesLabel")}</Label>
                <Input
                  name="calories_per_100g"
                  type="number"
                  step="0.01"
                  defaultValue={food?.calories_per_100g ?? ""}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">{t("proteinLabel")}</Label>
                <Input
                  name="protein_per_100g"
                  type="number"
                  step="0.01"
                  defaultValue={food?.protein_per_100g ?? ""}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">{t("carbsLabel")}</Label>
                <Input
                  name="carbs_per_100g"
                  type="number"
                  step="0.01"
                  defaultValue={food?.carbs_per_100g ?? ""}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">{t("fatLabel")}</Label>
                <Input
                  name="fat_per_100g"
                  type="number"
                  step="0.01"
                  defaultValue={food?.fat_per_100g ?? ""}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {food ? t("saveLabel") : t("addSubmit")}
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

  const totalCount = initialFoods.length;

  return (
    <div className="px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
            ~/FOODS &mdash; {totalCount} {totalCount === 1 ? "ENTRY" : "ENTRIES"}
          </div>
          <h1 className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.02em] text-ink">
            {t("title")}
          </h1>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="cursor-pointer rounded-md bg-lime px-[14px] py-2 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90"
          >
            + {t("addFood")}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mt-6">
          <FoodForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="mt-6 box-border w-full rounded-md border border-border bg-surface-1 px-[14px] py-3 font-mono text-[13px] text-ink placeholder:text-ink-3 focus:border-ring focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-ink-3">
          {search ? t("noResults") : t("emptyList")}
        </p>
      ) : (
        <>
          {/* Desktop / md+ : single dense table */}
          <div className="mt-4 hidden overflow-hidden rounded-lg border border-border bg-surface-1 md:block">
            {/* Header row */}
            <div className="grid grid-cols-[2fr_1fr_0.7fr_0.6fr_0.6fr_0.6fr_0.7fr] gap-3 border-b border-border px-5 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              <span>{t("colName")}</span>
              <span>{t("colCategory")}</span>
              <span>{t("colKcal")}</span>
              <span>{t("colProtein")}</span>
              <span>{t("colCarbs")}</span>
              <span>{t("colFat")}</span>
              <span />
            </div>

            {filtered.map((f, idx) => {
              const kind = categoryKind(f.category);
              const colorClass = categoryColorClass[kind];
              const isLast = idx === filtered.length - 1;

              if (editingId === f.id) {
                return (
                  <div
                    key={f.id}
                    className={
                      isLast ? "p-0" : "border-b border-border p-0"
                    }
                  >
                    <FoodForm
                      food={f}
                      onSubmit={(e) => handleUpdate(e, f.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={f.id}
                  className={
                    "grid grid-cols-[2fr_1fr_0.7fr_0.6fr_0.6fr_0.6fr_0.7fr] items-center gap-3 px-5 py-3 text-[13px] " +
                    (isLast ? "" : "border-b border-border")
                  }
                >
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <span className="truncate">
                      {foodDisplayName(f, locale)}
                    </span>
                    {f.is_preset && (
                      <Badge
                        variant="outline"
                        className="rounded-[3px] font-mono text-[10px] uppercase tracking-[0.08em]"
                      >
                        {t("presetBadge")}
                      </Badge>
                    )}
                  </span>
                  <span className="justify-self-start">
                    <span
                      className={
                        "inline-flex items-center rounded-[3px] border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] " +
                        colorClass
                      }
                    >
                      {categoryLabel(f.category)}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-ink">
                    {f.calories_per_100g}
                  </span>
                  <span
                    className={
                      "font-mono text-[12px] tabular-nums " +
                      categoryColorClass.protein
                    }
                  >
                    {f.protein_per_100g}
                  </span>
                  <span
                    className={
                      "font-mono text-[12px] tabular-nums " +
                      categoryColorClass.carb
                    }
                  >
                    {f.carbs_per_100g}
                  </span>
                  <span
                    className={
                      "font-mono text-[12px] tabular-nums " +
                      categoryColorClass.fat
                    }
                  >
                    {f.fat_per_100g}
                  </span>
                  <span className="text-right font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(f.id)}
                      className="cursor-pointer hover:text-ink"
                    >
                      {t("editAction")}
                    </button>
                    <span className="px-1">·</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          id: f.id,
                          name: foodDisplayName(f, locale),
                        })
                      }
                      className="cursor-pointer hover:text-danger"
                    >
                      {t("deleteAction")}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {filtered.map((f) => {
              const kind = categoryKind(f.category);
              const colorClass = categoryColorClass[kind];

              if (editingId === f.id) {
                return (
                  <FoodForm
                    key={f.id}
                    food={f}
                    onSubmit={(e) => handleUpdate(e, f.id)}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }

              return (
                <Card key={f.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-ink">
                            {foodDisplayName(f, locale)}
                          </h3>
                          {f.is_preset && (
                            <Badge
                              variant="outline"
                              className="rounded-[3px] font-mono text-[10px] uppercase tracking-[0.08em]"
                            >
                              {t("presetBadge")}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={
                              "inline-flex items-center rounded-[3px] border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] " +
                              colorClass
                            }
                          >
                            {categoryLabel(f.category)}
                          </span>
                          <span className="font-mono tabular-nums text-ink-2">
                            {f.calories_per_100g} kcal
                          </span>
                          <span
                            className={
                              "font-mono tabular-nums " +
                              categoryColorClass.protein
                            }
                          >
                            P {f.protein_per_100g}
                          </span>
                          <span
                            className={
                              "font-mono tabular-nums " +
                              categoryColorClass.carb
                            }
                          >
                            C {f.carbs_per_100g}
                          </span>
                          <span
                            className={
                              "font-mono tabular-nums " +
                              categoryColorClass.fat
                            }
                          >
                            F {f.fat_per_100g}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 shrink-0 text-right font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                        <button
                          type="button"
                          onClick={() => setEditingId(f.id)}
                          className="cursor-pointer hover:text-ink"
                        >
                          {t("editAction")}
                        </button>
                        <span className="px-1">·</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: f.id,
                              name: foodDisplayName(f, locale),
                            })
                          }
                          className="cursor-pointer hover:text-danger"
                        >
                          {t("deleteAction")}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
