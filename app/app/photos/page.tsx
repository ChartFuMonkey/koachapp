"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Camera, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { getPhotos, uploadPhoto } from "@/actions/photos";

/* eslint-disable @typescript-eslint/no-explicit-any */
type PhotoRow = Record<string, any> & { signedUrl: string | null };

type UploadStep = "idle" | "selecting_angle" | "uploading";

export default function PhotosPage() {
  const t = useTranslations("app.photos");
  const tErrors = useTranslations("app.photos.errors");
  const tCommon = useTranslations("common");
  const tCommonErrors = useTranslations("errors");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [selectedAngle, setSelectedAngle] = useState<string>("");
  const [fullViewPhoto, setFullViewPhoto] = useState<PhotoRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [compareDate1, setCompareDate1] = useState("");
  const [compareDate2, setCompareDate2] = useState("");

  const ANGLE_OPTIONS = [
    { label: t("angleFront"), value: "front" },
    { label: t("angleSide"), value: "side" },
    { label: t("angleBack"), value: "back" },
    { label: t("angleOther"), value: "other" },
  ] as const;

  function angleLabel(angle: string | null | undefined): string {
    switch (angle) {
      case "front":
        return t("angleFront");
      case "side":
        return t("angleSide");
      case "back":
        return t("angleBack");
      case "other":
        return t("angleOther");
      default:
        return "";
    }
  }

  function translateError(code: string): string {
    if (code === "unauthenticated") return tCommonErrors("unauthenticated");
    try {
      return tErrors(code as any);
    } catch {
      return tCommonErrors("genericLoad");
    }
  }

  useEffect(() => {
    async function load() {
      const result = await getPhotos();
      if (result.error) {
        toast.error(translateError(result.error));
      } else if (result.data) {
        setPhotos(result.data);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAngleSelect(angle: string) {
    setSelectedAngle(angle);
    setTimeout(() => fileInputRef.current?.click(), 50);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setUploadStep("idle");
      return;
    }
    setUploadStep("uploading");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("angle", selectedAngle);
    const result = await uploadPhoto(formData);
    if (result.error) {
      toast.error(translateError(result.error));
    } else if (result.data) {
      setPhotos((prev) => [result.data as PhotoRow, ...prev]);
      toast.success(t("savedToast"));
    }
    setUploadStep("idle");
    setSelectedAngle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const grouped: Record<string, PhotoRow[]> = {};
  for (const photo of photos) {
    const date = photo.photo_date as string;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(photo);
  }
  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const uniqueDates = sortedDates;
  const comparePhotos1 = compareDate1 ? grouped[compareDate1] || [] : [];
  const comparePhotos2 = compareDate2 ? grouped[compareDate2] || [] : [];

  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-ink-3" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-6">
      <MicroLabel>~/Progress photos</MicroLabel>
      <h1 className="mt-1 mb-4 text-[28px] font-semibold leading-tight text-ink tracking-tight">
        {t("title")}
      </h1>

      {/* Upload */}
      <div className="mb-5">
        {uploadStep === "idle" && (
          <button
            type="button"
            onClick={() => setUploadStep("selecting_angle")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-2 bg-surface/40 py-5 text-sm text-ink-2 hover:border-primary/40 hover:text-ink transition-colors"
          >
            <Camera size={16} />
            <span className="font-mono uppercase tracking-[0.06em] text-[11px]">
              + {t("addPhoto")}
            </span>
          </button>
        )}
        {uploadStep === "selecting_angle" && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <MicroLabel>{t("chooseAngle").toUpperCase()}</MicroLabel>
              <button
                onClick={() => setUploadStep("idle")}
                className="text-ink-3 hover:text-ink"
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ANGLE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="lg"
                  onClick={() => handleAngleSelect(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        {uploadStep === "uploading" && (
          <div className="flex items-center justify-center gap-2 py-5 rounded-xl border border-border bg-card">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-sm text-ink-2">{t("uploading")}</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Sessions stacked by date */}
      {sortedDates.length === 0 ? (
        <p className="py-10 text-center font-mono text-[11px] text-ink-3 uppercase tracking-[0.08em]">
          {t("addFirstPhoto")}
        </p>
      ) : (
        <div className="space-y-5">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2">
                  {new Date(date + "T00:00").toLocaleDateString(bcp47, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }).toUpperCase()}
                </span>
                <span className="font-mono text-[10px] text-ink-3">
                  {grouped[date].length} {grouped[date].length === 1 ? "photo" : "photos"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {grouped[date].map((photo) => (
                  <button
                    key={photo.id as string}
                    onClick={() => setFullViewPhoto(photo)}
                    className="overflow-hidden rounded-lg border border-border bg-card hover:border-hairline-2 transition-colors"
                  >
                    {photo.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.signedUrl}
                        alt={`${photo.angle || "photo"}`}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center bg-surface-2 text-[10px] text-ink-3">
                        {t("noUrl")}
                      </div>
                    )}
                    <div className="px-2 py-1.5 text-center">
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                        {angleLabel(photo.angle as string)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compare */}
      {uniqueDates.length >= 2 && (
        <div className="mt-7">
          <MicroLabel>{t("compareTitle").toUpperCase()}</MicroLabel>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-ink-3 mb-1 inline-block">
                {t("date1")}
              </Label>
              <select
                value={compareDate1}
                onChange={(e) => setCompareDate1(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-ring"
              >
                <option value="">{t("pickPlaceholder")}</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    {new Date(d + "T00:00").toLocaleDateString(bcp47)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-ink-3 mb-1 inline-block">
                {t("date2")}
              </Label>
              <select
                value={compareDate2}
                onChange={(e) => setCompareDate2(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-ring"
              >
                <option value="">{t("pickPlaceholder")}</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    {new Date(d + "T00:00").toLocaleDateString(bcp47)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {compareDate1 && compareDate2 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { date: compareDate1, photos: comparePhotos1 },
                { date: compareDate2, photos: comparePhotos2 },
              ].map((side) => (
                <div key={side.date}>
                  <p className="mb-1.5 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                    {new Date(side.date + "T00:00").toLocaleDateString(bcp47)}
                  </p>
                  <div className="space-y-2">
                    {side.photos.map((p) => (
                      <div
                        key={p.id as string}
                        className="overflow-hidden rounded-lg border border-border"
                      >
                        {p.signedUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.signedUrl}
                            alt={p.angle as string}
                            className="aspect-[3/4] w-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full-size overlay */}
      {fullViewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 p-4"
          onClick={() => setFullViewPhoto(null)}
        >
          <button
            onClick={() => setFullViewPhoto(null)}
            className="absolute left-4 top-4 flex min-h-[44px] min-w-[44px] items-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2 hover:text-ink"
          >
            <ChevronLeft size={16} />
            {tCommon("back")}
          </button>
          {fullViewPhoto.angle && (
            <Chip variant="ghost" className="absolute top-5 right-5">
              {angleLabel(fullViewPhoto.angle as string).toUpperCase()}
            </Chip>
          )}
          {fullViewPhoto.signedUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fullViewPhoto.signedUrl}
              alt="Full size"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
