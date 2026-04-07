"use client";

import { useState, useEffect } from "react";
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
      toast.success(`Podsjetnik poslan (${result.sent})`);
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
    { label: "Kalorije", value: targets.target_calories, unit: "kcal" },
    { label: "Proteini", value: targets.target_protein_g, unit: "g" },
    { label: "UH", value: targets.target_carbs_g, unit: "g" },
    { label: "Masti", value: targets.target_fat_g, unit: "g" },
    { label: "Koraci", value: targets.target_steps, unit: "" },
    { label: "San", value: targets.target_sleep_h, unit: "h" },
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
          {!client.is_active && <Badge variant="secondary">Neaktivan</Badge>}
        </div>
        {client.start_date != null && (
          <p className="mt-1 text-sm text-gray-400">
            Početak:{" "}
            {new Date(
              (client.start_date as string) + "T00:00"
            ).toLocaleDateString("hr-HR")}
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
            {sendingReminder ? "Šaljem..." : "Pošalji podsjetnik"}
          </Button>
        </div>
      </div>

      {/* Targets grid */}
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {targetCards.map((t) => (
          <Card key={t.label} size="sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-400">{t.label}</p>
              <p className="text-lg font-semibold">
                {t.value != null ? t.value : "—"}
                {t.value != null && t.unit && (
                  <span className="text-xs text-gray-500"> {t.unit}</span>
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
          <Pencil size={14} /> Uredi ciljeve
        </Button>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {targetField("Kalorije", "target_calories", "kcal")}
              {targetField("Proteini", "target_protein_g", "g")}
              {targetField("UH", "target_carbs_g", "g")}
              {targetField("Masti", "target_fat_g", "g")}
              {targetField("Koraci", "target_steps", "")}
              {targetField("San", "target_sleep_h", "h")}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSaveTargets} disabled={saving}>
                <Save size={14} /> Spremi
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditingTargets(false)}
              >
                <X size={14} /> Odustani
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/coach/clients/${client.id}/program`}>
          <Button variant="outline" size="sm">
            <Dumbbell size={14} /> Program Builder
          </Button>
        </Link>
        <Link href={`/coach/clients/${client.id}/phases`}>
          <Button variant="outline" size="sm">
            <Layers size={14} /> Phase Manager
          </Button>
        </Link>
        <Link href={`/coach/clients/${client.id}/meal-plan`}>
          <Button variant="outline" size="sm">
            <UtensilsCrossed size={14} /> Plan prehrane
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logs">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="logs">Dnevni logovi</TabsTrigger>
          <TabsTrigger value="checkins">Prijave</TabsTrigger>
          <TabsTrigger value="measurements">Mjerenja</TabsTrigger>
          <TabsTrigger value="notes">Bilješke</TabsTrigger>
          <TabsTrigger value="photos">Fotografije</TabsTrigger>
        </TabsList>

        {/* LOGS TAB */}
        <TabsContent value="logs">
          {weightData.length >= 2 && (
            <div className="mb-4 rounded-lg border border-gray-800 p-4">
              <p className="mb-2 text-xs text-gray-400">Trend težine</p>
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
                    formatter={(v) => [`${v} kg`, "Težina"]}
                    labelFormatter={(l) =>
                      new Date(String(l) + "T00:00").toLocaleDateString("hr-HR")
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
            <p className="py-8 text-center text-gray-500">Nema dnevnih logova.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-400">
                      Datum
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Težina
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Kcal
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Proteini
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Koraci
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      San
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
                        ).toLocaleDateString("hr-HR")}
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
            <p className="py-8 text-center text-gray-500">Nema prijava.</p>
          ) : (
            <Accordion>
              {checkins.map((ci) => (
                <AccordionItem key={ci.id as string} value={ci.id as string}>
                  <AccordionTrigger className="px-2">
                    <div className="flex items-center gap-3">
                      <span>
                        {new Date(
                          (ci.checkin_date as string) + "T00:00"
                        ).toLocaleDateString("hr-HR")}
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
                          <span className="text-gray-500">Energija:</span>{" "}
                          {ci.energy_level as number}/10
                        </div>
                      )}
                      {ci.stress_level != null && (
                        <div>
                          <span className="text-gray-500">Stres:</span>{" "}
                          {ci.stress_level as number}/10
                        </div>
                      )}
                      {ci.motivation != null && (
                        <div>
                          <span className="text-gray-500">Motivacija:</span>{" "}
                          {ci.motivation as number}/10
                        </div>
                      )}
                      {ci.sleep_quality != null && (
                        <div>
                          <span className="text-gray-500">Kvaliteta sna:</span>{" "}
                          {ci.sleep_quality as number}/10
                        </div>
                      )}
                      {ci.appetite != null && (
                        <div>
                          <span className="text-gray-500">Apetit:</span>{" "}
                          {ci.appetite as number}/10
                        </div>
                      )}
                      {ci.adherence_diet_pct != null && (
                        <div>
                          <span className="text-gray-500">Prehrana:</span>{" "}
                          {ci.adherence_diet_pct as number}%
                        </div>
                      )}
                    </div>
                    {ci.pain_discomfort && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          Bol / nelagoda
                        </span>
                        <p className="text-gray-300">
                          {ci.pain_discomfort as string}
                        </p>
                      </div>
                    )}
                    {ci.what_went_well && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          Što je bilo dobro
                        </span>
                        <p className="text-gray-300">
                          {ci.what_went_well as string}
                        </p>
                      </div>
                    )}
                    {ci.challenges && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          Izazovi
                        </span>
                        <p className="text-gray-300">
                          {ci.challenges as string}
                        </p>
                      </div>
                    )}
                    {ci.goals_next_week && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          Ciljevi za sljedeći tjedan
                        </span>
                        <p className="text-gray-300">
                          {ci.goals_next_week as string}
                        </p>
                      </div>
                    )}
                    {ci.questions_for_coach && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-gray-500">
                          Pitanja za trenera
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
            <p className="py-8 text-center text-gray-500">Nema mjerenja.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-400">
                      Datum
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Vrat
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Prsa
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Struk
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Bokovi
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Ruka L
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Ruka D
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Bedro L
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      Bedro D
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">
                      BF%
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
                        ).toLocaleDateString("hr-HR")}
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
              <Label className="mb-2">Bilješke</Label>
              <Textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bilješke o klijentu..."
              />
            </div>
            <div>
              <Label className="mb-2">Ozljede</Label>
              <Textarea
                rows={4}
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder="Ozljede, ograničenja..."
              />
            </div>
            <Button onClick={handleSaveNotes} disabled={saving}>
              <Save size={14} /> {saving ? "Spremam..." : "Spremi"}
            </Button>
            {notesSaved && (
              <span className="ml-3 text-sm text-green-400">Spremljeno!</span>
            )}
          </div>
        </TabsContent>

        {/* PHOTOS TAB */}
        <TabsContent value="photos">
          {photos.length === 0 ? (
            <p className="py-8 text-center text-gray-500">Nema fotografija.</p>
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
                      ).toLocaleDateString("hr-HR")}
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
