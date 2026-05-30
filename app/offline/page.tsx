import { getTranslations } from "next-intl/server";

// Static branded fallback served by the service worker when a navigation
// can't reach the network. Must not fetch data — it has to render offline.
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-[14px] bg-lime text-bg font-bold text-2xl"
        aria-hidden
      >
        K
      </div>
      <h1 className="mt-6 text-[22px] font-semibold tracking-[-0.01em] text-ink">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-xs text-sm text-ink-2">{t("body")}</p>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        {t("hint")}
      </p>
    </div>
  );
}
