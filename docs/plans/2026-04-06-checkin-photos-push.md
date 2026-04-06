# Check-in, Photos & Push Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build weekly check-in form, progress photo upload/gallery with comparison, and push notification subscription + Edge Function for sending reminders.

**Architecture:** Client Components with Server Actions for all DB operations. Photos stored in Supabase Storage `progress-photos` bucket (private, signed URLs). Push notifications via Web Push API with VAPID keys, subscription stored in DB, sending via Supabase Edge Function.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (DB + Storage + Edge Functions), Web Push API, Tailwind CSS, shadcn/ui, Lucide icons, Sonner toasts.

---

## Task 1: Check-in Server Actions

**Files:**
- Create: `actions/checkin.ts`

**Step 1: Create `actions/checkin.ts` with two Server Actions**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export type CheckinData = {
  energy_level: number;
  stress_level: number;
  motivation: number;
  sleep_quality: number;
  appetite: number;
  adherence_diet_pct: number | null;
  adherence_training: boolean;
  what_went_well: string | null;
  challenges: string | null;
  goals_next_week: string | null;
  questions_for_coach: string | null;
  overall_rating: number;
};

export async function getThisWeekCheckin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Nisi prijavljen/a." };

  // Calculate last Monday (ISO week starts Monday)
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const mondayStr = monday.toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("client_id", user.id)
    .gte("checkin_date", mondayStr)
    .lte("checkin_date", todayStr)
    .maybeSingle();

  if (error) {
    console.error("Checkin fetch error:", error);
    return { error: "Greška pri dohvaćanju prijave." };
  }

  return { data };
}

export async function submitCheckin(formData: CheckinData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Nisi prijavljen/a." };

  const today = new Date().toISOString().split("T")[0];

  // Calculate ISO week number
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);

  const { error } = await supabase.from("checkins").insert({
    client_id: user.id,
    checkin_date: today,
    week_number: weekNumber,
    ...formData,
  });

  if (error) {
    console.error("Checkin submit error:", error);
    return { error: "Greška pri slanju prijave. Pokušaj ponovo." };
  }

  return { success: true };
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd "/Users/chartfumonkey/Documents/Code & Data/KoachApp Claude/koachapp" && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add actions/checkin.ts
git commit -m "feat: add check-in server actions (get this week + submit)"
```

---

## Task 2: Check-in Page UI

**Files:**
- Create: `app/app/checkin/page.tsx`

**Step 1: Create the check-in page**

This is a Client Component. On mount it calls `getThisWeekCheckin()`. If a check-in exists, it renders read-only. If not, it shows the form.

Key UI elements:
- 5 range sliders (1-10) for: energy, stress, motivation, sleep quality, appetite — each shows current value as `<span className="text-blue-400">{value}</span>/10`
- Number input for diet adherence %
- Checkbox for training adherence ("Jesi li pratio/la plan treninga?")
- 4 textareas: what went well, challenges, goals, questions for coach
- Final slider (1-10): overall rating
- Large submit button "Posalji prijavu"
- On submit: call `submitCheckin()`, on success set state to show read-only view
- Loading state with Loader2 spinner (matches log page pattern)
- Slider styling: `className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-blue-500"` (matches daily log)
- Textarea styling: same as daily log notes textarea
- Read-only view: show all values in a card grid, non-editable, with green "Prijava predana" badge at top

```
Imports: useState, useEffect, Loader2, toast (sonner), Button, Label, Input, Card, CardContent, Badge
  from actions/checkin: getThisWeekCheckin, submitCheckin, CheckinData
```

**Step 2: Verify the page renders**

Run: `cd "/Users/chartfumonkey/Documents/Code & Data/KoachApp Claude/koachapp" && npx next build 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add app/app/checkin/page.tsx
git commit -m "feat: add weekly check-in page with form and read-only view"
```

---

## Task 3: Photos Server Actions

**Files:**
- Create: `actions/photos.ts`

**Step 1: Create `actions/photos.ts`**

Server Actions needed:
1. `getPhotos()` — fetch all progress_photos for the user, ordered by photo_date desc. For each photo, generate a signed URL (1 hour expiry) using supabase storage.
2. `uploadPhoto(formData: FormData)` — receives the file + angle. Uploads to storage at `{user_id}/{timestamp}_{angle}.jpg`, inserts row into progress_photos. Returns the new photo row with signed URL.
3. `getPhotoSignedUrls(paths: string[])` — batch generate signed URLs for comparison view.

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export async function getPhotos() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Nisi prijavljen/a." };

  const { data: photos, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("client_id", user.id)
    .order("photo_date", { ascending: false });

  if (error) {
    console.error("Photos fetch error:", error);
    return { error: "Greška pri dohvaćanju fotografija." };
  }

  // Generate signed URLs for all photos
  const photosWithUrls = await Promise.all(
    (photos || []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(photo.storage_path, 3600);
      return { ...photo, signedUrl: data?.signedUrl || null };
    })
  );

  return { data: photosWithUrls };
}

export async function uploadPhoto(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Nisi prijavljen/a." };

  const file = formData.get("file") as File | null;
  const angle = formData.get("angle") as string;

  if (!file) return { error: "Nema datoteke." };

  const timestamp = Date.now();
  const storagePath = `${user.id}/${timestamp}_${angle}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("progress-photos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { error: "Greška pri uploadu fotografije." };
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: row, error: insertError } = await supabase
    .from("progress_photos")
    .insert({
      client_id: user.id,
      photo_date: today,
      storage_path: storagePath,
      angle,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Photo insert error:", insertError);
    return { error: "Greška pri spremanju fotografije." };
  }

  // Generate signed URL for the new photo
  const { data: urlData } = await supabase.storage
    .from("progress-photos")
    .createSignedUrl(storagePath, 3600);

  return { data: { ...row, signedUrl: urlData?.signedUrl || null } };
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add actions/photos.ts
git commit -m "feat: add photo server actions (get, upload with signed URLs)"
```

---

## Task 4: Photos Page UI

**Files:**
- Create: `app/app/photos/page.tsx`

**Step 1: Create the photos page**

Client Component with three sections:

**Upload section (top):**
- State machine: `idle` -> `selecting_angle` -> `selecting_file` -> `uploading`
- "Dodaj fotografiju" button -> shows 4 large angle buttons:
  - Sprijeda (front), Postrance (side), Straga (back), Ostalo (other)
- After angle selected: render `<input type="file" accept="image/*" capture="environment" />` — auto-triggered via ref
- On file select: call `uploadPhoto()` with FormData, show uploading state with Loader2
- On success: prepend new photo to gallery, toast success, reset to idle

**Gallery section (middle):**
- Photos grouped by date using `Object.groupBy` or manual reduce
- Each date group: header with formatted date, then grid of square thumbnails
- Thumbnails: `aspect-square object-cover rounded-lg` — tappable to view full size in a modal/overlay
- Full-size view: overlay with dark background, image centered, tap/X to close

**Comparison section (bottom):**
- Two `<select>` dropdowns populated with unique dates that have photos
- When both dates selected: show photos from each date side by side
- Use signed URLs from the already-fetched photo data

```
Imports: useState, useEffect, useRef, Loader2, Camera, X, toast (sonner), Button, Card, CardContent
  from actions/photos: getPhotos, uploadPhoto
```

**Step 2: Verify the page builds**

Run: `npx next build 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add app/app/photos/page.tsx
git commit -m "feat: add progress photos page with upload, gallery, and comparison"
```

---

## Task 5: Add Photos to Bottom Nav

**Files:**
- Modify: `app/app/layout.tsx`

**Step 1: Add Camera tab to bottom navigation**

Add a new tab between "Prijava" and "Profil":
```typescript
{ label: "Foto", icon: Camera, route: "/app/photos" },
```

Import `Camera` from lucide-react alongside existing icons.

The tabs array becomes 6 items: Danas, Dnevnik, Trening, Prijava, Foto, Profil.

**Step 2: Verify layout renders**

Run: `npx next build 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add app/app/layout.tsx
git commit -m "feat: add photos tab to bottom navigation"
```

---

## Task 6: Push Notification Banner Component

**Files:**
- Create: `components/push-banner.tsx`
- Modify: `app/app/layout.tsx` (add PushBanner)
- Create: `actions/push.ts`

**Step 1: Create the push subscription Server Action**

`actions/push.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Nisi prijavljen/a." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      client_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Push subscription save error:", error);
    return { error: "Greška pri spremanju pretplate." };
  }

  return { success: true };
}
```

**Step 2: Create `components/push-banner.tsx`**

Client Component:
- `useEffect` checks `typeof window !== "undefined"` and `"Notification" in window`
- If `Notification.permission === "granted"`: silently ensure subscription exists (register SW, subscribe, save)
- If `Notification.permission === "default"` and `localStorage.getItem("push-dismissed") !== "true"`: show banner
- Banner: fixed bottom bar (above the nav), dark card with text "Ukljuci podsjetnike za dnevni log", "Ukljuci" button, X dismiss button
- On "Ukljuci": `Notification.requestPermission()` → if granted → subscribe → save → hide banner
- On X: `localStorage.setItem("push-dismissed", "true")` → hide banner
- Subscribe flow: `navigator.serviceWorker.ready` → `reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) })`
- Include `urlBase64ToUint8Array` helper function inline

**Step 3: Add PushBanner to client layout**

In `app/app/layout.tsx`, import and render `<PushBanner />` inside the fragment, after `<main>` and before `<nav>`.

**Step 4: Verify build**

Run: `npx next build 2>&1 | tail -20`

**Step 5: Commit**

```bash
git add actions/push.ts components/push-banner.tsx app/app/layout.tsx
git commit -m "feat: add push notification banner with subscription flow"
```

---

## Task 7: Supabase Edge Function for Sending Push

**Files:**
- Create: `supabase/functions/send-push/index.ts`

**Step 1: Create the Edge Function**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { client_id, title, body } = await req.json();

    if (!client_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing client_id, title, or body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("client_id", client_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const sub of subscriptions || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body })
        );
        sent++;
      } catch (err) {
        console.error("Push send error:", err);
        // If subscription is expired/invalid (410 Gone), delete it
        if (err.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

**Step 2: Add push event handler to service worker**

We need a custom service worker file `public/custom-sw.js` that next-pwa can import, OR we add push handling inline. Since next-pwa generates `sw.js`, we create `public/push-sw.js` and register it separately, OR we use the `customWorkerDir` option.

Simplest approach: add a `worker/index.ts` file for next-pwa custom worker code:

Create `worker/index.ts`:
```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "KoachApp", body: "Novi podsjetnik!" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("/app");
      }
    })
  );
});
```

Update `next.config.ts` to include `customWorkerDir: "worker"`:
```typescript
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  customWorkerDir: "worker",
});
```

**Step 3: Commit**

```bash
git add supabase/functions/send-push/index.ts worker/index.ts next.config.ts
git commit -m "feat: add push notification Edge Function and service worker push handler"
```

---

## Task 8: Coach "Send Reminder" Button

**Files:**
- Create: `actions/send-reminder.ts`
- Modify: `app/coach/clients/[id]/client-detail.tsx` (add button in header)

**Step 1: Create Server Action for sending reminders**

`actions/send-reminder.ts`:
```typescript
"use server";

export async function sendReminder(clientId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      client_id: clientId,
      title: "KoachApp podsjetnik",
      body: "Ne zaboravi unijeti dnevni log!",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Send reminder error:", errText);
    return { error: "Greška pri slanju podsjetnika." };
  }

  const result = await res.json();
  return { sent: result.sent as number };
}
```

**Step 2: Add button to coach client detail header**

In `client-detail.tsx`, import `sendReminder` and `Bell` icon. Add state for sending. Below the client name/badges in the header, add:
```tsx
<Button variant="outline" size="sm" onClick={handleSendReminder} disabled={sendingReminder}>
  <Bell size={14} /> {sendingReminder ? "Šaljem..." : "Pošalji podsjetnik"}
</Button>
```

Show toast on success: `toast.success(\`Podsjetnik poslan (${result.sent})\`)` or `toast.error(result.error)`.

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -20`

**Step 4: Commit**

```bash
git add actions/send-reminder.ts app/coach/clients/[id]/client-detail.tsx
git commit -m "feat: add send reminder button to coach client detail"
```

---

## Task 9: VAPID Key Generation & Deployment Instructions

**Step 1: Document VAPID key setup and Edge Function deployment**

Add to the project a note or output the following instructions:

### Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```
This outputs a public key and private key.

### Add to `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key from above>
```

### Set Supabase secrets:
```bash
npx supabase secrets set VAPID_PRIVATE_KEY=<private key>
npx supabase secrets set VAPID_PUBLIC_KEY=<public key>
npx supabase secrets set VAPID_SUBJECT=mailto:igor.milihram@gmail.com
```

### Deploy the Edge Function:
```bash
npx supabase functions deploy send-push --project-ref zyjwkdsulzosfuadnnwq
```

### Verify it works:
```bash
curl -X POST "https://zyjwkdsulzosfuadnnwq.supabase.co/functions/v1/send-push" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"<test_client_uuid>","title":"Test","body":"Hello!"}'
```

**Step 2: Commit final plan doc**

```bash
git add docs/plans/
git commit -m "docs: add Phase 5 implementation plan"
```
