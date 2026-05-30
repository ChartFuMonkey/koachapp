"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { updateProfile } from "@/actions/profile";

export type EditableProfile = {
  full_name: string | null;
  height_cm: number | null;
  date_of_birth: string | null;
  gender: string | null;
};

const GENDERS = ["male", "female", "other"] as const;

export function EditProfileDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: EditableProfile;
  onClose: () => void;
  onSaved: (next: EditableProfile) => void;
}) {
  const t = useTranslations("app.profile.edit");
  const tCommon = useTranslations("common");
  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [heightCm, setHeightCm] = useState(
    initial.height_cm != null ? String(initial.height_cm) : ""
  );
  const [dob, setDob] = useState(initial.date_of_birth ?? "");
  const [gender, setGender] = useState(initial.gender ?? "");
  const [saving, setSaving] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Re-seed fields whenever the dialog reopens with fresh data.
  useEffect(() => {
    if (open) {
      setFullName(initial.full_name ?? "");
      setHeightCm(initial.height_cm != null ? String(initial.height_cm) : "");
      setDob(initial.date_of_birth ?? "");
      setGender(initial.gender ?? "");
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open, initial]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error(t("nameRequired"));
      return;
    }
    const heightNum = heightCm.trim() === "" ? null : Number(heightCm);
    if (heightNum != null && (Number.isNaN(heightNum) || heightNum <= 0)) {
      toast.error(t("heightInvalid"));
      return;
    }
    setSaving(true);
    const next: EditableProfile = {
      full_name: trimmedName,
      height_cm: heightNum,
      date_of_birth: dob.trim() === "" ? null : dob,
      gender: gender === "" ? null : gender,
    };
    const result = await updateProfile(next);
    setSaving(false);
    if (result.error) {
      toast.error(t("saveFailed"));
      return;
    }
    toast.success(t("saved"));
    onSaved(next);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-t-2xl border border-border bg-surface-1 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{t("title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tCommon("close")}
            className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {t("name")}
            </span>
            <input
              ref={firstFieldRef}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11 rounded-lg border border-border bg-bg px-3 text-base text-ink outline-none focus:border-lime"
              autoComplete="name"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {t("height")}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              min={0}
              step="0.1"
              className="h-11 rounded-lg border border-border bg-bg px-3 text-base text-ink outline-none focus:border-lime"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {t("dateOfBirth")}
            </span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="h-11 rounded-lg border border-border bg-bg px-3 text-base text-ink outline-none focus:border-lime"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {t("gender")}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {GENDERS.map((g) => {
                const active = gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(active ? "" : g)}
                    aria-pressed={active}
                    className={`h-11 rounded-lg border text-sm transition-colors ${
                      active
                        ? "border-lime bg-lime/10 text-ink"
                        : "border-border bg-bg text-ink-2 hover:text-ink"
                    }`}
                  >
                    {t(`gender_${g}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-lg border border-border bg-surface-2 text-sm text-ink-2 hover:text-ink"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-11 flex-1 rounded-lg bg-lime text-sm font-bold text-bg hover:bg-lime-hover active:bg-lime-press disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="inline size-4 animate-spin" />
            ) : (
              tCommon("save")
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
