"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getThisWeekCheckin,
  submitCheckin,
  type CheckinData,
} from "@/actions/checkin";

/* eslint-disable @typescript-eslint/no-explicit-any */
type CheckinRow = Record<string, any>;

export default function CheckinPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<CheckinRow | null>(null);

  // Form state
  const [energyLevel, setEnergyLevel] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [motivation, setMotivation] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [appetite, setAppetite] = useState(5);
  const [adherenceDietPct, setAdherenceDietPct] = useState("");
  const [adherenceTraining, setAdherenceTraining] = useState(false);
  const [whatWentWell, setWhatWentWell] = useState("");
  const [challenges, setChallenges] = useState("");
  const [goalsNextWeek, setGoalsNextWeek] = useState("");
  const [questionsForCoach, setQuestionsForCoach] = useState("");
  const [overallRating, setOverallRating] = useState(5);

  useEffect(() => {
    async function load() {
      const result = await getThisWeekCheckin();
      if (result.data) {
        setSubmitted(result.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const data: CheckinData = {
      energy_level: energyLevel,
      stress_level: stressLevel,
      motivation,
      sleep_quality: sleepQuality,
      appetite,
      adherence_diet_pct: adherenceDietPct.trim()
        ? Number(adherenceDietPct)
        : null,
      adherence_training: adherenceTraining,
      what_went_well: whatWentWell.trim() || null,
      challenges: challenges.trim() || null,
      goals_next_week: goalsNextWeek.trim() || null,
      questions_for_coach: questionsForCoach.trim() || null,
      overall_rating: overallRating,
    };

    const result = await submitCheckin(data);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Tjedna prijava poslana!");
      setSubmitted({
        ...data,
        checkin_date: new Date().toISOString().split("T")[0],
      });
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Read-only view for already-submitted check-in
  if (submitted) {
    return (
      <div className="p-4 pb-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold">Tjedna prijava</h1>
          <Badge className="border-green-500/30 bg-green-500/20 text-green-400">
            <CheckCircle size={14} className="mr-1" />
            Prijava predana
          </Badge>
        </div>

        {submitted.checkin_date && (
          <p className="mb-4 text-sm text-gray-400">
            {new Date(
              (submitted.checkin_date as string) + "T00:00"
            ).toLocaleDateString("hr-HR")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label="Energija" value={submitted.energy_level} max={10} />
          <MetricCard label="Stres" value={submitted.stress_level} max={10} />
          <MetricCard label="Motivacija" value={submitted.motivation} max={10} />
          <MetricCard
            label="Kvaliteta sna"
            value={submitted.sleep_quality}
            max={10}
          />
          <MetricCard label="Apetit" value={submitted.appetite} max={10} />
          <MetricCard
            label="Prehrana"
            value={submitted.adherence_diet_pct}
            unit="%"
          />
          <MetricCard
            label="Plan treninga"
            value={submitted.adherence_training ? "Da" : "Ne"}
          />
          <MetricCard
            label="Ocjena tjedna"
            value={submitted.overall_rating}
            max={10}
          />
        </div>

        <div className="mt-6 space-y-4">
          {submitted.what_went_well && (
            <TextBlock
              label="Sto je islo dobro"
              text={submitted.what_went_well as string}
            />
          )}
          {submitted.challenges && (
            <TextBlock
              label="Izazovi"
              text={submitted.challenges as string}
            />
          )}
          {submitted.goals_next_week && (
            <TextBlock
              label="Ciljevi za sljedeci tjedan"
              text={submitted.goals_next_week as string}
            />
          )}
          {submitted.questions_for_coach && (
            <TextBlock
              label="Pitanja za trenera"
              text={submitted.questions_for_coach as string}
            />
          )}
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div className="p-4 pb-8">
      <h1 className="mb-6 text-2xl font-bold">Tjedna prijava</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <SliderField
          label="Razina energije"
          value={energyLevel}
          onChange={setEnergyLevel}
        />
        <SliderField
          label="Razina stresa"
          value={stressLevel}
          onChange={setStressLevel}
        />
        <SliderField
          label="Motivacija"
          value={motivation}
          onChange={setMotivation}
        />
        <SliderField
          label="Kvaliteta sna"
          value={sleepQuality}
          onChange={setSleepQuality}
        />
        <SliderField
          label="Apetit"
          value={appetite}
          onChange={setAppetite}
        />

        {/* Diet adherence */}
        <div>
          <Label htmlFor="diet-pct">Uskladenost s prehranom (%)</Label>
          <Input
            id="diet-pct"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={adherenceDietPct}
            onChange={(e) => setAdherenceDietPct(e.target.value)}
            placeholder="npr. 80"
            className="mt-1 h-10 text-base"
          />
        </div>

        {/* Training adherence checkbox */}
        <div className="flex items-center gap-3">
          <input
            id="training"
            type="checkbox"
            checked={adherenceTraining}
            onChange={(e) => setAdherenceTraining(e.target.checked)}
            className="size-5 rounded border-gray-600 bg-gray-800 accent-blue-500"
          />
          <Label htmlFor="training" className="cursor-pointer">
            Jesi li pratio/la plan treninga?
          </Label>
        </div>

        {/* Textareas */}
        <TextareaField
          label="Sto je ove tjedne islo dobro?"
          value={whatWentWell}
          onChange={setWhatWentWell}
        />
        <TextareaField
          label="Koji su bili izazovi?"
          value={challenges}
          onChange={setChallenges}
        />
        <TextareaField
          label="Ciljevi za sljedeci tjedan"
          value={goalsNextWeek}
          onChange={setGoalsNextWeek}
        />
        <TextareaField
          label="Pitanja za trenera"
          value={questionsForCoach}
          onChange={setQuestionsForCoach}
        />

        {/* Overall rating */}
        <SliderField
          label="Sveukupna ocjena tjedna"
          value={overallRating}
          onChange={setOverallRating}
        />

        {/* Submit */}
        <Button
          type="submit"
          disabled={saving}
          className="h-12 w-full text-base font-semibold"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              Saljem...
            </>
          ) : (
            "Posalji prijavu"
          )}
        </Button>
      </form>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>
        {label}: <span className="text-blue-400">{value}</span>/10
      </Label>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-blue-500"
      />
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Opcionalno..."
        className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: any;
  max?: number;
  unit?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="p-3 text-center">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-semibold">
          {value != null ? value : "\u2014"}
          {max && <span className="text-xs text-gray-500">/{max}</span>}
          {unit && <span className="text-xs text-gray-500"> {unit}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-gray-300">{text}</p>
    </div>
  );
}
