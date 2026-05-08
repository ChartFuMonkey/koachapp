"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getProfile,
  updateProfile,
  getProfileDashboard,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar } from "@/components/ui/athletic/avatar";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Num } from "@/components/ui/athletic/num";

type Profile = {
  full_name: string | null;
  email: string | undefined;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
};

type Dashboard = {
  targets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    steps: number | null;
    sleep: number | null;
  } | null;
  phase: { name: string; type: string | null; start_date: string } | null;
  start_date: string | null;
  start_weight: number | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const t = useTranslations("app.profile");
  const tErrors = useTranslations("app.profile.errors");
  const tCommon = useTranslations("common");
  const tCommonErrors = useTranslations("errors");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  function translateError(code: string): string {
    if (code === "unauthenticated") return tCommonErrors("unauthenticated");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return tErrors(code as any);
    } catch {
      return tCommonErrors("genericLoad");
    }
  }

  useEffect(() => {
    async function load() {
      const [profileResult, dashResult] = await Promise.all([
        getProfile(),
        getProfileDashboard(),
      ]);
      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (dashResult.data) setDashboard(dashResult.data as Dashboard);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!profile?.full_name?.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setSaving(true);
    const result = await updateProfile({
      full_name: profile.full_name.trim(),
      height_cm: profile.height_cm,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
    });
    if (result.error) {
      toast.error(translateError(result.error));
    } else {
      toast.success(t("profileUpdatedToast"));
    }
    setSaving(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-ink-3" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-ink-3">{t("notFound")}</div>
    );
  }

  const bcp47 = locale === "en" ? "en-US" : "hr-HR";
  const fullName = profile.full_name || "—";

  return (
    <div className="px-5 pt-5 pb-6">
      {/* Avatar header with accent glow */}
      <div className="relative flex flex-col items-center pt-2 pb-5">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 -z-10 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center top, rgba(197,247,59,0.18), transparent 60%)",
          }}
        />
        <Avatar name={fullName} size="xl" />
        <h1 className="mt-3 text-[22px] font-semibold leading-tight text-ink tracking-tight">
          {fullName}
        </h1>
        {profile.email && (
          <p className="mt-0.5 font-mono text-[11px] text-ink-3">
            {profile.email}
          </p>
        )}
        {dashboard?.phase && (
          <Chip variant="ghost" className="mt-2">
            {dashboard.phase.name.toUpperCase()}
          </Chip>
        )}
      </div>

      {/* 3-up stat strip */}
      {dashboard && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <MicroLabel>START</MicroLabel>
            <p className="mt-1.5 font-mono text-[20px] font-semibold text-ink tabular-nums leading-none">
              <Num value={dashboard.start_weight} decimals={1} />
            </p>
            <p className="mt-1 font-mono text-[10px] text-ink-3">kg</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <MicroLabel>HEIGHT</MicroLabel>
            <p className="mt-1.5 font-mono text-[20px] font-semibold text-ink tabular-nums leading-none">
              <Num value={profile.height_cm} />
            </p>
            <p className="mt-1 font-mono text-[10px] text-ink-3">cm</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <MicroLabel>SINCE</MicroLabel>
            <p className="mt-1.5 font-mono text-[14px] font-semibold text-ink leading-none whitespace-nowrap">
              {dashboard.start_date
                ? new Date(
                    dashboard.start_date + "T00:00"
                  ).toLocaleDateString(bcp47, {
                    day: "2-digit",
                    month: "short",
                  })
                : "—"}
            </p>
            <p className="mt-1 font-mono text-[10px] text-ink-3">
              {dashboard.start_date
                ? new Date(dashboard.start_date + "T00:00").getFullYear()
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* Targets summary */}
      {dashboard?.targets && (
        <div className="rounded-xl border border-border bg-card p-4 mb-5">
          <MicroLabel>TARGETS</MicroLabel>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[12px]">
            {[
              ["targetCalories", dashboard.targets.calories, "kcal"],
              ["targetProtein", dashboard.targets.protein, "g"],
              ["targetCarbs", dashboard.targets.carbs, "g"],
              ["targetFat", dashboard.targets.fat, "g"],
              ["targetSteps", dashboard.targets.steps, ""],
              ["targetSleep", dashboard.targets.sleep, "h"],
            ].map(([key, value, unit]) => (
              <div
                key={key as string}
                className="flex items-baseline justify-between"
              >
                <span className="text-ink-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {t(key as any)}
                </span>
                <span className="text-ink tabular-nums">
                  {value != null ? value : "—"}
                  {unit ? <span className="text-ink-3 ml-0.5">{unit as string}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit profile */}
      <div className="rounded-xl border border-border bg-card p-4 mb-5">
        <MicroLabel>{t("editTitle").toUpperCase()}</MicroLabel>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="full_name" className="text-xs text-ink-3 mb-1 inline-block">
              {t("fullName")}
            </Label>
            <Input
              id="full_name"
              value={profile.full_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs text-ink-3 mb-1 inline-block">
              {tCommon("email")}
            </Label>
            <Input
              id="email"
              value={profile.email || ""}
              disabled
              className="text-ink-3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="dob"
                className="text-xs text-ink-3 mb-1 inline-block"
              >
                {t("dateOfBirth")}
              </Label>
              <Input
                id="dob"
                type="date"
                value={profile.date_of_birth || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    date_of_birth: e.target.value || null,
                  })
                }
              />
            </div>
            <div>
              <Label
                htmlFor="height"
                className="text-xs text-ink-3 mb-1 inline-block"
              >
                {t("heightCm")}
              </Label>
              <Input
                id="height"
                type="number"
                value={profile.height_cm ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    height_cm: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-ink-3 mb-1 inline-block">
              {t("gender")}
            </Label>
            <div className="flex gap-2">
              {(["M", "F"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setProfile({ ...profile, gender: g })}
                  className={`flex-1 rounded-lg border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                    profile.gender === g
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-ink-3 hover:border-hairline-2"
                  }`}
                >
                  {g === "M" ? t("male") : t("female")}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleSave}
            size="lg"
            disabled={saving}
            className="w-full mt-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </div>

      {/* Language */}
      <div className="rounded-xl border border-border bg-card p-4 mb-5 flex items-center justify-between">
        <span className="text-sm text-ink-2">{t("language")}</span>
        <LanguageSwitcher />
      </div>

      {/* Sign out */}
      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={signingOut}
        size="lg"
        className="w-full text-danger border-danger/30 hover:bg-danger/10"
      >
        <LogOut className="size-4" />
        {signingOut ? t("signOutLoading") : t("signOut")}
      </Button>
    </div>
  );
}
