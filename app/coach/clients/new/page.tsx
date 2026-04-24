"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNewClient } from "@/actions/coach";
import { Loader2, ArrowRight, Mail } from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();
  const t = useTranslations("coach.clients.new");
  const tErrors = useTranslations("coach.clients.new.errors");
  const tCommonErrors = useTranslations("errors");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    email: string;
  } | null>(null);

  function translateError(code: string): string {
    if (code === "unauthenticated") return tCommonErrors("unauthenticated");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return tErrors(code as any);
    } catch {
      return tCommonErrors("genericSave");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createNewClient(formData);

    setLoading(false);

    if ("error" in res) {
      setError(translateError(res.error as string));
      return;
    }

    setResult(res as { id: string; email: string });
  }

  // Success screen — invite sent
  if (result) {
    return (
      <div className="mx-auto max-w-md py-12">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-500/20">
                <Mail size={20} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-green-400">
                {t("successTitle")}
              </h2>
            </div>

            <div className="rounded-lg bg-gray-900 p-4">
              <p className="text-sm text-gray-300">
                {t("inviteSent")}{" "}
                <span className="font-semibold text-white">
                  {result.email}
                </span>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {t("inviteHint")}
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => router.push(`/coach/clients/${result.id}`)}
            >
              {t("goToProfile")} <ArrowRight size={14} />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-5 p-6">
            {/* Identity */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1">{t("emailLabel")} *</Label>
                <Input name="email" type="email" required />
              </div>
              <div>
                <Label className="mb-1">{t("fullNameLabel")} *</Label>
                <Input name="full_name" required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label className="mb-1">{t("dobLabel")}</Label>
                <Input name="date_of_birth" type="date" />
              </div>
              <div>
                <Label className="mb-1">{t("genderLabel")}</Label>
                <select
                  name="gender"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="">—</option>
                  <option value="M">{t("genderMale")}</option>
                  <option value="F">{t("genderFemale")}</option>
                  <option value="other">{t("genderOther")}</option>
                </select>
              </div>
              <div>
                <Label className="mb-1">{t("heightLabel")}</Label>
                <Input name="height_cm" type="number" step="0.1" />
              </div>
            </div>

            {/* Weight */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1">{t("startWeightLabel")}</Label>
                <Input name="start_weight_kg" type="number" step="0.1" />
              </div>
              <div>
                <Label className="mb-1">{t("targetWeightLabel")}</Label>
                <Input name="target_weight_kg" type="number" step="0.1" />
              </div>
            </div>

            {/* Targets */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <Label className="mb-1">{t("caloriesLabel")}</Label>
                <Input name="target_calories" type="number" />
              </div>
              <div>
                <Label className="mb-1">{t("proteinLabel")}</Label>
                <Input name="target_protein_g" type="number" />
              </div>
              <div>
                <Label className="mb-1">{t("carbsLabel")}</Label>
                <Input name="target_carbs_g" type="number" />
              </div>
              <div>
                <Label className="mb-1">{t("fatLabel")}</Label>
                <Input name="target_fat_g" type="number" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1">{t("notesLabel")}</Label>
              <Textarea name="notes" rows={3} placeholder={t("notesPlaceholder")} />
            </div>
            <div>
              <Label className="mb-1">{t("injuriesLabel")}</Label>
              <Textarea
                name="injuries"
                rows={2}
                placeholder={t("injuriesPlaceholder")}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> {t("submitLoading")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
