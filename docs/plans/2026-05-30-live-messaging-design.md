# Live Messaging (Coach ↔ Client) — Design

**Date:** 2026-05-30
**Branch:** `feature/live-messaging`
**Status:** Approved design → implementation plan to follow

## Summary

KoachApp already stores coach↔client messages correctly (table, RLS, server
actions, and basic UI all exist). The problem: every messaging surface loads
messages **once** and never updates, so a new message is invisible until the
page is refreshed. This feature makes messaging **live** — new messages and
read-receipts appear within ~1 second with no refresh — and adds **phone push
notifications** so a recipient is alerted even when the app is closed.

The user (Igor) explicitly chose: **live in-app updates AND phone push when the
app is closed**, and a **dedicated full-screen client chat** (plus a live home
preview), with the coach keeping the existing message popup upgraded to live.

## Goals

- New messages appear on the other party's screen within ~1s, no manual refresh.
- An unread indicator (badge/count) is visible without opening the thread, and
  updates live: a Messages tab badge for the client, per-client roster badges
  for the coach.
- Read-receipts ("READ") update live for the sender when the recipient views.
- A dedicated client chat screen at `/app/messages` with a live home preview.
- Phone push notification to the **recipient** on every new message (coach→client
  and client→coach), including enabling push for the coach.
- Tapping a notification deep-links to the chat; no duplicate ping when the
  recipient is already viewing that chat.

## Non-goals (explicitly out of scope)

- Typing indicators ("…is typing") and online/presence dots.
- Attachments (images/files) in messages.
- Message editing or deletion.
- Group conversations (system is strictly one coach ↔ one client).
- A separate notification-preferences UI (reuse the existing push opt-in).

## Current state (verified against code + DB, 2026-05-30)

**Database** (`messages` table — confirmed via SQL):
- Columns: `id uuid pk`, `client_id uuid`, `sender_id uuid`, `body text`,
  `created_at timestamptz`, `read_at timestamptz null`.
- RLS **enabled** with correct policies:
  - `messages_select_client`: `client_id = auth.uid()`
  - `messages_select_coach`: `is_coach()`
  - `messages_insert_client`: `sender_id = auth.uid() AND client_id = auth.uid()`
  - `messages_insert_coach`: `is_coach() AND sender_id = auth.uid()`
  - `messages_update_client` / `messages_update_coach` (for read-receipts).
- **Gap:** table is **NOT** in the `supabase_realtime` publication, so no live
  events are broadcast. Replica identity is DEFAULT (fine — INSERT/UPDATE
  payloads carry the new row, which is all we need).

**Server actions** (`actions/messages.ts`) — all exist and are correct:
- `sendMessage(clientId, body)`, `listMessages(clientId, limit)`,
  `markMessagesRead(clientId)`, `getUnreadCount(clientId)`.
- Authorization: sender must be the coach (`NEXT_PUBLIC_COACH_UUID`) or the
  client themselves.

**Client UI:**
- `components/client-shell/inbox-card.tsx` — home card, last 3 messages + reply,
  loads once (`app/app/page.tsx`).
- `app/app/layout.tsx` — client shell: desktop left rail + mobile bottom bar,
  6 tabs (home/log/workout/checkin/reports/profile) via `useTranslations("app.nav")`,
  plus `PushBanner` and `ClientContextRail`.

**Coach UI:**
- `components/coach-shell/message-dialog.tsx` — per-client thread popup, loads
  once on open; opened from `app/coach/clients/[id]/client-detail.tsx`.
- `app/coach/page.tsx` — roster dashboard, built server-side with `supabaseAdmin`,
  renders `RosterTable` (desktop) + `MobileRoster` (mobile). No unread indicator.

**Push system** (exists, client-only today):
- `actions/push.ts` `savePushSubscription` → `push_subscriptions` table keyed by
  `client_id` (= any `user.id`, so it can also hold the coach's subscription).
- `lib/push.ts` `sendPushToClient(userId, title, body)` → calls the
  `send-push` Supabase Edge Function (`supabase/functions/send-push`).
- `components/push-banner.tsx` is rendered only in the **client** layout; the
  coach has no way to subscribe yet.

**Infra notes:**
- Browser client `lib/supabase/client.ts` uses `createBrowserClient`
  (`@supabase/ssr`) — carries the auth session, so Realtime subscriptions are
  RLS-authorized as the logged-in user automatically.
- Next.js **16.2.2** / React 19. `AGENTS.md` warns APIs differ from training
  data — consult `node_modules/next/dist/docs/` before writing framework code.
- Coach UUID: `NEXT_PUBLIC_COACH_UUID`. Client UI Croatian, coach UI English.

## Architecture

The design adds a thin **live layer** over the existing data layer. Nothing
about how messages are stored or authorized changes; we add (a) Realtime
subscriptions on the client, (b) unread badges, (c) a dedicated chat screen,
and (d) push-on-send.

### 1. Database migration (enable Realtime)

A single migration `supabase/migrations/20260530_messages_realtime.sql`:

```sql
alter publication supabase_realtime add table public.messages;
```

RLS already governs what each subscriber can receive: a client receives only
their own thread; the coach receives all. No policy changes needed.

### 2. Shared live hook — `lib/messages/use-message-thread.ts` (`"use client"`)

Single source of truth for a live thread, consumed by both the client chat and
the coach popup so the realtime logic lives in exactly one place.

`useMessageThread({ clientId, currentUserId })` returns
`{ messages, loading, error, send, markRead }` and:
- Loads initial history via `listMessages(clientId)`.
- Opens a Supabase channel subscribed to `postgres_changes` on `public.messages`
  filtered by `client_id=eq.<clientId>`, handling:
  - **INSERT** → append, **deduped by `id`** (the sender already added their own
    message optimistically, and the echo must not duplicate it).
  - **UPDATE** → patch `read_at` in place (drives live "READ" receipts).
- On reconnect / window refocus, re-fetches the thread to backfill any messages
  missed while disconnected (gap recovery).
- `send(body)` calls the existing `sendMessage` action and optimistically appends.
- `markRead()` calls `markMessagesRead`.

### 3. Unread badges — `lib/messages/use-unread.ts` (`"use client"`)

- **Client variant** `useClientUnread(userId)`: initial count via `getUnreadCount`,
  kept live by subscribing to inserts/updates on the user's own thread (messages
  not sent by them). Drives the Messages tab badge.
- **Coach variant** `useCoachUnread()`: initial per-client counts (one query,
  grouped), kept live by subscribing to all `messages` and bumping the relevant
  client's count on insert / decrementing on read. Drives per-row roster badges
  and a roster-header total.

### 4. Client surfaces

- **New chat screen** `app/app/messages/page.tsx` + `components/client-shell/chat-view.tsx`:
  full-height scrollable thread, bubbles (mine vs coach), composer pinned to the
  bottom, auto-scroll to newest, marks read on mount and on each incoming
  message while focused. Croatian copy.
- **Nav tab**: add a 7th tab `messages` to the `tabs` array in `app/app/layout.tsx`
  (route `/app/messages`, hotkey `M`, on-theme glyph). Render a live unread badge
  on the tab in **both** the desktop rail and the mobile bottom bar via
  `useClientUnread`. Verify 7 tabs fit the ≤430px bottom bar (each is `flex-1`;
  expected fine — confirm visually on Vercel).
- **Home preview**: upgrade `inbox-card.tsx` to subscribe via `useMessageThread`
  (live) and link through to `/app/messages`.

### 5. Coach surfaces

- **Live popup**: refactor `message-dialog.tsx` to consume `useMessageThread`
  (replacing its one-shot `listMessages` load). Live incoming replies + live
  read-receipts. Behaviour/markup otherwise unchanged.
- **Roster badges**: surface per-client unread on `RosterTable` and `MobileRoster`.
  `app/coach/page.tsx` fetches initial per-client unread counts and passes them
  into the rows; a small client wrapper using `useCoachUnread` keeps them live and
  shows a header total (e.g. "3 unread"). New roster column/field is additive.

### 6. Push notifications (recipient alerting)

- **Fire on send**: in `sendMessage`, after a successful insert, notify the
  **recipient** (never the sender):
  - coach → client: `sendPushToClient(clientId, <Croatian title>, preview)`
  - client → coach: `sendPushToClient(COACH_UUID, "New message from <name>", preview)`
  - Best-effort: push failure must not fail the send (log and continue).
  - `body` preview truncated (~120 chars); titles localized per recipient
    (client = Croatian, coach = English).
- **Coach can subscribe**: render the push opt-in (`PushBanner` or a coach-styled
  equivalent) in the coach shell so the coach's device registers a
  `push_subscriptions` row. Without this, client→coach push has no target.
- **No double-ping**: update the `send-push` service worker handler to check for
  a focused client window on the chat route and skip showing the OS notification
  in that case; clicking a shown notification deep-links to the chat
  (`/app/messages` for client; the client's thread for coach).

### 7. i18n

Add a `messages` nav key and an `app.messages.*` namespace (screen title,
composer placeholder, empty state, send, "read", relative-time units) to **both**
`messages/en.json` and `messages/hr.json`. Coach-facing strings stay English.

## Data flow (end to end)

1. Coach sends in the popup → `sendMessage` inserts the row; coach's UI shows it
   optimistically.
2. Postgres broadcasts the INSERT on the `supabase_realtime` publication.
3. The client's open app receives it (RLS-scoped to their thread) and renders it
   within ~1s; if they're not on the chat screen, the Messages tab badge ticks up.
4. `sendMessage` also fires a push to the client; if their app is closed, the
   phone shows a notification that deep-links to the chat.
5. When the client opens/views the chat, `markMessagesRead` runs → UPDATE
   broadcast → the coach's popup flips the message to "READ" live.
6. Fully symmetric in reverse for client → coach.

## Edge cases & decisions

- **Echo dedupe:** realtime INSERT for a message the sender already appended is
  ignored by `id`.
- **Missed-while-offline:** refetch on channel resubscribe and on window focus.
- **Self vs other:** push and unread counts only ever consider messages where
  `sender_id != recipient`.
- **Best-effort push:** never block or fail a send because push failed.
- **Auth for Realtime:** relies on the SSR browser client's session; RLS already
  scopes delivery — no service-role key in the browser.
- **Coach without push subscription:** client→coach live update still works; only
  the closed-app phone ping is unavailable until the coach opts in.
- **Bottom nav at 7 tabs:** additive; verify spacing on a 430px viewport.

## Security

- No new tables, columns, or RLS policies. Realtime delivery is gated by the
  existing SELECT policies.
- Service-role key stays server-side (push send via Edge Function, as today).
- Message length cap (2000) and authorization checks remain in `sendMessage`.

## Testing & verification

Local `next dev` cannot bind in this sandbox; HTTP/RSC/Realtime/browser flows are
verified on the deployed Vercel app (per project memory).

- **Migration:** apply via Supabase MCP; confirm `messages` now appears in
  `pg_publication_tables` for `supabase_realtime`.
- **Static checks:** `npx tsc --noEmit` and `npx eslint` on all changed files.
- **Unit (vitest):** pure helpers only — INSERT dedupe-by-id and unread
  count/decrement logic.
- **End-to-end on Vercel:** two sessions (coach + client). Send both directions;
  confirm <~2s appearance with no refresh; confirm unread badges; confirm live
  "READ"; confirm push arrives with app backgrounded and that an active chat
  window is not double-pinged; confirm notification tap opens the chat.

## Rollout

1. Migration (live broadcast on).
2. Shared hooks.
3. Client chat screen + nav badge + live home preview.
4. Coach live popup + roster badges.
5. Push-on-send + coach push opt-in + service-worker focus/deep-link handling.
6. i18n strings.
7. Verify on Vercel.

Each step is independently shippable; messaging keeps working (one-shot load)
until each live piece lands, so there is no broken intermediate state.
