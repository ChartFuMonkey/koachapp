"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold">{t("somethingWentWrong")}</h2>
      <p className="mt-2 text-sm text-ink-2">
        {t("unexpectedError")}
      </p>
      <Button onClick={() => unstable_retry()} className="mt-4">
        {t("tryAgain")}
      </Button>
    </div>
  );
}
