"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMessageThread } from "@/lib/messages/use-message-thread";

export default function ChatView({ userId }: { userId: string }) {
  const t = useTranslations("app.messages");
  const { messages, loading, error, send, markRead } = useMessageThread({
    clientId: userId,
    currentUserId: userId,
  });
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest on any change.
  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "auto" });
    });
  }, [messages]);

  // Mark read when viewing and whenever a new message lands while focused.
  useEffect(() => {
    if (!loading) markRead();
  }, [loading, messages, markRead]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const res = await send(trimmed);
    setSending(false);
    if (res.error) {
      toast.error(t("sendError"));
      return;
    }
    setBody("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100vh-4.5rem)] lg:h-screen flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-ink-3">
          {t("subtitle")}
        </div>
        <h1 className="text-[18px] font-semibold text-ink">{t("title")}</h1>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-ink-3">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-danger/30 bg-danger/5 p-3 font-mono text-[10px] uppercase tracking-[0.08em] text-danger">
            {t("loadError")}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            {t("empty")}
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] rounded-md px-3 py-2 text-[13px] leading-snug ${
                    mine ? "bg-lime text-bg" : "bg-surface-2 text-ink border border-border"
                  }`}
                >
                  {m.body}
                </div>
                {mine && m.read_at && (
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                    {t("read")}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={2000}
          placeholder={t("placeholder")}
          className="w-full resize-none rounded-md border border-hairline-2 bg-bg px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus-visible:border-lime focus-visible:ring-2 focus-visible:ring-lime/30"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || body.trim().length === 0}
            className="inline-flex items-center gap-1.5 rounded-sm bg-lime px-3 py-1.5 text-[12px] font-semibold text-bg hover:bg-lime-hover active:bg-lime-press disabled:!bg-surface-2 disabled:!text-ink-4 transition-colors"
          >
            {sending ? <Loader2 className="size-3 animate-spin" /> : "→"} {t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
