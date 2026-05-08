"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLanguage } from "@/app/actions/set-language";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  function change(next: "hr" | "en") {
    if (next === locale) return;
    startTransition(() => setLanguage(next));
  }

  return (
    <div
      className={`inline-flex gap-1 ${className ?? ""}`}
      role="group"
      aria-label="Language"
    >
      {(["hr", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          disabled={pending}
          aria-pressed={locale === code}
          onClick={() => change(code)}
          className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] rounded-sm border transition-colors ${
            locale === code
              ? "bg-ink text-bg border-transparent"
              : "bg-transparent text-ink-3 border-border hover:bg-surface-2"
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
