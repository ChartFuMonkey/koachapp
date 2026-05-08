import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>

      {/* Logo with accent glow */}
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(197,247,59,0.25), transparent 70%)",
          }}
        />
        <div
          className="flex size-16 items-center justify-center rounded-2xl text-bg font-bold"
          style={{
            background: "linear-gradient(135deg, #C5F73B, #3DE8A0)",
            fontSize: "32px",
            lineHeight: 1,
          }}
        >
          K
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-2">
        {t("welcome")}
      </p>
      <h1 className="text-[56px] font-bold leading-none tracking-[-0.04em] text-ink">
        koach
      </h1>
      <p className="mt-4 max-w-sm text-base text-ink-2">{t("tagline")}</p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <Link href="/login?role=client" className="w-full">
          <Button size="lg" className="w-full">
            {t("loginAsClient")}
          </Button>
        </Link>
        <Link href="/login?role=coach" className="w-full">
          <Button variant="outline" size="lg" className="w-full">
            <ShieldCheck className="size-4" />
            {t("loginAsCoach")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
