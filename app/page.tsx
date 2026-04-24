import Link from "next/link";
import { Dumbbell, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 text-center">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>
      <Dumbbell className="mb-4 size-14 text-blue-500" />
      <h1 className="text-4xl font-bold tracking-tight text-white">
        KoachApp
      </h1>
      <p className="mt-3 max-w-sm text-lg text-gray-400">
        {t("tagline")}
      </p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <Link href="/login?role=client">
          <Button className="h-12 w-full text-base font-semibold">
            {t("loginAsClient")}
          </Button>
        </Link>
        <Link href="/login?role=coach">
          <Button variant="outline" className="h-12 w-full text-base font-semibold">
            <ShieldCheck className="mr-2 size-5" />
            {t("loginAsCoach")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
