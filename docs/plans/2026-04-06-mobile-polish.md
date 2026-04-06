# Mobile Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the mobile experience — fix tap targets, overflow, safe-area, iOS zoom, loading/error states; add PWA install prompt; enhance profile page with targets/phase info; verify middleware edge cases.

**Architecture:** All changes are in existing files except one new component (InstallBanner). Profile page gets a new server action to fetch client dashboard data (targets, phase, start info). No database changes needed.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Supabase, TypeScript

---

### Task 1: Fix global CSS — prevent horizontal scroll

**Files:**
- Modify: `app/globals.css:120-130`

**Step 1: Add overflow-x hidden to body**

In `globals.css`, update the `@layer base` block — add `overflow-x: hidden` to body:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground overflow-x-hidden;
  }
  html {
    @apply font-sans;
  }
}
```

**Step 2: Verify the dev server runs**

Run: `cd koachapp && npm run dev`
Expected: No errors, app loads normally.

---

### Task 2: Fix bottom nav safe-area padding

**Files:**
- Modify: `app/app/layout.tsx:29-58`

The current code has a bug: `paddingBottom: "calc(5rem + env(safe-area-inset-bottom))"` on the nav itself makes it way too tall. The nav should only add `env(safe-area-inset-bottom)` as padding. The `pb-20` on main already accounts for content spacing.

**Step 1: Fix the nav element**

Replace the nav's inline style and update main padding to be safe-area aware:

```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</main>
      <PushBanner />

      <nav className="fixed bottom-0 w-full border-t border-gray-800 bg-gray-950 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const isActive =
              tab.route === "/app"
                ? pathname === "/app"
                : pathname.startsWith(tab.route);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.route}
                href={tab.route}
                className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 px-2 py-1 ${
                  isActive ? "text-blue-500" : "text-gray-500"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
```

Key changes:
- Nav: replaced inline style with `pb-[env(safe-area-inset-bottom)]` class
- Main: changed `pb-20` to `pb-[calc(4rem+env(safe-area-inset-bottom))]` for dynamic spacing
- Links: added `min-w-[48px]` for horizontal tap target compliance (Apple HIG 44px min)

---

### Task 3: Fix login page — Croatian errors, loading spinner, input sizing

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**Step 1: Add Croatian error mapping and loading spinner**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Pogrešan email ili lozinka.";
  if (message.includes("Email not confirmed"))
    return "Email adresa nije potvrđena.";
  if (message.includes("Too many requests"))
    return "Previše pokušaja. Pokušaj ponovo za par minuta.";
  if (message.includes("User not found"))
    return "Korisnik nije pronađen.";
  if (message.includes("Network"))
    return "Greška s mrežom. Provjeri internetsku vezu.";
  return "Greška pri prijavi. Pokušaj ponovo.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(translateAuthError(authError.message));
      setLoading(false);
      return;
    }

    if (data.user?.id === process.env.NEXT_PUBLIC_COACH_UUID) {
      router.push("/coach");
    } else {
      router.push("/app");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <Card className="w-full max-w-sm border-gray-800 bg-gray-900">
        <CardHeader>
          <h1 className="text-center text-2xl font-bold text-white">
            KoachApp
          </h1>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@primjer.com"
                className="h-11 border-gray-700 bg-gray-800 text-base text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-gray-300">
                Lozinka
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                className="h-11 border-gray-700 bg-gray-800 text-base text-white placeholder:text-gray-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Prijava...
                </>
              ) : (
                "Prijava"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

Key changes:
- `translateAuthError()` maps Supabase English errors to Croatian
- Added `Loader2` spinner on submit button
- Inputs now `h-11` (44px) for touch targets
- Submit button now `h-11 text-base` for better mobile sizing

---

### Task 4: Fix workout video button tap target

**Files:**
- Modify: `app/app/workout/page.tsx:177-184`

**Step 1: Increase video button size**

Replace the video link button:
```tsx
{ex.video_url && (
  <a
    href={ex.video_url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-500/20 px-3 py-2 text-sm font-medium text-blue-400"
  >
    <Play className="size-3.5" /> Video
  </a>
)}
```

Changes: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`, icon `size-3` → `size-3.5`, gap `1` → `1.5`. This brings the touch target above 44px height.

---

### Task 5: Fix photos page — select font size, close button tap targets

**Files:**
- Modify: `app/app/photos/page.tsx`

**Step 1: Fix select elements font-size (prevent iOS zoom)**

Change both `<select>` elements from `text-sm` to `text-base`:

```tsx
<select
  value={compareDate1}
  onChange={(e) => setCompareDate1(e.target.value)}
  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-300"
>
```

Do the same for `compareDate2` select.

**Step 2: Fix close/back button tap targets in full view overlay**

Replace the back button:
```tsx
<button
  onClick={() => setFullViewPhoto(null)}
  className="absolute left-4 top-4 flex min-h-[44px] min-w-[44px] items-center gap-1 text-sm text-gray-400 hover:text-white"
>
  <ChevronLeft size={20} />
  Natrag
</button>
```

**Step 3: Fix cancel upload (X) button tap target**

Replace:
```tsx
<button
  onClick={() => setUploadStep("idle")}
  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:text-gray-300"
>
  <X size={18} />
</button>
```

---

### Task 6: Create PWA Install Banner component

**Files:**
- Create: `components/install-banner.tsx`
- Modify: `app/app/layout.tsx` (add import and render)

**Step 1: Create the InstallBanner component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already dismissed
    if (localStorage.getItem("install-dismissed") === "true") {
      setDismissed(true);
      return;
    }

    // Already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setDismissed(true);
      return;
    }

    // Check iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOS && isSafari) {
      setShowIOSHint(true);
      return;
    }

    // Android/Chrome — listen for beforeinstallprompt
    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  function handleDismiss() {
    localStorage.setItem("install-dismissed", "true");
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSHint(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  }

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 pb-2">
      <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 shadow-lg">
        {showIOSHint ? (
          <>
            <Share size={20} className="shrink-0 text-blue-400" />
            <p className="flex-1 text-sm text-gray-300">
              Dodaj na pocetni zaslon: tapni{" "}
              <Share size={14} className="mb-0.5 inline" /> ikonu dijeljenja
              &rarr; &quot;Dodaj na pocetni zaslon&quot;
            </p>
          </>
        ) : (
          <>
            <Download size={20} className="shrink-0 text-blue-400" />
            <p className="flex-1 text-sm text-gray-300">
              Instaliraj KoachApp na pocetni zaslon za bolje iskustvo
            </p>
            <Button size="sm" onClick={handleInstall}>
              Instaliraj
            </Button>
          </>
        )}
        <button
          onClick={handleDismiss}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:text-gray-300"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Add InstallBanner to app layout**

In `app/app/layout.tsx`, import and render alongside PushBanner:

```tsx
import InstallBanner from "@/components/install-banner";

// In the JSX, after <PushBanner />:
<InstallBanner />
```

---

### Task 7: Create profile dashboard server action

**Files:**
- Modify: `actions/profile.ts` (add new action)

**Step 1: Add getProfileDashboard action**

Add to the bottom of `actions/profile.ts`:

```ts
export async function getProfileDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Nisi prijavljen/a." };
  }

  const [{ data: client }, { data: phase }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "start_date, start_weight_kg, target_calories, target_protein_g, target_carbs_g, target_fat_g, target_steps, target_sleep_h"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("phases")
      .select("name, type, start_date")
      .eq("client_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  return {
    data: {
      targets: client
        ? {
            calories: client.target_calories,
            protein: client.target_protein_g,
            carbs: client.target_carbs_g,
            fat: client.target_fat_g,
            steps: client.target_steps,
            sleep: client.target_sleep_h,
          }
        : null,
      phase: phase ? { name: phase.name, type: phase.type, start_date: phase.start_date } : null,
      start_date: client?.start_date || null,
      start_weight: client?.start_weight_kg || null,
    },
  };
}
```

---

### Task 8: Enhance profile page with dashboard info

**Files:**
- Modify: `app/app/profile/page.tsx`

**Step 1: Add dashboard section above the edit form**

Full rewrite of the profile page to include a read-only dashboard section above the existing edit form:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getProfile, updateProfile, getProfileDashboard } from "@/actions/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  full_name: string | null;
  email: string | undefined;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
};

type Dashboard = {
  targets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    steps: number | null;
    sleep: number | null;
  } | null;
  phase: { name: string; type: string | null; start_date: string } | null;
  start_date: string | null;
  start_weight: number | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    async function load() {
      const [profileResult, dashResult] = await Promise.all([
        getProfile(),
        getProfileDashboard(),
      ]);
      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (dashResult.data) setDashboard(dashResult.data as Dashboard);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!profile?.full_name?.trim()) {
      toast.error("Ime je obavezno.");
      return;
    }
    setSaving(true);
    const result = await updateProfile({
      full_name: profile.full_name.trim(),
      height_cm: profile.height_cm,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profil azuriran!");
    }
    setSaving(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-gray-400">
        Profil nije pronaden.
      </div>
    );
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="mb-6 text-2xl font-bold">Profil</h1>

      {/* === Dashboard Section === */}
      {dashboard && (
        <div className="mb-6 space-y-4">
          {/* Name greeting */}
          {profile.full_name && (
            <p className="text-lg text-gray-300">
              {profile.full_name}
            </p>
          )}

          {/* Phase info */}
          {dashboard.phase && (
            <Card size="sm">
              <CardContent>
                <p className="text-xs text-gray-500">Trenutna faza</p>
                <p className="text-base font-semibold">{dashboard.phase.name}</p>
                {dashboard.phase.type && (
                  <p className="text-sm text-gray-400">{dashboard.phase.type}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Targets */}
          {dashboard.targets && (
            <Card size="sm">
              <CardContent>
                <p className="mb-2 text-xs text-gray-500">Ciljevi</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {dashboard.targets.calories != null && (
                    <div>
                      <span className="text-gray-400">Kalorije: </span>
                      <span className="font-medium">{dashboard.targets.calories} kcal</span>
                    </div>
                  )}
                  {dashboard.targets.protein != null && (
                    <div>
                      <span className="text-gray-400">Proteini: </span>
                      <span className="font-medium">{dashboard.targets.protein} g</span>
                    </div>
                  )}
                  {dashboard.targets.carbs != null && (
                    <div>
                      <span className="text-gray-400">UH: </span>
                      <span className="font-medium">{dashboard.targets.carbs} g</span>
                    </div>
                  )}
                  {dashboard.targets.fat != null && (
                    <div>
                      <span className="text-gray-400">Masti: </span>
                      <span className="font-medium">{dashboard.targets.fat} g</span>
                    </div>
                  )}
                  {dashboard.targets.steps != null && (
                    <div>
                      <span className="text-gray-400">Koraci: </span>
                      <span className="font-medium">{dashboard.targets.steps.toLocaleString()}</span>
                    </div>
                  )}
                  {dashboard.targets.sleep != null && (
                    <div>
                      <span className="text-gray-400">San: </span>
                      <span className="font-medium">{dashboard.targets.sleep} h</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Start info */}
          {(dashboard.start_date || dashboard.start_weight) && (
            <Card size="sm">
              <CardContent>
                <div className="flex gap-6 text-sm">
                  {dashboard.start_date && (
                    <div>
                      <span className="text-gray-400">Pocetak: </span>
                      <span className="font-medium">
                        {new Date(dashboard.start_date + "T00:00").toLocaleDateString("hr-HR")}
                      </span>
                    </div>
                  )}
                  {dashboard.start_weight && (
                    <div>
                      <span className="text-gray-400">Pocetna tezina: </span>
                      <span className="font-medium">{dashboard.start_weight} kg</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="border-t border-gray-800" />
        </div>
      )}

      {/* === Edit Profile Form === */}
      <h2 className="mb-4 text-lg font-semibold">Uredi profil</h2>

      <Card>
        <CardContent className="space-y-4 pt-2">
          <div>
            <Label htmlFor="full_name">Ime i prezime</Label>
            <Input
              id="full_name"
              value={profile.full_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
              className="h-11"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email || ""}
              disabled
              className="h-11 text-gray-500"
            />
          </div>

          <div>
            <Label htmlFor="dob">Datum rodenja</Label>
            <Input
              id="dob"
              type="date"
              value={profile.date_of_birth || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  date_of_birth: e.target.value || null,
                })
              }
              className="h-11"
            />
          </div>

          <div>
            <Label htmlFor="height">Visina (cm)</Label>
            <Input
              id="height"
              type="number"
              value={profile.height_cm ?? ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  height_cm: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className="h-11"
            />
          </div>

          <div>
            <Label>Spol</Label>
            <div className="mt-1 flex gap-2">
              {(["M", "F"] as const).map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={profile.gender === g ? "default" : "outline"}
                  className="h-11 min-w-[48px] px-4"
                  onClick={() => setProfile({ ...profile, gender: g })}
                >
                  {g === "M" ? "Musko" : "Zensko"}
                </Button>
              ))}
              {profile.gender && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11"
                  onClick={() => setProfile({ ...profile, gender: null })}
                >
                  Ponisti
                </Button>
              )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 h-11 w-full text-base"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Spremam...
              </>
            ) : (
              "Spremi"
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="my-6 border-t border-gray-800" />

      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={signingOut}
        className="h-11 w-full text-base text-red-400 hover:text-red-300"
      >
        <LogOut className="mr-2 size-4" />
        {signingOut ? "Odjava..." : "Odjava"}
      </Button>
    </div>
  );
}
```

Key changes from original:
- Dashboard section showing current phase, targets, start info
- All inputs `h-11` (44px) for touch targets
- Gender buttons `h-11 min-w-[48px]` for touch targets
- Sign out and save buttons `h-11 text-base`
- Fetches `getProfileDashboard()` in parallel with `getProfile()`

---

### Task 9: Verify middleware edge cases

**Files:**
- Read: `middleware.ts` (no changes needed)

**Step 1: Verify the logic**

The middleware already handles all required cases correctly:
- Logged-out → `/app` → redirects to `/login` (line 55-57)
- Client → `/coach` → redirects to `/app` (line 66-68)
- Coach → `/app` → **ALLOWED** (coach is a user, passes the `!user` check on line 55, returns supabaseResponse on line 58)
- Logged-in → `/login` → redirects to `/app` or `/coach` (lines 45-49)

No code changes needed. Just verify by reading the file.

---

## Summary of all changes

| File | Change |
|------|--------|
| `app/globals.css` | Add `overflow-x-hidden` to body |
| `app/app/layout.tsx` | Fix safe-area padding, add min-w tap targets, add InstallBanner |
| `app/(auth)/login/page.tsx` | Croatian errors, loading spinner, h-11 inputs |
| `app/app/workout/page.tsx` | Bigger video button tap target |
| `app/app/photos/page.tsx` | text-base on selects, min-h/w on close buttons |
| `components/install-banner.tsx` | NEW — PWA install prompt (Android + iOS) |
| `actions/profile.ts` | Add `getProfileDashboard()` action |
| `app/app/profile/page.tsx` | Dashboard section with targets/phase/start info, h-11 inputs |
| `middleware.ts` | No changes (already correct) |
