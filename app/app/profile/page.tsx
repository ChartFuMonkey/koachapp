"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getProfile,
  getProfileDashboard,
} from "@/actions/profile";
import { LanguageSwitcher } from "@/components/language-switcher";
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

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const t = useTranslations("app.profile");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [workoutCount, setWorkoutCount] = useState<number>(0);
  const [logCount, setLogCount] = useState<number>(0);

  useEffect(() => {
    async function load() {
      const [profileResult, dashResult] = await Promise.all([
        getProfile(),
        getProfileDashboard(),
      ]);
      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (dashResult.data) setDashboard(dashResult.data as Dashboard);

      // Calculate streak + counts client-side via supabase
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: logs } = await supabase
          .from("daily_logs")
          .select("log_date")
          .eq("client_id", user.id)
          .order("log_date", { ascending: false })
          .limit(365);
        const { count: wc } = await supabase
          .from("workout_sessions")
          .select("*", { count: "exact", head: true })
          .eq("client_id", user.id)
          .not("duration_min", "is", null);
        setWorkoutCount(wc ?? 0);
        setLogCount(logs?.length ?? 0);

        if (logs) {
          const dates = new Set(logs.map((l) => l.log_date as string));
          let count = 0;
          for (let i = 0; i < 365; i++) {
            const d = new Date(Date.now() - i * 86400000)
              .toISOString()
              .slice(0, 10);
            if (dates.has(d)) {
              count++;
            } else if (i > 0) {
              break;
            } else {
              break;
            }
          }
          setStreak(count);
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success(t("signOutLoading"));
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
      <div className="px-5 pt-5">
        <p className="text-sm text-ink-2">{t("notFound")}</p>
      </div>
    );
  }

  const fullName = profile.full_name ?? "—";
  const bcp47 = locale === "en" ? "en-US" : "hr-HR";
  const sinceText = dashboard?.start_date
    ? new Intl.DateTimeFormat(bcp47, {
        month: "short",
        year: "numeric",
      })
        .format(new Date(dashboard.start_date + "T00:00"))
        .toUpperCase()
    : null;

  const menuItems = [
    { label: t("targets"), href: "#targets" },
    { label: t("photosLink"), href: "/app/photos" },
    { label: t("language"), href: "#language" },
    { label: t("dateOfBirth"), href: "#dob" },
  ];

  return (
    <div className="flex flex-col">
      {/* Centered header with glow */}
      <div className="relative border-b border-border px-5 pt-6 pb-5 text-center overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(197,247,59,0.08), transparent 70%)",
          }}
        />
        <div className="relative inline-flex flex-col items-center">
          <div
            className="flex size-[72px] items-center justify-center rounded-full text-bg font-bold text-[28px]"
            style={{
              background: "linear-gradient(135deg, #C5F73B, #3DE8A0)",
            }}
          >
            {getInitials(fullName)}
          </div>
          <h1 className="mt-3 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink">
            {fullName}
          </h1>
          {sinceText && (
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
              ATHLETIC OS · SINCE {sinceText}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        {/* 3-stat strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "STREAK", v: `${streak}d`, c: "var(--lime)" },
            { k: "WORKOUTS", v: String(workoutCount), c: "var(--ink)" },
            { k: "LOGS", v: String(logCount), c: "var(--ink)" },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-lg border border-border bg-surface-1 p-3 text-center"
            >
              <div className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">
                {s.k}
              </div>
              <div
                className="mt-1 font-mono text-[22px] font-semibold leading-none tabular-nums"
                style={{ color: s.c }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>

        {/* Current phase + targets */}
        {dashboard?.phase && (
          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              CURRENT PHASE
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-semibold text-ink">
                {dashboard.phase.name}
              </span>
              {dashboard.phase.start_date && (
                <span className="font-mono text-[11px] text-ink-3 tabular-nums">
                  SINCE{" "}
                  {new Date(
                    dashboard.phase.start_date + "T00:00"
                  ).toLocaleDateString(bcp47)}
                </span>
              )}
            </div>
          </div>
        )}

        {dashboard?.targets && (
          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              TARGETS
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {[
                { k: t("targetCalories"), v: dashboard.targets.calories, u: "kcal" },
                { k: t("targetProtein"), v: dashboard.targets.protein, u: "g" },
                { k: t("targetCarbs"), v: dashboard.targets.carbs, u: "g" },
                { k: t("targetFat"), v: dashboard.targets.fat, u: "g" },
                { k: t("targetSteps"), v: dashboard.targets.steps, u: "" },
                { k: t("targetSleep"), v: dashboard.targets.sleep, u: "h" },
              ].map((row) => (
                <div key={row.k} className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-2">{row.k}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                    {row.v != null ? (
                      <>
                        <Num value={row.v as number} />
                        {row.u && (
                          <span className="text-[10px] text-ink-3 ml-0.5">
                            {row.u}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACCOUNT menu */}
        <div>
          <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
            ACCOUNT
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
            {menuItems.map((item, idx) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/40 transition-colors ${
                  idx < menuItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-sm text-ink">{item.label}</span>
                <ChevronRight size={14} className="text-ink-3" />
              </Link>
            ))}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-ink">{t("language")}</span>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Log out */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full rounded-xl border border-border bg-surface-1 px-4 py-3.5 text-sm text-danger transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="inline size-4 animate-spin" />
          ) : (
            t("signOut")
          )}
        </button>
      </div>
    </div>
  );
}
