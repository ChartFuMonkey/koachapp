"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Camera, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

  // Comparison state
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

  const uniqueDates = sortedDates;
  const comparePhotos1 = compareDate1 ? grouped[compareDate1] || [] : [];
  const comparePhotos2 = compareDate2 ? grouped[compareDate2] || [] : [];

  const bcp47 = locale === "en" ? "en-US" : "hr-HR";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardContent className="p-4">
          {uploadStep === "idle" && (
            <Button
              onClick={() => setUploadStep("selecting_angle")}
              className="w-full"
            >
              <Camera size={18} className="mr-2" />
              {t("addPhoto")}
            </Button>
          )}

          {uploadStep === "selecting_angle" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">
                  {t("chooseAngle")}
                </p>
                <button
                  onClick={() => setUploadStep("idle")}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:text-gray-300"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ANGLE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    className="h-14 text-base"
                    onClick={() => handleAngleSelect(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {uploadStep === "uploading" && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="size-5 animate-spin text-blue-400" />
              <span className="text-gray-300">{t("uploading")}</span>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Gallery Section */}
      {sortedDates.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {t("addFirstPhoto")}
        </p>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="mb-2 text-sm font-medium text-gray-400">
                {new Date(date + "T00:00").toLocaleDateString(bcp47, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {grouped[date].map((photo) => (
                  <button
                    key={photo.id as string}
                    onClick={() => setFullViewPhoto(photo)}
                    className="overflow-hidden rounded-lg border border-gray-800"
                  >
                    {photo.signedUrl ? (
                      <img
                        src={photo.signedUrl}
                        alt={`${photo.angle || "photo"}`}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-gray-800 text-xs text-gray-500">
                        {t("noUrl")}
                      </div>
                    )}
                    <p className="p-1 text-center text-xs text-gray-500">
                      {angleLabel(photo.angle as string)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Section */}
      {uniqueDates.length >= 2 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">{t("compareTitle")}</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 text-xs text-gray-400">{t("date1")}</Label>
              <select
                value={compareDate1}
                onChange={(e) => setCompareDate1(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-300"
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
              <Label className="mb-1 text-xs text-gray-400">{t("date2")}</Label>
              <select
                value={compareDate2}
                onChange={(e) => setCompareDate2(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-300"
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-center text-xs text-gray-400">
                  {new Date(compareDate1 + "T00:00").toLocaleDateString(bcp47)}
                </p>
                <div className="space-y-2">
                  {comparePhotos1.map((p) => (
                    <div
                      key={p.id as string}
                      className="overflow-hidden rounded-lg border border-gray-800"
                    >
                      {p.signedUrl && (
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
              <div>
                <p className="mb-1 text-center text-xs text-gray-400">
                  {new Date(compareDate2 + "T00:00").toLocaleDateString(bcp47)}
                </p>
                <div className="space-y-2">
                  {comparePhotos2.map((p) => (
                    <div
                      key={p.id as string}
                      className="overflow-hidden rounded-lg border border-gray-800"
                    >
                      {p.signedUrl && (
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
            </div>
          )}
        </div>
      )}

      {/* Full-size Photo Overlay */}
      {fullViewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullViewPhoto(null)}
        >
          <button
            onClick={() => setFullViewPhoto(null)}
            className="absolute left-4 top-4 flex min-h-[44px] min-w-[44px] items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <ChevronLeft size={20} />
            {tCommon("back")}
          </button>
          {fullViewPhoto.signedUrl && (
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
