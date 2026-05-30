"use client";

import type { PersonalBest } from "@/lib/reports/types";

export function SectionHeader({ micro, title }: { micro: string; title: string }) {
  return (
    <div className="mb-3 border-b border-border pb-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{micro}</div>
      <h2 className="mt-0.5 text-[17px] font-semibold text-ink tracking-tight">{title}</h2>
    </div>
  );
}

export function StatCard({
  label, value, sub, delta,
}: { label: string; value: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-ink tracking-tight">{value}</span>
        {delta && <span className="text-[12px] font-mono">{delta}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

/** Start → Now → Goal horizontal progress bar (weight). */
export function GoalProgressBar({
  start, now, target, labels,
}: {
  start: number | null; now: number | null; target: number | null;
  labels: { start: string; now: string; target: string };
}) {
  if (start == null || now == null || target == null || start === target) return null;
  const pct = Math.max(0, Math.min(100, ((start - now) / (start - target)) * 100));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
        <span>{labels.start} {start}kg</span>
        <span className="text-lime">{labels.now} {now}kg</span>
        <span>{labels.target} {target}kg</span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-2">
        <div className="absolute inset-y-0 left-0 rounded-full bg-lime" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-right font-mono text-[10px] text-ink-3">{Math.round(pct)}%</div>
    </div>
  );
}

/** 7 dots, green when the meal plan was followed that day. */
export function AdherenceDots({
  daily, label,
}: { daily: { date: string; followedMealPlan: boolean | null }[]; label: string }) {
  if (!daily.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className="flex gap-1.5">
        {daily.map((d) => (
          <span
            key={d.date}
            title={d.date}
            className="size-4 rounded-full"
            style={{ background: d.followedMealPlan ? "var(--good)" : "var(--surface-2)" }}
          />
        ))}
      </div>
    </div>
  );
}

export function PersonalBests({ bests, title }: { bests: PersonalBest[]; title: string }) {
  if (!bests.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">★ {title}</div>
      <ul className="mt-2 flex flex-col gap-1 text-[13px] text-ink">
        {bests.map((pb, i) => (
          <li key={i}>{pb.exercise}: <b>{pb.weightKg} kg</b> × {pb.reps}</li>
        ))}
      </ul>
    </div>
  );
}

/** A coach recommendation block (only renders when text is present). */
export function RecommendationBlock({
  icon, label, text,
}: { icon: string; label: string; text: string | null | undefined }) {
  if (!text || !text.trim()) return null;
  return (
    <div className="rounded-xl border border-lime/30 bg-lime/5 p-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-lime">
        {icon} {label}
      </div>
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{text}</p>
    </div>
  );
}
