"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { useMessageThread } from "@/lib/messages/use-message-thread";

interface MessageDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  currentUserId: string;
}

function timeFmt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "JUST NOW";
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return d
    .toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .toUpperCase();
}

export default function MessageDialog({
  open,
  onClose,
  clientId,
  clientName,
  currentUserId,
}: MessageDialogProps) {
  const { messages, loading, error, send, markRead } = useMessageThread({
    clientId,
    currentUserId,
    active: open,
  });
  // The dialog is coach-only; fall back to the coach UUID so message bubbles
  // align correctly even before the parent resolves currentUserId.
  const selfId = currentUserId || process.env.NEXT_PUBLIC_COACH_UUID || "";
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // When open and loaded, mark the thread read and scroll to newest — also when
  // a new message arrives live while the dialog is open.
  useEffect(() => {
    if (!open || loading) return;
    markRead();
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current?.scrollHeight ?? 0,
        behavior: "auto",
      });
      textareaRef.current?.focus();
    });
  }, [open, loading, messages, markRead]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const res = await send(trimmed);
    setSending(false);
    if (res.error) {
      toast.error(res.error === "tooLong" ? "Too long (max 2000)" : "Couldn't send. Retry.");
      return;
    }
    setBody("");
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current?.scrollHeight ?? 0,
        behavior: "smooth",
      });
      textareaRef.current?.focus();
    });
  }

  function onTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Messages with ${clientName}`}
    >
      <div
        className="w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-xl sm:rounded-xl border border-border bg-surface-1 shadow-[0_-12px_60px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-4 duration-fast"
        style={{ animationFillMode: "forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-ink-3">
              MESSAGE
            </div>
            <div className="text-[14px] font-semibold text-ink mt-0.5">
              {clientName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Thread */}
        <div
          ref={listRef}
          className="flex-1 min-h-[200px] max-h-[60vh] overflow-y-auto px-4 py-4 space-y-3"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8 text-ink-3">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-md border border-danger/30 bg-danger/5 p-3 font-mono text-[10px] uppercase tracking-[0.08em] text-danger">
              Couldn&apos;t load thread
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
              NO MESSAGES YET
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === selfId;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-md px-3 py-2 text-[13px] leading-snug ${
                      mine
                        ? "bg-lime text-bg"
                        : "bg-surface-2 text-ink border border-border"
                    }`}
                  >
                    {m.body}
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                    {timeFmt(m.created_at)}
                    {mine && m.read_at && " · READ"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onTextareaKeyDown}
            rows={2}
            maxLength={2000}
            placeholder="Type a message…"
            className="w-full resize-none rounded-md border border-hairline-2 bg-bg px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus-visible:border-lime focus-visible:ring-2 focus-visible:ring-lime/30"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
              {body.length} / 2000 · ⌘↵ TO SEND
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || body.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-sm bg-lime px-3 py-1.5 text-[12px] font-semibold text-bg hover:bg-lime-hover active:bg-lime-press disabled:!bg-surface-2 disabled:!text-ink-4 transition-colors"
            >
              {sending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                "→"
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
