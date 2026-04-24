"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const tCommon = useTranslations("common");
  const effectiveCancel = cancelLabel ?? tCommon("cancel");
  const effectiveConfirm = confirmLabel ?? tCommon("delete");

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />
      <div className="relative mx-4 w-full max-w-sm rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-gray-400">{description}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} variant="outline" onClick={onCancel}>
            {effectiveCancel}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {effectiveConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
