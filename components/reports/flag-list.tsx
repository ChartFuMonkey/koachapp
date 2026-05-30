"use client";

import type { Flag } from "@/lib/reports/types";

const TONE: Record<Flag["severity"], string> = {
  info: "var(--ink-3)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

export function FlagList({
  flags,
  locale,
}: {
  flags: Flag[];
  locale: "hr" | "en";
}) {
  if (!flags.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {flags.map((f) => (
        <li
          key={f.key}
          className="flex items-start gap-2 text-[13px] text-ink-2"
        >
          <span
            aria-hidden
            className="mt-[6px] size-1.5 shrink-0 rounded-full"
            style={{ background: TONE[f.severity] }}
          />
          <span>{locale === "en" ? f.text_en : f.text_hr}</span>
        </li>
      ))}
    </ul>
  );
}
