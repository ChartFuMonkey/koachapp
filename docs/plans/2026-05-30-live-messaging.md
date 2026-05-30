# Live Messaging (Coach ↔ Client) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make coach↔client messages appear live (~1s, no refresh) with unread badges and read-receipts, add a dedicated client chat screen, and send phone push notifications to the recipient when the app is closed.

**Architecture:** A thin live layer over the existing data layer. Enable the `supabase_realtime` publication on the existing `messages` table; subscribe in the browser via the SSR Supabase client (RLS already scopes delivery). Pure thread/unread logic lives in one tested module; two client hooks wrap it with realtime. Push reuses the existing `send-push` Edge Function, extended with a deep-link `url`.

**Tech Stack:** Next.js 16.2.2 (App Router, RSC), React 19, `@supabase/ssr` + `@supabase/supabase-js` Realtime, next-intl (en/hr), next-pwa custom worker (`worker/index.ts`), Web Push (VAPID), vitest.

---

## Conventions & gotchas (read before starting)

- **Next.js is non-standard here.** `AGENTS.md` warns APIs differ from training data. Before writing any framework-level code (route handlers, params, etc.) skim the relevant guide under `node_modules/next/dist/docs/`.
- **No local dev server.** `next dev` cannot bind in this sandbox. Verify: (a) DB via Supabase MCP, (b) types via `npx tsc --noEmit`, (c) lint via `npx eslint <paths>`, (d) pure logic via `npx vitest run`, (e) full realtime/push/browser flows on the deployed Vercel app (`koachapp.vercel.app`).
- **vitest** uses `pool: "forks"` (configured) — the default pool stalls on Node 26 here.
- **Realtime + RLS:** the browser Realtime connection must carry the user's access token or RLS will silently deliver nothing. Always call `supabase.realtime.setAuth(session.access_token)` before `.subscribe()` (see Task 3). Confirm the exact `setAuth` signature against the installed `@supabase/supabase-js` in `node_modules`.
- **Message type** is exported from `actions/messages.ts` (`export type Message`). Always import it from there; never redefine it.
- **Coach identity:** `process.env.NEXT_PUBLIC_COACH_UUID`. Coach UI = English, client UI = Croatian.
- **Coach push works without a migration:** the coach UUID is already a `clients` row and `push_subscriptions` RLS permits `is_coach()`. Do NOT add a FK migration.
- **Commit after every task.** Branch is `feature/live-messaging` (already created).

---

## File structure

**Created:**
- `supabase/migrations/20260530_messages_realtime.sql` — add `messages` to realtime publication
- `lib/messages/thread-state.ts` — pure helpers (merge/dedupe, read-receipt, unread count)
- `lib/messages/thread-state.test.ts` — vitest unit tests
- `lib/messages/realtime.ts` — channel-subscription + realtime-auth helpers
- `lib/messages/use-message-thread.ts` — live thread hook
- `lib/messages/use-unread.ts` — `useClientUnread`, `useCoachUnread` hooks
- `lib/push-subscribe.ts` — shared client push-subscribe helper (extracted from PushBanner)
- `app/app/messages/page.tsx` — client chat route (server shell)
- `components/client-shell/chat-view.tsx` — full client chat UI
- `components/client-shell/nav-unread-badge.tsx` — live nav badge
- `components/coach-shell/coach-push-optin.tsx` — coach notification opt-in
- `components/coach-shell/coach-unread-context.tsx` — live per-client unread provider/hook

**Modified:**
- `actions/messages.ts` — fire best-effort push to recipient in `sendMessage`; add `getCoachUnreadCounts()`
- `lib/push.ts` — `sendPushToClient(userId, title, body, url?)`
- `supabase/functions/send-push/index.ts` — accept+forward optional `url` (redeploy)
- `worker/index.ts` — deep-link via `data.url`; suppress when chat focused (redeploy via build)
- `components/push-banner.tsx` — use shared `lib/push-subscribe.ts`
- `components/coach-shell/coach-shell.tsx` — render `CoachPushOptin`
- `app/app/layout.tsx` — add Messages tab + live badge (desktop rail + mobile bar)
- `components/client-shell/inbox-card.tsx` — live preview + link to `/app/messages`
- `components/coach-shell/message-dialog.tsx` — use `useMessageThread` (live)
- `app/coach/layout.tsx` — seed initial unread counts; pass to `CoachShell`
- `components/coach-shell/coach-shell.tsx` — provide live unread context + total chip + push opt-in
- `components/coach-shell/roster-table.tsx` — render unread badge from context
- `components/coach-shell/mobile-roster.tsx` — render unread badge from context
- `messages/en.json`, `messages/hr.json` — `app.nav.messages` + `app.messages.*`

---

## Task 1: Enable Realtime on the messages table

**Files:**
- Create: `supabase/migrations/20260530_messages_realtime.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Enable Supabase Realtime broadcast for coach<->client messages.
-- RLS already restricts delivery (client sees own thread; coach sees all),
-- so no policy changes are needed. Replica identity DEFAULT is sufficient:
-- INSERT/UPDATE payloads carry the new row, which is all the client needs.
alter publication supabase_realtime add table public.messages;
```

- [ ] **Step 2: Apply via Supabase MCP**

Apply with the `apply_migration` tool (project `zyjwkdsulzosfuadnnwq`, name `messages_realtime`, the SQL above). If the table is already a member the statement errors with `relation "messages" is already member of publication`; that is a safe no-op — treat as success.

- [ ] **Step 3: Verify membership**

Run via `execute_sql`:
```sql
select pubname, tablename from pg_publication_tables
where tablename = 'messages';
```
Expected: one row `supabase_realtime | messages`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260530_messages_realtime.sql
git commit -m "feat(db): enable realtime on messages table"
```

---

## Task 2: Pure thread-state helpers (TDD)

Pure, side-effect-free functions the hooks build on. Fully unit-tested.

**Files:**
- Create: `lib/messages/thread-state.ts`
- Test: `lib/messages/thread-state.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/messages/thread-state.test.ts
import { describe, it, expect } from "vitest";
import { mergeIncoming, applyReadReceipt, countUnreadFor } from "./thread-state";
import type { Message } from "@/actions/messages";

function msg(over: Partial<Message>): Message {
  return {
    id: "1",
    client_id: "c",
    sender_id: "s",
    body: "hi",
    created_at: "2026-05-30T10:00:00.000Z",
    read_at: null,
    ...over,
  };
}

describe("mergeIncoming", () => {
  it("appends a new message", () => {
    const a = msg({ id: "1", created_at: "2026-05-30T10:00:00.000Z" });
    const b = msg({ id: "2", created_at: "2026-05-30T10:01:00.000Z" });
    expect(mergeIncoming([a], b).map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("ignores a duplicate id (realtime echo of own send)", () => {
    const a = msg({ id: "1" });
    expect(mergeIncoming([a], msg({ id: "1", body: "echo" }))).toEqual([a]);
  });

  it("keeps ascending created_at order when an older message arrives late", () => {
    const a = msg({ id: "2", created_at: "2026-05-30T10:01:00.000Z" });
    const older = msg({ id: "1", created_at: "2026-05-30T10:00:00.000Z" });
    expect(mergeIncoming([a], older).map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("applyReadReceipt", () => {
  it("sets read_at on the matching message", () => {
    const a = msg({ id: "1", read_at: null });
    const out = applyReadReceipt([a], { id: "1", read_at: "2026-05-30T11:00:00.000Z" });
    expect(out[0].read_at).toBe("2026-05-30T11:00:00.000Z");
  });

  it("leaves other messages untouched", () => {
    const a = msg({ id: "1" });
    const b = msg({ id: "2" });
    const out = applyReadReceipt([a, b], { id: "1", read_at: "2026-05-30T11:00:00.000Z" });
    expect(out[1]).toBe(b);
  });
});

describe("countUnreadFor", () => {
  it("counts messages not sent by me with no read_at", () => {
    const list = [
      msg({ id: "1", sender_id: "coach", read_at: null }),
      msg({ id: "2", sender_id: "coach", read_at: "2026-05-30T11:00:00.000Z" }),
      msg({ id: "3", sender_id: "me", read_at: null }),
    ];
    expect(countUnreadFor(list, "me")).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/messages/thread-state.test.ts`
Expected: FAIL — `Failed to resolve import "./thread-state"`.

- [ ] **Step 3: Implement the helpers**

```ts
// lib/messages/thread-state.ts
import type { Message } from "@/actions/messages";

/** Append `incoming` to `list`, ignoring duplicates by id, kept sorted by created_at asc. */
export function mergeIncoming(list: Message[], incoming: Message): Message[] {
  if (list.some((m) => m.id === incoming.id)) return list;
  const next = [...list, incoming];
  next.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return next;
}

/** Patch read_at on the message whose id matches `update.id`. */
export function applyReadReceipt(
  list: Message[],
  update: Pick<Message, "id" | "read_at">
): Message[] {
  return list.map((m) => (m.id === update.id ? { ...m, read_at: update.read_at } : m));
}

/** Count messages addressed to `userId` (not sent by them) that are still unread. */
export function countUnreadFor(list: Message[], userId: string): number {
  return list.filter((m) => m.sender_id !== userId && m.read_at == null).length;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/messages/thread-state.test.ts`
Expected: PASS (8 assertions across 3 suites).

- [ ] **Step 5: Commit**

```bash
git add lib/messages/thread-state.ts lib/messages/thread-state.test.ts
git commit -m "feat(messages): pure thread-state helpers with tests"
```

---

## Task 3: Realtime subscription helper

Centralizes channel creation + RLS auth so both hooks share one implementation.

**Files:**
- Create: `lib/messages/realtime.ts`

- [ ] **Step 1: Implement the helper**

```ts
// lib/messages/realtime.ts
"use client";

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Message } from "@/actions/messages";

/**
 * Ensure the Realtime socket carries the logged-in user's JWT, so Postgres
 * Changes are delivered under that user's RLS policies. Without this the
 * subscription connects but silently receives nothing.
 *
 * NOTE: verify setAuth's signature against the installed @supabase/supabase-js
 * (node_modules) — pass the access token string.
 */
export async function ensureRealtimeAuth(supabase: SupabaseClient): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    supabase.realtime.setAuth(session.access_token);
  }
}

interface SubscribeArgs {
  /** Filter to one client's thread, or null for the coach (all threads). */
  clientId: string | null;
  onInsert: (m: Message) => void;
  onUpdate: (m: Message) => void;
  /** Called whenever the channel (re)subscribes successfully — use to backfill. */
  onResubscribe?: () => void;
}

/**
 * Subscribe to INSERT/UPDATE on public.messages. Returns the channel; caller
 * must `supabase.removeChannel(channel)` on cleanup.
 */
export function subscribeToMessages(
  supabase: SupabaseClient,
  { clientId, onInsert, onUpdate, onResubscribe }: SubscribeArgs
): RealtimeChannel {
  const filter = clientId ? `client_id=eq.${clientId}` : undefined;
  const channelName = clientId ? `messages:${clientId}` : "messages:all";

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", ...(filter ? { filter } : {}) },
      (payload) => onInsert(payload.new as Message)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", ...(filter ? { filter } : {}) },
      (payload) => onUpdate(payload.new as Message)
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onResubscribe?.();
    });

  return channel;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `lib/messages/realtime.ts`. (If `RealtimeChannel`/`SupabaseClient` import paths differ in the installed version, fix the import per `node_modules/@supabase/supabase-js`.)

- [ ] **Step 3: Commit**

```bash
git add lib/messages/realtime.ts
git commit -m "feat(messages): realtime subscription + auth helper"
```

---

## Task 4: `useMessageThread` hook

Live thread used by both the client chat and the coach popup.

**Files:**
- Create: `lib/messages/use-message-thread.ts`

- [ ] **Step 1: Implement the hook**

```ts
// lib/messages/use-message-thread.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listMessages,
  sendMessage,
  markMessagesRead,
  type Message,
} from "@/actions/messages";
import { mergeIncoming, applyReadReceipt } from "./thread-state";
import { ensureRealtimeAuth, subscribeToMessages } from "./realtime";

interface Args {
  clientId: string;
  currentUserId: string;
  /** Pass false to defer loading/subscribing (e.g. closed coach dialog). */
  active?: boolean;
}

export function useMessageThread({ clientId, currentUserId, active = true }: Args) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const refetch = useCallback(async () => {
    const res = await listMessages(clientId);
    if (res.error) {
      setError(res.error);
    } else {
      setMessages(res.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const supabase = createClient();

    setLoading(true);
    refetch();

    let channel: ReturnType<typeof subscribeToMessages> | null = null;
    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = subscribeToMessages(supabase, {
        clientId,
        onInsert: (m) => setMessages((prev) => mergeIncoming(prev, m)),
        onUpdate: (m) => setMessages((prev) => applyReadReceipt(prev, m)),
        onResubscribe: () => refetch(), // backfill anything missed while offline
      });
    })();

    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [active, clientId, refetch]);

  const send = useCallback(
    async (body: string) => {
      const res = await sendMessage(clientId, body);
      if (res.error || !res.data) return { error: res.error ?? "sendFailed" };
      setMessages((prev) => mergeIncoming(prev, res.data!));
      return { data: res.data };
    },
    [clientId]
  );

  const markRead = useCallback(() => {
    markMessagesRead(clientId).catch(() => {});
  }, [clientId]);

  return { messages, loading, error, send, markRead, refetch };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `use-message-thread.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/messages/use-message-thread.ts
git commit -m "feat(messages): useMessageThread live hook"
```

---

## Task 5: Unread-count hooks + coach count action

**Files:**
- Modify: `actions/messages.ts` (add `getCoachUnreadCounts`)
- Create: `lib/messages/use-unread.ts`

- [ ] **Step 1: Add the coach-counts server action**

Append to `actions/messages.ts` (it already imports `createClient` and defines `COACH_UUID`):

```ts
/** Per-client unread counts for the coach: client-sent messages not yet read. */
export async function getCoachUnreadCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== COACH_UUID) return {};

  const { data, error } = await supabase
    .from("messages")
    .select("client_id")
    .is("read_at", null)
    .neq("sender_id", user.id);

  if (error) {
    console.error("getCoachUnreadCounts error", error);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const cid = (row as { client_id: string }).client_id;
    counts[cid] = (counts[cid] ?? 0) + 1;
  }
  return counts;
}
```

- [ ] **Step 2: Implement the unread hooks**

```ts
// lib/messages/use-unread.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnreadCount, getCoachUnreadCounts } from "@/actions/messages";
import { ensureRealtimeAuth, subscribeToMessages } from "./realtime";

/** Debounce helper that survives re-renders. */
function useDebouncedCallback(fn: () => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(), ms);
  };
}

/** Live unread count for a client's own thread. */
export function useClientUnread(userId: string, initial = 0): number {
  const [count, setCount] = useState(initial);

  const reload = useDebouncedCallback(() => {
    getUnreadCount(userId).then(setCount);
  }, 300);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof subscribeToMessages> | null = null;
    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = subscribeToMessages(supabase, {
        clientId: userId,
        onInsert: reload,
        onUpdate: reload,
        onResubscribe: reload,
      });
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return count;
}

/** Live per-client unread counts for the coach. */
export function useCoachUnread(
  initial: Record<string, number>
): Record<string, number> {
  const [counts, setCounts] = useState(initial);

  const reload = useDebouncedCallback(() => {
    getCoachUnreadCounts().then(setCounts);
  }, 300);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof subscribeToMessages> | null = null;
    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = subscribeToMessages(supabase, {
        clientId: null, // coach: all threads
        onInsert: reload,
        onUpdate: reload,
        onResubscribe: reload,
      });
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return counts;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `use-unread.ts` or `actions/messages.ts`.

- [ ] **Step 4: Commit**

```bash
git add actions/messages.ts lib/messages/use-unread.ts
git commit -m "feat(messages): live unread hooks + coach unread counts action"
```

---

## Task 6: i18n strings for messaging

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/hr.json`

- [ ] **Step 1: Add nav key + messages namespace to `messages/en.json`**

In the existing `app.nav` object add `"messages": "Messages"`. Then add a new `messages` object under `app` (sibling of `nav`):

```json
"messages": {
  "title": "Messages",
  "subtitle": "Your coach",
  "empty": "No messages yet. Say hi!",
  "placeholder": "Write a message…",
  "send": "Send",
  "read": "Read",
  "loadError": "Couldn't load messages",
  "sendError": "Couldn't send. Try again.",
  "justNow": "Just now",
  "minutesAgo": "{n}m ago",
  "hoursAgo": "{n}h ago"
}
```

- [ ] **Step 2: Add the Croatian equivalents to `messages/hr.json`**

In `app.nav` add `"messages": "Poruke"`. Then add under `app`:

```json
"messages": {
  "title": "Poruke",
  "subtitle": "Tvoj trener",
  "empty": "Još nema poruka. Pozdravi trenera!",
  "placeholder": "Napiši poruku…",
  "send": "Pošalji",
  "read": "Pročitano",
  "loadError": "Učitavanje poruka nije uspjelo",
  "sendError": "Slanje nije uspjelo. Pokušaj ponovno.",
  "justNow": "Upravo sad",
  "minutesAgo": "Prije {n} min",
  "hoursAgo": "Prije {n} h"
}
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/hr.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/hr.json
git commit -m "feat(i18n): messaging strings (en/hr)"
```

---

## Task 7: Client chat screen + nav tab + live badge

**Files:**
- Create: `components/client-shell/chat-view.tsx`
- Create: `app/app/messages/page.tsx`
- Create: `components/client-shell/nav-unread-badge.tsx`
- Modify: `app/app/layout.tsx`

- [ ] **Step 1: Build the chat view**

```tsx
// components/client-shell/chat-view.tsx
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
```

- [ ] **Step 2: Build the route (server shell)**

The client's `clientId` equals their own auth user id. Follow an existing client page (e.g. `app/app/profile/page.tsx`) for the exact server-auth pattern in this Next version.

```tsx
// app/app/messages/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatView from "@/components/client-shell/chat-view";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ChatView userId={user.id} />;
}
```

- [ ] **Step 3: Build the nav badge**

```tsx
// components/client-shell/nav-unread-badge.tsx
"use client";

import { useClientUnread } from "@/lib/messages/use-unread";

export default function NavUnreadBadge({
  userId,
  className = "",
}: {
  userId: string;
  className?: string;
}) {
  const count = useClientUnread(userId);
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex min-w-[16px] items-center justify-center rounded-full bg-lime px-1 text-[9px] font-bold leading-none text-bg ${className}`}
      aria-label={`${count} unread`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
```

- [ ] **Step 4: Wire the Messages tab + badge into the client shell**

In `app/app/layout.tsx`:

1. Add to the `tabs` array (after `home`, so it sits early in the bar):
```ts
{ key: "messages", route: "/app/messages", glyph: "◓", hotkey: "M" },
```
2. The layout is already `"use client"` but does not know the user id. Fetch it once at the top of `AppLayout`:
```tsx
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavUnreadBadge from "@/components/client-shell/nav-unread-badge";
// ...
const [userId, setUserId] = useState<string | null>(null);
useEffect(() => {
  createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
}, []);
```
3. In BOTH the desktop rail `<Link>` map and the mobile bottom-bar `<Link>` map, render the badge on the messages tab. Desktop (inside the `<Link>`, after the label span):
```tsx
{tab.key === "messages" && userId && <NavUnreadBadge userId={userId} />}
```
Mobile (inside the `<Link>`, wrap the glyph so the badge can sit top-right):
```tsx
<span className="relative">
  <span className="text-[18px] leading-none select-none" aria-hidden>{tab.glyph}</span>
  {tab.key === "messages" && userId && (
    <NavUnreadBadge userId={userId} className="absolute -right-2 -top-1" />
  )}
</span>
```
(Replace the existing bare glyph span on the messages tab only; leave other tabs unchanged.)

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint app/app/messages/page.tsx components/client-shell/chat-view.tsx components/client-shell/nav-unread-badge.tsx app/app/layout.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/app/messages components/client-shell/chat-view.tsx components/client-shell/nav-unread-badge.tsx app/app/layout.tsx
git commit -m "feat(client): live chat screen + messages nav tab with unread badge"
```

---

## Task 8: Live home preview (inbox-card)

Make the existing home card update live and link to the full chat.

**Files:**
- Modify: `components/client-shell/inbox-card.tsx`

- [ ] **Step 1: Replace the one-shot load with the live hook**

Rewrite the data layer of `inbox-card.tsx` to use the hook (keep the existing markup/styles). Replace the `useState`/`useEffect`/`handleSend` block with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMessageThread } from "@/lib/messages/use-message-thread";

// ...inside InboxCard({ clientId, currentUserId, coachInitials, coachFirstName }):
const { messages, loading, send } = useMessageThread({
  clientId,
  currentUserId,
});
const [composing, setComposing] = useState(false);
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
```

Then in the header row of the card (next to "FROM COACH"), add a link to the full chat:
```tsx
<Link href="/app/messages" className="font-mono text-[11px] text-lime hover:text-lime-hover">
  Open chat →
</Link>
```
Keep the existing `recent = messages.slice(-3)` preview and `unreadFromCoach` logic as-is — they now update live because `messages` is live.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint components/client-shell/inbox-card.tsx`
Expected: no errors. (Remove now-unused imports like `listMessages`, `markMessagesRead`, `useEffect`.)

- [ ] **Step 3: Commit**

```bash
git add components/client-shell/inbox-card.tsx
git commit -m "feat(client): live home message preview + link to chat"
```

---

## Task 9: Coach live popup (message-dialog)

**Files:**
- Modify: `components/coach-shell/message-dialog.tsx`

- [ ] **Step 1: Swap the one-shot load for the live hook**

In `message-dialog.tsx`, replace the local `messages` state + the initial-load `useEffect` + `handleSend`'s manual append with `useMessageThread`, passing `active: open` so it only subscribes while the dialog is open:

```tsx
import { useMessageThread } from "@/lib/messages/use-message-thread";
// ...inside MessageDialog({ open, onClose, clientId, clientName, currentUserId }):
const { messages, loading, error, send, markRead } = useMessageThread({
  clientId,
  currentUserId,
  active: open,
});

// Mark read + scroll when opened / when new messages arrive while open.
useEffect(() => {
  if (open && !loading) {
    markRead();
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "auto" });
    });
  }
}, [open, loading, messages, markRead]);

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
    listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" });
    textareaRef.current?.focus();
  });
}
```

Keep the existing JSX (thread render, composer, `timeFmt`, Esc handling). Remove the now-unused imports (`listMessages`, `sendMessage`, `markMessagesRead`) and the old `messages`/`setMessages` state.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint components/coach-shell/message-dialog.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/coach-shell/message-dialog.tsx
git commit -m "feat(coach): live message popup via useMessageThread"
```

---

## Task 10: Coach roster unread badges (+ live total in top bar)

The live unread counts are provided once at the **layout level** (inside
`CoachShell`), so per-client roster badges and a global total work on every
coach page. `app/coach/page.tsx` needs no changes — the roster components read
the counts from context.

**Files:**
- Create: `components/coach-shell/coach-unread-context.tsx`
- Modify: `components/coach-shell/coach-shell.tsx`
- Modify: `app/coach/layout.tsx`
- Modify: `components/coach-shell/roster-table.tsx`
- Modify: `components/coach-shell/mobile-roster.tsx`

- [ ] **Step 1: Build the unread context (no provider component — CoachShell provides directly)**

```tsx
// components/coach-shell/coach-unread-context.tsx
"use client";

import { createContext, useContext } from "react";

/** Live per-client unread counts, keyed by client id. Provided by CoachShell. */
export const CoachUnreadContext = createContext<Record<string, number>>({});

/** Unread count for one client (0 if none). */
export function useClientUnreadCount(clientId: string): number {
  return useContext(CoachUnreadContext)[clientId] ?? 0;
}
```

- [ ] **Step 2: Provide live counts + show a total in `coach-shell.tsx`**

`CoachShell` is already `"use client"`. Make these edits:

1. Add imports near the top:
```tsx
import { useCoachUnread } from "@/lib/messages/use-unread";
import { CoachUnreadContext } from "./coach-unread-context";
```
2. Add an `initialUnread` prop (default `{}`) to the component signature:
```tsx
export default function CoachShell({
  children,
  clients = [],
  coachName = "Coach",
  initialUnread = {},
}: {
  children: React.ReactNode;
  clients?: ClientItem[];
  coachName?: string;
  initialUnread?: Record<string, number>;
}) {
```
3. Inside the component body (after the existing hooks), derive live counts:
```tsx
const unread = useCoachUnread(initialUnread);
const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
```
4. In the desktop top bar's right-side group (the `<div className="flex items-center gap-3">` next to `LiveTimestamp`), add a total chip as the first child:
```tsx
{totalUnread > 0 && (
  <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-lime">
    {totalUnread} unread
  </span>
)}
```
(Task 11 adds a `<CoachPushOptin />` button to this same group.)
5. Wrap the `<main>` children in the context provider so roster rows can read counts:
```tsx
<main className="flex-1 overflow-x-auto">
  <CoachUnreadContext.Provider value={unread}>{children}</CoachUnreadContext.Provider>
</main>
```

- [ ] **Step 3: Seed initial counts in `app/coach/layout.tsx`**

`CoachLayout` is a server component that already fetches coach data. Add the unread fetch and pass it through. `getCoachUnreadCounts()` reads the request's auth cookie and returns `{}` for non-coach, so it is safe to call here:
```tsx
import { getCoachUnreadCounts } from "@/actions/messages";
// inside CoachLayout, after the existing Promise.all:
const initialUnread = await getCoachUnreadCounts();
// pass to the shell:
return (
  <CoachShell clients={clientList} coachName={coachName} initialUnread={initialUnread}>
    {children}
  </CoachShell>
);
```

- [ ] **Step 4: Render the badge in `roster-table.tsx`**

`RosterTable` is already `"use client"`. Add the import:
```tsx
import { useClientUnreadCount } from "@/components/coach-shell/coach-unread-context";
```
Add this inner component near the top of the file (hooks can't run inside a `.map` callback, so the per-row hook needs its own component):
```tsx
function ClientNameCell({ id, name }: { id: string; name: string }) {
  const unread = useClientUnreadCount(id);
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={name} size="sm" />
      <span className="font-medium text-[13px] text-ink truncate">{name}</span>
      {unread > 0 && (
        <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-bg">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </div>
  );
}
```
Then replace the existing name-cell block in the desktop row (the
`<div className="flex items-center gap-3 min-w-0">…</div>` containing the
`<Avatar>` and name `<span>`) with:
```tsx
<ClientNameCell id={c.id} name={c.name} />
```

- [ ] **Step 5: Render the badge in `mobile-roster.tsx`**

`MobileRoster` is already `"use client"`. Add the import and extract the row
(currently the `<Link>` inside `filtered.map`) into its own component so it can
call the hook:
```tsx
import { useClientUnreadCount } from "@/components/coach-shell/coach-unread-context";

function MobileRosterRow({ c }: { c: MobileRosterClient }) {
  const unread = useClientUnreadCount(c.id);
  const tone = toneFor(c.weekLogs);
  const borderClass =
    tone === "warn" ? "border-warn/30" : tone === "danger" ? "border-danger/30" : "border-border";
  const microClass =
    tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-ink-3";
  return (
    <Link
      href={`/coach/clients/${c.id}`}
      className={`flex items-center gap-3 rounded-lg border bg-surface-1 px-3.5 py-3 transition-colors hover:bg-surface-2/40 ${borderClass}`}
    >
      <Avatar name={c.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-ink truncate">{c.name}</span>
          {unread > 0 && (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-bg">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className={`mt-0.5 flex items-center gap-2 font-mono text-[10px] ${microClass}`}>
          <span>{c.phaseName}</span>
          <span>·</span>
          <span>{c.lastAgo}</span>
          <span>·</span>
          <span>{c.adherencePct}%</span>
        </div>
      </div>
      <StatusDot tone={tone} size="sm" />
    </Link>
  );
}
```
Then replace the body of `filtered.map((c) => { … })` with:
```tsx
{filtered.map((c) => (
  <MobileRosterRow key={c.id} c={c} />
))}
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint app/coach/layout.tsx components/coach-shell/coach-shell.tsx components/coach-shell/roster-table.tsx components/coach-shell/mobile-roster.tsx components/coach-shell/coach-unread-context.tsx`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/coach/layout.tsx components/coach-shell/coach-shell.tsx components/coach-shell/roster-table.tsx components/coach-shell/mobile-roster.tsx components/coach-shell/coach-unread-context.tsx
git commit -m "feat(coach): live per-client unread badges + total in top bar"
```

---

## Task 11: Phone push on new message (+ coach opt-in, deep-link, focus-suppress)

**Files:**
- Create: `lib/push-subscribe.ts`
- Modify: `components/push-banner.tsx`
- Create: `components/coach-shell/coach-push-optin.tsx`
- Modify: `components/coach-shell/coach-shell.tsx`
- Modify: `lib/push.ts`
- Modify: `supabase/functions/send-push/index.ts` (redeploy)
- Modify: `worker/index.ts`
- Modify: `actions/messages.ts`

- [ ] **Step 1: Extract the shared push-subscribe helper**

```ts
// lib/push-subscribe.ts
"use client";

import { savePushSubscription } from "@/actions/push";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer as ArrayBuffer;
}

/** Subscribe this device to web push and persist the subscription. */
export async function subscribeToPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  const json = subscription.toJSON();
  await savePushSubscription({
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
  });
}
```

- [ ] **Step 2: Point `push-banner.tsx` at the shared helper**

In `components/push-banner.tsx`, delete the local `urlBase64ToUint8Array` and `subscribeToPush` definitions and instead `import { subscribeToPush } from "@/lib/push-subscribe";`. Leave the rest of the component unchanged.

- [ ] **Step 3: Build the coach opt-in component**

```tsx
// components/coach-shell/coach-push-optin.tsx
"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { subscribeToPush } from "@/lib/push-subscribe";

export default function CoachPushOptin() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") {
      subscribeToPush().catch(console.error);
      return;
    }
    if (Notification.permission === "default") setShow(true);
  }, []);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm === "granted") await subscribeToPush();
    setShow(false);
  }

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={enable}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-[12px] text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
    >
      <Bell size={14} /> Enable message alerts
    </button>
  );
}
```

- [ ] **Step 4: Render the opt-in in the coach shell top bar**

In `components/coach-shell/coach-shell.tsx`, add the import:
```tsx
import CoachPushOptin from "./coach-push-optin";
```
Then render `<CoachPushOptin />` in the desktop top bar's right-side group — the
same `<div className="flex items-center gap-3">` that Task 10 added the total
chip to. Place it as the first child of that group:
```tsx
<div className="flex items-center gap-3">
  <CoachPushOptin />
  {totalUnread > 0 && (
    <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-lime">
      {totalUnread} unread
    </span>
  )}
  {/* existing gPending / LiveTimestamp / status dot remain after */}
</div>
```

- [ ] **Step 5: Add `url` to `sendPushToClient` (full file)**

Replace `lib/push.ts` with:
```ts
// lib/push.ts
// Server-side helper that triggers the send-push Edge Function for a user.
import "server-only";

export async function sendPushToClient(
  clientId: string,
  title: string,
  body: string,
  url?: string
): Promise<{ sent?: number; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ client_id: clientId, title, body, url }),
    });
    if (!res.ok) {
      console.error("sendPushToClient failed:", await res.text());
      return { error: "sendFailed" };
    }
    const json = await res.json();
    return { sent: json.sent as number };
  } catch (err) {
    console.error("sendPushToClient error:", err);
    return { error: "sendFailed" };
  }
}
```
(Existing callers pass three args; `url` is optional, so they keep working.)

- [ ] **Step 6: Forward `url` in the Edge Function and redeploy**

In `supabase/functions/send-push/index.ts`:
1. Destructure `url`: `const { client_id, title, body, url } = await req.json();`
2. After the body validation, validate url if present:
```ts
if (url !== undefined && (typeof url !== "string" || url.length > 512)) {
  return new Response(JSON.stringify({ error: "Invalid url" }), {
    status: 400, headers: { "Content-Type": "application/json", ...cors },
  });
}
```
3. Include it in the payload: `JSON.stringify({ title, body, url })`.
Then redeploy with the `deploy_edge_function` MCP tool (project `zyjwkdsulzosfuadnnwq`, function `send-push`, the full updated file).

- [ ] **Step 7: Deep-link + focus-suppress in the service worker**

Replace `worker/index.ts` with:
```ts
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "KoachApp", body: "Novi podsjetnik!" };
  const url: string | undefined = data.url;
  event.waitUntil(
    (async () => {
      // Suppress the OS notification if a window is already focused on the target chat.
      if (url) {
        const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const focusedOnTarget = wins.some((w) => w.focused && w.url.includes(url));
        if (focusedOnTarget) return;
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/badge-96.png",
        data: { url: url ?? "/app" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target: string = event.notification.data?.url ?? "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(target));
      if (existing) return existing.focus();
      const anyWin = clients[0];
      if (anyWin) {
        anyWin.navigate(target);
        return anyWin.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
```

- [ ] **Step 8: Fire push to the recipient in `sendMessage`**

In `actions/messages.ts`, after the successful insert and before `return { data }`, add best-effort push. Coach→client gets Croatian copy and opens the client chat; client→coach gets English copy with the client's name and opens that client's page:

```ts
import { sendPushToClient } from "@/lib/push";
// ...after successful insert (data is the new Message):
const preview = trimmed.length > 120 ? `${trimmed.slice(0, 119)}…` : trimmed;
try {
  if (isCoach) {
    // recipient = client
    await sendPushToClient(clientId, "Nova poruka od trenera", preview, "/app/messages");
  } else {
    // recipient = coach; look up the client's display name for the title
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const who = (prof?.full_name as string | null) || "a client";
    await sendPushToClient(
      COACH_UUID!,
      `New message from ${who}`,
      preview,
      `/coach/clients/${clientId}`
    );
  }
} catch (err) {
  console.error("message push failed (non-fatal)", err);
}
```
(Push failure must never fail the send — it is wrapped and logged.)

- [ ] **Step 9: Typecheck + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint lib/push-subscribe.ts components/push-banner.tsx components/coach-shell/coach-push-optin.tsx components/coach-shell/coach-shell.tsx lib/push.ts worker/index.ts actions/messages.ts`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add lib/push-subscribe.ts components/push-banner.tsx components/coach-shell/coach-push-optin.tsx components/coach-shell/coach-shell.tsx lib/push.ts supabase/functions/send-push/index.ts worker/index.ts actions/messages.ts
git commit -m "feat(push): notify recipient on new message + coach opt-in + deep-link"
```

---

## Task 12: Final verification on Vercel

No code changes — this proves the feature end-to-end (the sandbox can't run it).

- [ ] **Step 1: Push the branch and deploy a Vercel preview**

```bash
git push -u origin feature/live-messaging
```
Use the existing Vercel project (`koachapp`) to build a preview deployment of this branch (or merge per your normal flow). Ensure `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_*`, and `SUPABASE_SERVICE_ROLE_KEY` are present in the environment.

- [ ] **Step 2: Live update — both directions**

Open the client app (logged in as a client) and the coach app (logged in as coach) in two windows. Send coach→client and client→coach. Expected: each message appears on the other side within ~2s with no refresh.

- [ ] **Step 3: Unread badges**

With the client NOT on `/app/messages`, send a coach→client message. Expected: the client's Messages tab badge increments live. With the coach on the roster, send client→coach. Expected: that client's roster badge increments live. Opening the thread clears the badge within ~1s.

- [ ] **Step 4: Read receipts**

Coach sends; client opens the chat. Expected: the coach's message flips to "READ" live.

- [ ] **Step 5: Push when backgrounded**

Enable notifications on both sides (client `PushBanner`, coach "Enable message alerts"). Background/close the recipient app; send a message. Expected: a phone/OS notification arrives; tapping it opens the chat (client → `/app/messages`; coach → that client's page). With the chat already focused, no duplicate OS notification appears.

- [ ] **Step 6: Record outcome**

Note any failures and loop back to the relevant task. When all pass, the feature is complete and ready to merge.

---

## Self-review notes (filled in by plan author)

- **Spec coverage:** live updates (Tasks 1,3,4,7–9), unread badges (Tasks 5,7,10), read receipts (Tasks 2,4,7,9), dedicated client chat + home preview (Tasks 7,8), push to recipient incl. coach (Task 11), deep-link + no-double-ping (Task 11), Croatian/English copy (Task 6). Non-goals (typing/presence/attachments/edit/groups) intentionally absent.
- **No DB migration for coach push:** confirmed coach is a `clients` row and `push_subscriptions` RLS allows `is_coach()`.
- **Type consistency:** `Message` always imported from `actions/messages.ts`; `useMessageThread` returns `{ messages, loading, error, send, markRead, refetch }`; `useCoachUnread(initial)` → `Record<string, number>`; context exposes `CoachUnreadContext` + `useClientUnreadCount` (the live total is derived inside `CoachShell`, not the context).
- **Realtime auth** explicitly set before subscribe (Task 3) — the most likely "it connects but nothing arrives" failure.
