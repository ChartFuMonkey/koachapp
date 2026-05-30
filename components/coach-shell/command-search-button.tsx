"use client";

import { Kbd } from "@/components/ui/athletic/kbd";

/** Opens the command palette (which also listens for ⌘K). */
export function CommandSearchButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("koach:command-open"))
      }
      className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-3 py-2 font-mono text-[12px] text-ink-2 hover:bg-surface-2 transition-colors"
    >
      <Kbd>⌘K</Kbd>
      <span>{label}</span>
    </button>
  );
}
