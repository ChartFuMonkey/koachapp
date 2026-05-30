import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center overflow-hidden">
      {/* Lime radial glow background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(197,247,59,0.12), transparent 60%)",
        }}
      />

      <div className="absolute right-4 top-4 sm:right-6 sm:top-6 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Big K mark with glow */}
        <div
          className="flex size-16 items-center justify-center rounded-2xl text-bg font-bold mb-8"
          style={{
            background: "var(--lime)",
            fontSize: "32px",
            lineHeight: 1,
            boxShadow: "0 8px 30px rgba(197,247,59,0.35)",
          }}
        >
          K
        </div>

        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
          {t("welcome")}
        </p>
        <h1 className="mt-2 text-[56px] font-bold leading-none tracking-[-0.04em] text-ink">
          koach
        </h1>
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
          v2.4 — ATHLETIC OS
        </p>

        <p className="mt-8 text-base text-ink-2 leading-relaxed">
          {t("tagline")}
        </p>

        <div className="mt-10 flex w-full flex-col gap-2.5">
          <Link
            href="/login?role=client"
            className="w-full inline-flex items-center justify-center rounded-lg bg-lime px-4 py-4 text-sm font-bold uppercase tracking-[0.02em] text-bg hover:bg-lime-hover active:bg-lime-press transition-all"
          >
            {t("loginAsClient")} →
          </Link>
          <Link
            href="/login?role=coach"
            className="w-full inline-flex items-center justify-center rounded-lg border border-hairline-2 bg-surface-1 px-4 py-4 text-sm font-medium text-ink hover:bg-surface-2 transition-colors"
          >
            {t("loginAsCoach")}
          </Link>
        </div>
      </div>
    </div>
  );
}
