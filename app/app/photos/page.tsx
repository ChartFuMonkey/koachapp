"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Camera, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/athletic/chip";
import { MicroLabel } from "@/components/ui/athletic/micro-label";
import { Num } from "@/components/ui/athletic/num";
import { EmptyState } from "@/components/ui/athletic/empty-state";
import {
  getPhotos,
  uploadPhoto,
  getPhotoSessionWeights,
} from "@/actions/photos";

/* eslint-disable @typescript-eslint/no-explicit-any */
type PhotoRow = Record<string, any> & { signedUrl: string | null };

type UploadStep = "idle" | "selecting_angle" | "uploading";

const ANGLES = ["front", "side", "back"] as const;
type Angle = (typeof ANGLES)[number];

function isoWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function PhotosPage() {
  const t = useTranslations("app.photos");
  const tErrors = useTranslations("app.photos.errors");
  const tCommon = useTranslations("common");
  const tCommonErrors = useTranslations("errors");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [selectedAngle, setSelectedAngle] = useState<string>("");
  const [fullViewPhoto, setFullViewPhoto] = useState<PhotoRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const [photosResult, weightsResult] = await Promise.all([
        getPhotos(),
        getPhotoSessionWeights(),
      ]);
      if (photosResult.error) {
        toast.error(translateError(photosResult.error));
      } else if (photosResult.data) {
        setPhotos(photosResult.data);
      }
      if (weightsResult && "data" in weightsResult && weightsResult.data) {
        setWeights(weightsResult.data);
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

  // Group photos by date
  const grouped: Record<string, PhotoRow[]> = {};
  for (const photo of photos) {
    const date = photo.photo_date as string;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(photo);
  }
  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const bcp47 = locale === "en" ? "en-US" : "hr-HR";
  const tWeek = t.has("weekShort") ? t("weekShort") : "WEEK";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-ink-3" />
      </div>
    );
  }

  // Build sessions with weight + delta (vs older session)
  const sessions = sortedDates.map((date, idx) => {
    const olderDate = sortedDates[idx + 1];
    const weight = weights[date];
    const olderWeight = olderDate ? weights[olderDate] : undefined;
    const delta =
      weight != null && olderWeight != null
        ? Math.round((weight - olderWeight) * 10) / 10
        : null;
    const photosByAngle: Record<Angle, PhotoRow | undefined> = {
      front: grouped[date].find((p) => p.angle === "front"),
      side: grouped[date].find((p) => p.angle === "side"),
      back: grouped[date].find((p) => p.angle === "back"),
    };
    return {
      date,
      weekNumber: isoWeekNumber(new Date(date + "T00:00")),
      weight,
      delta,
      photosByAngle,
      otherPhotos: grouped[date].filter((p) => !ANGLES.includes(p.angle)),
    };
  });

  return (
    <div className="px-5 md:px-8 pt-5 pb-6">
      <MicroLabel>
        PROGRESS · {sortedDates.length}{" "}
        {sortedDates.length === 1 ? "SESSION" : "SESSIONS"}
      </MicroLabel>
      <h1 className="mt-1 mb-4 text-[28px] md:text-[32px] font-semibold leading-tight text-ink tracking-tight">
        {t("title")}
      </h1>

      {/* Upload */}
      <div className="mb-5">
        {uploadStep === "idle" && (
          <button
            type="button"
            onClick={() => setUploadStep("selecting_angle")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-2 bg-card/40 py-5 text-ink-2 hover:border-primary/40 hover:text-ink transition-colors"
          >
            <span className="font-mono text-[12px] uppercase tracking-[0.08em]">
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

      {/* Sessions */}
      {sessions.length === 0 ? (
        <EmptyState glyph="◐" label={t("addFirstPhoto")} hint="TAP + TO ADD" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session.date}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              {/* Session header */}
              <div className="flex items-start justify-between px-4 py-3 border-b border-border">
                <div>
                  <MicroLabel>
                    {tWeek} {session.weekNumber}
                  </MicroLabel>
                  <div className="mt-0.5 text-base font-semibold text-ink">
                    {new Date(session.date + "T00:00")
                      .toLocaleDateString(bcp47, {
                        day: "numeric",
                        month: "short",
                      })
                      .toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[15px] font-semibold text-ink tabular-nums">
                    {session.weight != null ? (
                      <>
                        <Num value={session.weight} decimals={1} />
                        <span className="text-ink-3 ml-1 text-xs font-normal">
                          kg
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </div>
                  <div
                    className={`mt-0.5 font-mono text-[11px] tabular-nums ${
                      session.delta == null
                        ? "text-ink-3"
                        : session.delta < 0
                          ? "text-good"
                          : session.delta > 0
                            ? "text-warn"
                            : "text-ink-3"
                    }`}
                  >
                    {session.delta == null
                      ? "—"
                      : session.delta > 0
                        ? `+${session.delta.toFixed(1)}`
                        : session.delta.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* 3-up grid */}
              <div className="grid grid-cols-3 gap-px bg-border">
                {ANGLES.map((angle) => {
                  const photo = session.photosByAngle[angle];
                  return (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => photo && setFullViewPhoto(photo)}
                      disabled={!photo}
                      className="relative block aspect-[3/4] overflow-hidden disabled:cursor-default"
                      style={{
                        background: photo
                          ? "var(--surface-2)"
                          : "linear-gradient(135deg, var(--surface-2), var(--bg))",
                      }}
                    >
                      {photo?.signedUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.signedUrl}
                          alt={angle}
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover"
                        />
                      )}
                      <span className="absolute bottom-1.5 left-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                        {angleLabel(angle).toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Other (non-standard) photos for the session */}
              {session.otherPhotos.length > 0 && (
                <div className="border-t border-border px-4 py-3 grid grid-cols-3 gap-2">
                  {session.otherPhotos.map((p) => (
                    <button
                      key={p.id as string}
                      type="button"
                      onClick={() => setFullViewPhoto(p)}
                      className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
                    >
                      {p.signedUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.signedUrl}
                          alt={(p.angle as string) || "photo"}
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
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
