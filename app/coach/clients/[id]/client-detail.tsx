"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import { updateClientNotes, updateClientTargets } from "@/actions/coach";
import { sendReminder } from "@/actions/send-reminder";
import { Save, Pencil, X, Dumbbell, Layers, Bell, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

type Props = {
  client: Row;
  profile: Row;
  phase: Row | null;
  logs: Row[];
  checkins: Row[];
  measurements: Row[];
  photos: Row[];
};

export default function ClientDetail({
  client,
  profile,
  phase,
  logs,
  checkins,
  measurements,
  photos,
}: Props) {
  const t = useTranslations("coach.clients.detail");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  const [editingTargets, setEditingTargets] = useState(false);
  const [notes, setNotes] = useState((client.notes as string) || "");
  const [injuries, setInjuries] = useState((client.injuries as string) || "");
  const [saving, setSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const [targets, setTargets] = useState({
    target_calories: client.target_calories as number | null,
    target_protein_g: client.target_protein_g as number | null,
    target_carbs_g: client.target_carbs_g as number | null,
    target_fat_g: client.target_fat_g as number | null,
    target_steps: client.target_steps as number | null,
    target_sleep_h: client.target_sleep_h as number | null,
  });

  // Clean up notesSaved timer
  useEffect(() => {
    if (!notesSaved) return;
    const timer = setTimeout(() => setNotesSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [notesSaved]);

  const weightData = logs
    .filter((l) => l.weight_kg != null)
    .reverse()
    .map((l) => ({
      date: l.log_date as string,
      weight_kg: Number(l.weight_kg),
    }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function handleSendReminder() {
    setSendingReminder(true);
    const result = await sendReminder(client.id as string);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(t("reminderSentToast", { count: result.sent }));
    }
    setSendingReminder(false);
  }

  async function handleSaveNotes() {
    setSaving(true);
    await updateClientNotes(client.id as string, notes, injuries);
    setSaving(false);
    setNotesSaved(true);
  }

  async function handleSaveTargets() {
    setSaving(true);
    await updateClientTargets(client.id as string, targets);
    setSaving(false);
    setEditingTargets(false);
  }

  function targetField(
    label: string,
    key: keyof typeof targets,
    unit: string
  ) {
    return (
      <div>
        <Label className="mb-1 text-xs text-gray-400">
          {label} ({unit})
        </Label>
        <Input
          type="number"
          value={targets[key] ?? ""}
          onChange={(e) =>
            setTargets((t) => ({
              ...t,
              [key]: e.target.value ? parseFloat(e.target.value) : null,
            }))
          }
        />
      </div>
    );
  }

  const targetCards = [
    { label: t("targetCalories"), value: targets.target_calories, unit: "kcal" },
    { label: t("targetProtein"), value: targets.target_protein_g, unit: "g" },
    { label: t("targetCarbs"), value: targets.target_carbs_g, unit: "g" },
    { label: t("targetFat"), value: targets.target_fat_g, unit: "g" },
    { label: t("targetSteps"), value: targets.target_steps, unit: "" },
    { label: t("targetSleep"), value: targets.target_sleep_h, unit: "h" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {profile.full_name as string}
          </h1>
          {phase && (
            <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">
              {phase.name as string}
            </Badge>
          )}
          {!client.is_active && <Badge variant="secondary">{t("inactive")}</Badge>}
        </div>
        {client.start_date != null && (
          <p className="mt-1 text-sm text-gray-400">
            {t("startDate")}{" "}
            {new Date(
              (client.start_date as string) + "T00:00"
            ).toLocaleDateString(bcp47)}
          </p>
        )}
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            <Bell size={14} />{" "}
            {sendingReminder ? t("sendReminderLoading") : t("sendReminder")}
          </Button>
        </div>
      </div>

      {/* Targets grid */}
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {targetCards.map((tc) => (
          <Card key={tc.label} size="sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-400">{tc.label}</p>
              <p className="text-lg font-semibold">
                {tc.value != null ? tc.value : "—"}
                {tc.value != null && tc.unit && (
                  <span className="text-xs text-gray-500"> {tc.unit}</span>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit targets */}
      {!editingTargets ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingTargets(true)}
          className="mb-6"
        >
          <Pencil size={14} /> {t("editTargets")}
        </Button>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {targetField(t("targetCalories"), "target_calories", "kcal")}
              {targetField(t("targetProtein"), "target_protein_g", "g")}
              {targetField(t("targetCarbs"), "target_carbs_g", "g")}
              {targetField(t("targetFat"), "target_fat_g", "g")}
              {targetField(t("targetSteps"), "target_steps", "")}
              {targetField(t("targetSleep"), "target_sleep_h", "h")}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSaveTargets} disabled={saving}>
                <Save size={14} /> {t("saveTargets")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditingTargets(false)}
              >
                <X size={14} /> {t("cancelEdit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/coach/clients/${client.id}/program`}>
          <Button variant="outline" size="sm">
            <Dumbbell size={14} /> {t("programBuilder")}
          </Button>
        </Link>
        <Link href={`/coach/clients/${client.id}/phases`}>
          <Button variant="outline" size="sm">
            <Layers size={14} /> {t("phaseManager")}
          </Button>
        </Link>
        <Link href={`/coach/clients/${client.id}/meal-plan`}>
          <Button variant="outline" size="sm">
            <UtensilsCrossed size={14} /> {t("mealPlan")}
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logs">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="logs">{t("tabLogs")}</TabsTrigger>
          <TabsTrigger value="checkins">{t("tabCheckins")}</TabsTrigger>
          <TabsTrigger value="measurements">{t("tabMeasurements")}</TabsTrigger>
          <TabsTrigger value="notes">{t("tabNotes")}</TabsTrigger>
          <TabsTrigger value="photos">{t("tabPhotos")}</TabsTrigger>
        </TabsList>

        {/* LOGS TAB */}
        <TabsContent value="logs">
          {weightData.length >= 2 && (
            <div className="mb-4 rounded-lg border border-gray-800 p-4">
              <p className="mb-2 text-xs text-gray-400">{t("weightTrend")}</p>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={weightData}>
                  <YAxis domain={["dataMin - 0.5", "dataMax + 0.5"]} hide />
                  <Tooltip
                    contentStyle={{
                      background: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(v) => [`${v} kg`, t("weightLabel")]}
                    labelFormatter={(l) =>
                      new Date(String(l) + "T00:00").toLocaleDateString(bcp47)
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="weight_kg"
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {logs.length === 0 ? (
            <p className="py-8 text-center text-gray-500">{t("noLogs")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-400">
                      {t("colDate")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colWeight")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colKcal")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colProtein")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colSteps")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colSleep")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr
                      key={l.id as string}
                      className="border-b border-gray-800/50 last:border-0"
                    >
                      <td className="px-3 py-2 text-gray-300">
                        {new Date(
                          (l.log_date as string) + "T00:00"
                        ).toLocaleDateString(bcp47)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {l.weight_kg != null ? `${l.weight_kg}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {l.calories_kcal != null ? l.calories_kcal : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {l.protein_g != null ? `${l.protein_g}g` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {l.steps != null
                          ? (l.steps as number).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {l.sleep_h != null ? `${l.sleep_h}h` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* CHECKINS TAB */}
        <TabsContent value="checkins">
          {checkins.length === 0 ? (
            <p className="py-8 text-center text-gray-500">{t("noCheckins")}</p>
          ) : (
            <Accordion>
              {checkins.map((ci) => (
                <AccordionItem key={ci.id as string} value={ci.id as string}>
                  <AccordionTrigger className="px-2">
                    <div className="flex items-center gap-3">
                      <span>
                        {new Date(
                          (ci.checkin_date as string) + "T00:00"
                        ).toLocaleDateString(bcp47)}
                      </span>
                      {ci.overall_rating != null && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {ci.overall_rating as number}/10
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      {ci.energy_level != null && (
                        <div>
                          <span className="text-gray-500">{t("ciEnergy")}:</span>{" "}
                          {ci.energy_level as number}/10
                        </div>
                      )}
                      {ci.stress_level != null && (
                        <div>
                          <span className="text-gray-500">{t("ciStress")}:</span>{" "}
                          {ci.stress_level as number}/10
                        </div>
                      )}
                      {ci.motivation != null && (
                        <div>
                          <span className="text-gray-500">{t("ciMotivation")}:</span>{" "}
                          {ci.motivation as number}/10
                        </div>
                      )}
                      {ci.sleep_quality != null && (
                        <div>
                          <span className="text-gray-500">{t("ciSleepQuality")}:</span>{" "}
                          {ci.sleep_quality as number}/10
                        </div>
                      )}
                      {ci.appetite != null && (
                        <div>
                          <span className="text-gray-500">{t("ciAppetite")}:</span>{" "}
                          {ci.appetite as number}/10
                        </div>
                      )}
                      {ci.adherence_diet_pct != null && (
                        <div>
                          <span className="text-gray-500">{t("ciDiet")}:</span>{" "}
                          {ci.adherence_diet_pct as number}%
                        </div>
                      )}
                    </div>
                    {ci.pain_discomfort && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          {t("ciPain")}
                        </span>
                        <p className="text-gray-300">
                          {ci.pain_discomfort as string}
                        </p>
                      </div>
                    )}
                    {ci.what_went_well && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          {t("ciWhatWentWell")}
                        </span>
                        <p className="text-gray-300">
                          {ci.what_went_well as string}
                        </p>
                      </div>
                    )}
                    {ci.challenges && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          {t("ciChallenges")}
                        </span>
                        <p className="text-gray-300">
                          {ci.challenges as string}
                        </p>
                      </div>
                    )}
                    {ci.goals_next_week && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          {t("ciGoalsNextWeek")}
                        </span>
                        <p className="text-gray-300">
                          {ci.goals_next_week as string}
                        </p>
                      </div>
                    )}
                    {ci.questions_for_coach && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          {t("ciQuestionsForCoach")}
                        </span>
                        <p className="text-gray-300">
                          {ci.questions_for_coach as string}
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        {/* MEASUREMENTS TAB */}
        <TabsContent value="measurements">
          {measurements.length === 0 ? (
            <p className="py-8 text-center text-gray-500">{t("noMeasurements")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-400">
                      {t("colDate")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colNeck")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colChest")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colWaist")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colHips")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colArmL")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colArmR")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colThighL")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colThighR")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      {t("colBfPct")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m) => (
                    <tr
                      key={m.id as string}
                      className="border-b border-gray-800/50 last:border-0"
                    >
                      <td className="px-3 py-2 text-gray-300">
                        {new Date(
                          (m.meas_date as string) + "T00:00"
                        ).toLocaleDateString(bcp47)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.neck_cm ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.chest_cm ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.waist_cm ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.hips_cm ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.arm_l_cm ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.arm_r_cm ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.thigh_l_cm ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.thigh_r_cm ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        {m.body_fat_pct != null ? `${m.body_fat_pct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes">
          <div className="max-w-2xl space-y-4">
            <div>
              <Label className="mb-2">{t("notesLabel")}</Label>
              <Textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
              />
            </div>
            <div>
              <Label className="mb-2">{t("injuriesLabel")}</Label>
              <Textarea
                rows={4}
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder={t("injuriesPlaceholder")}
              />
            </div>
            <Button onClick={handleSaveNotes} disabled={saving}>
              <Save size={14} /> {saving ? t("savingNotes") : t("saveNotes")}
            </Button>
            {notesSaved && (
              <span className="ml-3 text-sm text-green-400">{t("notesSaved")}</span>
            )}
          </div>
        </TabsContent>

        {/* PHOTOS TAB */}
        <TabsContent value="photos">
          {photos.length === 0 ? (
            <p className="py-8 text-center text-gray-500">{t("noPhotos")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id as string} className="overflow-hidden rounded-lg border border-gray-800">
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/progress-photos/${p.storage_path as string}`}
                    alt={`${p.angle || "photo"} - ${p.photo_date}`}
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs text-gray-400">
                      {new Date(
                        (p.photo_date as string) + "T00:00"
                      ).toLocaleDateString(bcp47)}
                    </p>
                    {p.angle && (
                      <p className="text-xs text-gray-500">{p.angle as string}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
