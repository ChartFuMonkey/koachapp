import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold">{t("notFoundTitle")}</h2>
      <p className="mt-2 text-sm text-gray-400">
        {t("notFoundDescription")}
      </p>
      <Link href="/coach">
        <Button variant="outline" className="mt-4">
          {t("backToDashboard")}
        </Button>
      </Link>
    </div>
  );
}
