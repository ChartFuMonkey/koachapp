"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createFood, updateFood, deleteFood } from "@/actions/foods";
import { Plus, Pencil, Trash2, Check, X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/confirm-dialog";

type Food = {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  category: string | null;
  is_preset: boolean;
};

const CATEGORY_OPTIONS = [
  "",
  "Meso/Riba",
  "Jaja",
  "Mliječni",
  "Žitarice",
  "Mahunarke",
  "Voće",
  "Povrće",
  "Masti/Ulja",
  "Ostalo",
];

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default function FoodManager({
  initialFoods,
}: {
  initialFoods: Food[];
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return initialFoods;
    const q = search.toLowerCase();
    return initialFoods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q)
    );
  }, [initialFoods, search]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const res = await createFood(formData);
    setSaving(false);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success("Namirnica dodana");
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
      toast.error(res.error);
      return;
    }

    toast.success("Namirnica ažurirana");
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await deleteFood(id);

    if ("error" in res) {
      toast.error(res.error);
      return;
    }

    toast.success("Namirnica obrisana");
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
                <Label className="mb-1 text-xs">Naziv *</Label>
                <Input
                  name="name"
                  required
                  defaultValue={food?.name ?? ""}
                  placeholder="npr. Piletina prsa"
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">Kategorija</Label>
                <select
                  name="category"
                  className={selectClass}
                  defaultValue={food?.category ?? ""}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c || "—"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label className="mb-1 text-xs">Kalorije /100g</Label>
                <Input
                  name="calories_per_100g"
                  type="number"
                  step="0.01"
                  defaultValue={food?.calories_per_100g ?? ""}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">Proteini /100g</Label>
                <Input
                  name="protein_per_100g"
                  type="number"
                  step="0.01"
                  defaultValue={food?.protein_per_100g ?? ""}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">UH /100g</Label>
                <Input
                  name="carbs_per_100g"
                  type="number"
                  step="0.01"
                  defaultValue={food?.carbs_per_100g ?? ""}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1 text-xs">Masti /100g</Label>
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
                {food ? "Spremi" : "Dodaj"}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel}>
                <X size={14} /> Odustani
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
        <h1 className="text-2xl font-bold">Food Database</h1>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus size={14} /> Dodaj namirn.
          </Button>
        )}
      </div>

      {showAddForm && (
        <FoodForm
          onSubmit={handleCreate}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži namirnice..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {search ? "Nema rezultata." : "Nema namirnica. Dodajte prvu iznad."}
        </p>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-800 md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">Naziv</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">Kategorija</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-400">Kcal</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-400">P</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-400">UH</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-400">M</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-400">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) =>
                  editingId === f.id ? (
                    <tr key={f.id}>
                      <td colSpan={7} className="p-0">
                        <FoodForm
                          food={f}
                          onSubmit={(e) => handleUpdate(e, f.id)}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={f.id} className="border-b border-gray-800/50 last:border-0">
                      <td className="px-3 py-2 font-medium text-gray-200">
                        <span className="flex items-center gap-2">
                          {f.name}
                          {f.is_preset && (
                            <Badge variant="outline" className="text-[10px]">
                              Preset
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400">{f.category || "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-300">{f.calories_per_100g}</td>
                      <td className="px-3 py-2 text-right text-gray-300">{f.protein_per_100g}</td>
                      <td className="px-3 py-2 text-right text-gray-300">{f.carbs_per_100g}</td>
                      <td className="px-3 py-2 text-right text-gray-300">{f.fat_per_100g}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-xs" onClick={() => setEditingId(f.id)}>
                            <Pencil size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteTarget({ id: f.id, name: f.name })}
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
            {filtered.map((f) =>
              editingId === f.id ? (
                <FoodForm
                  key={f.id}
                  food={f}
                  onSubmit={(e) => handleUpdate(e, f.id)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <Card key={f.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-200">{f.name}</h3>
                          {f.is_preset && (
                            <Badge variant="outline" className="text-[10px]">
                              Preset
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                          {f.category && (
                            <Badge variant="secondary" className="text-xs">
                              {f.category}
                            </Badge>
                          )}
                          <span>{f.calories_per_100g} kcal</span>
                          <span>{f.protein_per_100g}P</span>
                          <span>{f.carbs_per_100g}UH</span>
                          <span>{f.fat_per_100g}M</span>
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => setEditingId(f.id)}>
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget({ id: f.id, name: f.name })}
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
        title={`Obriši "${deleteTarget?.name}"?`}
        description="Ova namirnica će biti trajno obrisana."
        confirmLabel="Obriši"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
