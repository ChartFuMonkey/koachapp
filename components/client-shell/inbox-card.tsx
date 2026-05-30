"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useMessageThread } from "@/lib/messages/use-message-thread";

interface InboxCardProps {
  clientId: string;
  currentUserId: string;
  coachInitials: string;
  coachFirstName: string;
}

type TimeLabels = {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
};

// Module-scope so Date.now() isn't a render-time impurity inside the component.
function relTime(iso: string, labels: TimeLabels): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return labels.justNow;
  if (diff < 3600) return labels.minutesAgo(Math.floor(diff / 60));
  if (diff < 86400) return labels.hoursAgo(Math.floor(diff / 3600));
  return new Date(iso)
    .toLocaleString(undefined, { day: "numeric", month: "short" })
    .toUpperCase();
}

export default function InboxCard({
  clientId,
  currentUserId,
  coachInitials,
  coachFirstName,
}: InboxCardProps) {
  // Live thread (loads + subscribes). We intentionally do NOT mark messages
  // read here — only opening the full chat screen clears the unread badge.
  const { messages, loading, send } = useMessageThread({
    clientId,
    currentUserId,
  });
  const t = useTranslations("app.messages");
  const [composing, setComposing] = useState(false);

  const timeLabels: TimeLabels = {
    justNow: t("justNow"),
    minutesAgo: (n) => t("minutesAgo", { n }),
    hoursAgo: (n) => t("hoursAgo", { n }),
  };
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const res = await send(trimmed);
    setSending(false);
    if (res.error) {
      toast.error("Couldn't send. Retry.");
      return;
    }
    setBody("");
    setComposing(false);
  }

  // Show only the last 3 messages on the card
  const recent = messages.slice(-3);
  const unreadFromCoach = messages.filter(
    (m) => m.sender_id !== currentUserId && m.read_at == null
  ).length;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center gap-2 text-ink-3">
          <Loader2 className="size-4 animate-spin" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
            Loading…
          </span>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !composing) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
            FROM COACH
          </span>
          <Link
            href="/app/messages"
            className="font-mono text-[11px] text-lime hover:text-lime-hover"
          >
            Open chat →
          </Link>
        </div>
        <div className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          NO MESSAGES YET
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
          FROM COACH {unreadFromCoach > 0 && (
            <span className="ml-1.5 inline-flex items-center rounded-[3px] bg-lime/15 px-1.5 py-px text-lime">
              {unreadFromCoach} NEW
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setComposing((v) => !v)}
            className="font-mono text-[11px] text-lime hover:text-lime-hover"
          >
            {composing ? "Cancel" : "+ Reply"}
          </button>
          <Link
            href="/app/messages"
            className="font-mono text-[11px] text-lime hover:text-lime-hover"
          >
            Open chat →
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {recent.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-md px-3 py-2 text-[13px] leading-snug ${
                  mine
                    ? "bg-lime text-bg"
                    : "bg-surface-2 text-ink border border-border"
                }`}
              >
                {!mine && (
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <div
                      className="flex size-[14px] items-center justify-center rounded-full text-bg font-bold text-[7px]"
                      style={{
                        background:
                          "linear-gradient(135deg, #C5F73B, #3DE8A0)",
                      }}
                    >
                      {coachInitials}
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                      COACH {coachFirstName.toUpperCase()}
                    </span>
                  </div>
                )}
                {m.body}
              </div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                {relTime(m.created_at, timeLabels)}
              </div>
            </div>
          );
        })}
      </div>

      {composing && (
        <div className="mt-3 border-t border-border pt-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Reply to coach…"
            rows={2}
            maxLength={2000}
            autoFocus
            className="w-full resize-none rounded-md border border-hairline-2 bg-bg px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus-visible:border-lime focus-visible:ring-2 focus-visible:ring-lime/30"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || body.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-sm bg-lime px-3 py-1.5 text-[12px] font-semibold text-bg hover:bg-lime-hover active:bg-lime-press disabled:!bg-surface-2 disabled:!text-ink-4 transition-colors"
            >
              {sending ? <Loader2 className="size-3 animate-spin" /> : "→"}
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
