# Exercise Video + Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the coach attach an uploaded video file or an external (YouTube) link plus a client-facing description to each library exercise, and render both in the client's workout view.

**Architecture:** Add a `video_storage_path` column + a public `exercise-videos` Supabase Storage bucket. Coach server actions (`actions/exercises.ts`, service-role) handle validate/upload/cleanup, reusing the `actions/photos.ts` pattern. A pure `lib/video.ts` resolves YouTube embeds and public URLs (unit-tested). A shared `<ExerciseDemo>` renders YouTube `<iframe>` or HTML5 `<video>`. The coach form gets a Link/Upload toggle; the client workout page gets an expandable Demo section.

**Tech Stack:** Next.js 16 (App Router, Server Actions; build with `--webpack`), Supabase (Postgres + Storage, service-role admin client), next-intl (en/hr), vitest, Tailwind + custom "Athletic OS" UI.

---

## Conventions for this plan

- All paths are relative to the `koachapp/` project root.
- **Before editing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`** (per `AGENTS.md` — this Next.js 16 has breaking changes).
- This Supabase project is **remote-only** (no local stack). Apply migrations to the remote via the Supabase MCP `apply_migration` tool (project ref `zyjwkdsulzosfuadnnwq`). This step is done by the orchestrator, not a subagent.
- **Local `next build`/`next dev` cannot complete in this sandbox.** "Compiles" checks use `npx tsc --noEmit`; unit tests use `npm test`; full build + runtime are verified on a Vercel **preview** deploy (Task 9).
- Work happens on branch `feature/exercise-video` (already created and checked out; design spec already committed there).
- Commit after every task.

## File map

- **Create** `supabase/migrations/20260530_exercise_video_media.sql` — column + bucket.
- **Create** `lib/video.ts` — pure helpers (YouTube embed, public URL).
- **Create** `lib/video.test.ts` — unit tests for the above.
- **Create** `components/exercise-demo.tsx` — presentational video + description renderer.
- **Modify** `actions/exercises.ts` — video upload/validate/cleanup in create/update/delete; add `video_storage_path` to `getExercises` select.
- **Modify** `app/coach/exercises/page.tsx` — add `video_storage_path` to the select.
- **Modify** `app/coach/exercises/exercise-manager.tsx` — Link/Upload toggle, file input, remove button, rename Notes→Description, demo link for uploads, extend `Exercise` type.
- **Modify** `actions/workout.ts` — add `video_storage_path` to `getActiveProgram` and `getDayExercises` selects.
- **Modify** `app/app/workout/page.tsx` — expandable Demo section; extend `Exercise` type.
- **Modify** `messages/en.json`, `messages/hr.json` — new coach + client keys.

---

## Task 1: Database migration + storage bucket

**Files:**
- Create: `supabase/migrations/20260530_exercise_video_media.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260530_exercise_video_media.sql`:

```sql
-- Exercise video media: uploaded-file storage path + public bucket.
-- Links continue to use the existing exercises.video_url column.

alter table exercises add column if not exists video_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-videos',
  'exercise-videos',
  true,
  52428800, -- 50 MB
  array['video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

- [ ] **Step 2 (orchestrator): Apply the migration to the remote project**

Using the Supabase MCP, call `apply_migration` with project ref `zyjwkdsulzosfuadnnwq`, name `exercise_video_media`, and the SQL above. (Load the tool first via ToolSearch `select:mcp__f3e074d0-8326-4839-ad43-2c4acde46135__apply_migration` if its schema isn't loaded.)

- [ ] **Step 3: Verify the column and bucket exist**

Via Supabase MCP `execute_sql` (project ref `zyjwkdsulzosfuadnnwq`):

```sql
select column_name from information_schema.columns
where table_name = 'exercises' and column_name = 'video_storage_path';
select id, public, file_size_limit from storage.buckets where id = 'exercise-videos';
```

Expected: one row each (the column exists; the bucket is `public = true`, `file_size_limit = 52428800`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260530_exercise_video_media.sql
git commit -m "feat(exercise-video): add video_storage_path column + exercise-videos bucket"
```

---

## Task 2: Pure video helpers (`lib/video.ts`) — TDD

**Files:**
- Create: `lib/video.ts`
- Test: `lib/video.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/video.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isYouTubeUrl, getYouTubeEmbedUrl, buildPublicVideoUrl } from "./video";

describe("getYouTubeEmbedUrl", () => {
  it("converts a standard watch URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
  });
  it("converts a youtu.be short URL", () => {
    expect(getYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
  });
  it("converts a /shorts/ URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/shorts/abc12345678")).toBe(
      "https://www.youtube.com/embed/abc12345678"
    );
  });
  it("converts an already-embed URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/embed/abc12345678")).toBe(
      "https://www.youtube.com/embed/abc12345678"
    );
  });
  it("ignores extra query params", () => {
    expect(
      getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s")
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });
  it("returns null for non-YouTube URLs", () => {
    expect(getYouTubeEmbedUrl("https://vimeo.com/12345")).toBeNull();
  });
  it("returns null for malformed input", () => {
    expect(getYouTubeEmbedUrl("not a url")).toBeNull();
    expect(getYouTubeEmbedUrl("")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("is true for a YouTube watch URL", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });
  it("is false for a non-YouTube URL", () => {
    expect(isYouTubeUrl("https://example.com/clip.mp4")).toBe(false);
  });
});

describe("buildPublicVideoUrl", () => {
  it("builds the public storage URL for the exercise-videos bucket", () => {
    expect(buildPublicVideoUrl("https://abc.supabase.co", "172.mp4")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/exercise-videos/172.mp4"
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/video.test.ts`
Expected: FAIL — cannot resolve `./video` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/video.ts`:

```ts
// Pure helpers for resolving exercise video sources. No Supabase, no env access.

const EXERCISE_VIDEOS_BUCKET = "exercise-videos";

/**
 * Returns the YouTube embed URL for a watch/short/embed link, or null if the
 * URL is not a recognizable YouTube link (or is malformed).
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = parsed.pathname.slice(1).split("/")[0] || null;
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/shorts/")) {
      id = parsed.pathname.split("/")[2] || null;
    } else if (parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.split("/")[2] || null;
    }
  }

  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}

/** True when the URL is a recognizable YouTube link. */
export function isYouTubeUrl(url: string): boolean {
  return getYouTubeEmbedUrl(url) !== null;
}

/** Public URL for an uploaded video stored in the exercise-videos bucket. */
export function buildPublicVideoUrl(baseUrl: string, path: string): string {
  return `${baseUrl}/storage/v1/object/public/${EXERCISE_VIDEOS_BUCKET}/${path}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/video.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add lib/video.ts lib/video.test.ts
git commit -m "feat(exercise-video): pure YouTube embed + public URL helpers with tests"
```

---

## Task 3: Add `video_storage_path` to read queries

**Files:**
- Modify: `app/coach/exercises/page.tsx`
- Modify: `actions/exercises.ts` (the `getExercises` select)
- Modify: `actions/workout.ts` (the `getActiveProgram` and `getDayExercises` selects)

- [ ] **Step 1: Update the coach exercises page select**

In `app/coach/exercises/page.tsx`, change the exercises select:

```ts
// from:
      .select("id, name, muscle_group, equipment, difficulty, notes, video_url")
// to:
      .select("id, name, muscle_group, equipment, difficulty, notes, video_url, video_storage_path")
```

- [ ] **Step 2: Update the `getExercises` action select**

In `actions/exercises.ts`, change the select in `getExercises`:

```ts
// from:
    .select("id, name, muscle_group, equipment, difficulty, notes, video_url")
// to:
    .select("id, name, muscle_group, equipment, difficulty, notes, video_url, video_storage_path")
```

- [ ] **Step 3: Update the two workout selects**

In `actions/workout.ts`, in BOTH `getActiveProgram` and `getDayExercises`, change the nested exercises select:

```ts
// from:
        exercises ( id, name, notes, video_url )
// to:
        exercises ( id, name, notes, video_url, video_storage_path )
```

- [ ] **Step 4: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors). The selects return extra fields; no type breaks.

- [ ] **Step 5: Commit**

```bash
git add app/coach/exercises/page.tsx actions/exercises.ts actions/workout.ts
git commit -m "feat(exercise-video): fetch video_storage_path in coach + client queries"
```

---

## Task 4: Video upload, validation & cleanup in exercise actions

**Files:**
- Modify: `actions/exercises.ts`

- [ ] **Step 1: Add constants + helpers at the top of the file**

In `actions/exercises.ts`, directly below the existing imports (after the `requireCoach` import), add:

```ts
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

type VideoError = "videoTooLarge" | "invalidVideoType" | "videoUploadFailed";

// Uploads a validated video to the exercise-videos bucket. Returns the storage
// path on success, or an error code. Uses the service-role admin client.
async function uploadExerciseVideo(
  file: File
): Promise<{ path: string } | { error: VideoError }> {
  if (file.size > MAX_VIDEO_SIZE) return { error: "videoTooLarge" };
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return { error: "invalidVideoType" };

  const ext = EXT_BY_TYPE[file.type] ?? "mp4";
  const path = `${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("exercise-videos")
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("Exercise video upload error:", error);
    return { error: "videoUploadFailed" };
  }
  return { path };
}

// Best-effort removal of a stored video; logs but never throws.
async function removeExerciseVideo(path: string | null) {
  if (!path) return;
  const { error } = await supabaseAdmin.storage
    .from("exercise-videos")
    .remove([path]);
  if (error) console.error("Exercise video remove error:", error, path);
}

// Resolves the final (video_url, video_storage_path) pair from submitted form
// data. Handles upload, link, remove, and "no change" (preserve) cases, and
// cleans up any replaced/removed stored file. `currentPath`/`currentUrl` are
// the existing values (empty strings on create).
async function resolveVideoFields(
  formData: FormData,
  currentPath: string,
  currentUrl: string
): Promise<
  | { video_url: string | null; video_storage_path: string | null }
  | { error: VideoError }
> {
  const remove = formData.get("video_remove") === "1";
  const file = formData.get("video_file") as File | null;
  const urlInput = ((formData.get("video_url") as string) || "").trim() || null;

  if (remove) {
    await removeExerciseVideo(currentPath || null);
    return { video_url: null, video_storage_path: null };
  }

  if (file && file.size > 0) {
    const up = await uploadExerciseVideo(file);
    if ("error" in up) return up;
    if (currentPath && currentPath !== up.path) await removeExerciseVideo(currentPath);
    return { video_url: null, video_storage_path: up.path };
  }

  if (urlInput) {
    if (currentPath) await removeExerciseVideo(currentPath);
    return { video_url: urlInput, video_storage_path: null };
  }

  // Nothing submitted → preserve whatever already existed.
  if (currentPath) return { video_url: null, video_storage_path: currentPath };
  return { video_url: currentUrl || null, video_storage_path: null };
}
```

- [ ] **Step 2: Rewrite `createExercise` to resolve video fields**

Replace the body of `createExercise` (the part from reading `name` through the insert) with:

```ts
export async function createExercise(formData: FormData) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "nameRequired" as const };

  const video = await resolveVideoFields(formData, "", "");
  if ("error" in video) return { error: video.error };

  const { error } = await supabaseAdmin.from("exercises").insert({
    name,
    muscle_group: (formData.get("muscle_group") as string) || null,
    equipment: (formData.get("equipment") as string) || null,
    difficulty: (formData.get("difficulty") as string) || null,
    notes: (formData.get("notes") as string) || null,
    video_url: video.video_url,
    video_storage_path: video.video_storage_path,
    created_by: auth.user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "duplicateName" as const };
    console.error("Exercise create error:", error);
    return { error: "createFailed" as const };
  }

  return { success: true };
}
```

- [ ] **Step 3: Rewrite `updateExercise` to resolve video fields (with current values)**

Replace `updateExercise` with:

```ts
export async function updateExercise(id: string, formData: FormData) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "nameRequired" as const };

  const currentPath = (formData.get("current_video_storage_path") as string) || "";
  const currentUrl = (formData.get("current_video_url") as string) || "";
  const video = await resolveVideoFields(formData, currentPath, currentUrl);
  if ("error" in video) return { error: video.error };

  const { error } = await supabaseAdmin
    .from("exercises")
    .update({
      name,
      muscle_group: (formData.get("muscle_group") as string) || null,
      equipment: (formData.get("equipment") as string) || null,
      difficulty: (formData.get("difficulty") as string) || null,
      notes: (formData.get("notes") as string) || null,
      video_url: video.video_url,
      video_storage_path: video.video_storage_path,
    })
    .eq("id", id)
    .eq("created_by", auth.user.id);

  if (error) {
    if (error.code === "23505") return { error: "duplicateName" as const };
    console.error("Exercise update error:", error);
    return { error: "updateFailed" as const };
  }

  return { success: true };
}
```

- [ ] **Step 4: Update `deleteExercise` to remove the stored video**

Replace `deleteExercise` with:

```ts
export async function deleteExercise(id: string) {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  // Read the stored path first so we can clean up storage after the row is gone.
  const { data: existing } = await supabaseAdmin
    .from("exercises")
    .select("video_storage_path")
    .eq("id", id)
    .eq("created_by", auth.user.id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("exercises")
    .delete()
    .eq("id", id)
    .eq("created_by", auth.user.id);

  if (error) {
    if (error.code === "23503") {
      return { error: "exerciseInUse" as const };
    }
    console.error("Exercise delete error:", error);
    return { error: "deleteFailed" as const };
  }

  await removeExerciseVideo((existing?.video_storage_path as string) ?? null);

  return { success: true };
}
```

- [ ] **Step 5: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add actions/exercises.ts
git commit -m "feat(exercise-video): upload/validate/cleanup video in exercise actions"
```

---

## Task 5: i18n keys (coach + client)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/hr.json`

- [ ] **Step 1: Add coach video/description keys (en.json)**

In `messages/en.json`, find the line `      "videoUrlLabel": "Video URL",` (inside `coach.exercises`) and insert these lines immediately after it:

```json
      "videoLabel": "Video",
      "videoModeLink": "Link",
      "videoModeUpload": "Upload",
      "videoLinkPlaceholder": "https://youtube.com/…",
      "videoUploadHint": "Short clip, max 50 MB. For longer videos, use a YouTube link.",
      "videoCurrent": "Current video saved",
      "videoRemove": "Remove video",
      "descriptionLabel": "Description",
      "descriptionPlaceholder": "How to do it — cues, tips (shown to the client)",
```

- [ ] **Step 2: Add coach video error keys (en.json)**

In `messages/en.json`, the error keys are indented 8 spaces. Find this exact line (8-space indent, no trailing comma — it's the last key in the `errors` block):

```json
        "exerciseInUse": "Exercise is in a program — remove from program first."
```

Replace it with (add a trailing comma + three new keys, all at 8-space indent):

```json
        "exerciseInUse": "Exercise is in a program — remove from program first.",
        "videoTooLarge": "Video is too large (max 50 MB).",
        "invalidVideoType": "Unsupported format — use MP4, WebM, or MOV.",
        "videoUploadFailed": "Couldn't upload video."
```

- [ ] **Step 3: Add client demo keys (en.json)**

In `messages/en.json`, find `      "doneSet": "DONE",` (inside `app.workout`) and insert immediately after it:

```json
      "demo": "Demo",
      "description": "Description",
```

- [ ] **Step 4: Add the same keys in Croatian (hr.json)**

In `messages/hr.json`, after `      "videoUrlLabel": "Video URL",` insert:

```json
      "videoLabel": "Video",
      "videoModeLink": "Poveznica",
      "videoModeUpload": "Učitaj",
      "videoLinkPlaceholder": "https://youtube.com/…",
      "videoUploadHint": "Kratki isječak, maks. 50 MB. Za duže videe koristi YouTube poveznicu.",
      "videoCurrent": "Trenutni video spremljen",
      "videoRemove": "Ukloni video",
      "descriptionLabel": "Opis",
      "descriptionPlaceholder": "Kako izvesti — savjeti, upute (vidljivo klijentu)",
```

Find this exact line (8-space indent, last key in the `errors` block):

```json
        "exerciseInUse": "Vježba je u programu — najprije ukloni iz programa."
```

Replace it with (8-space indent throughout):

```json
        "exerciseInUse": "Vježba je u programu — najprije ukloni iz programa.",
        "videoTooLarge": "Video je prevelik (maks. 50 MB).",
        "invalidVideoType": "Nepodržan format — koristi MP4, WebM ili MOV.",
        "videoUploadFailed": "Greška pri učitavanju videa."
```

After `      "doneSet": "GOTOVO",` insert:

```json
      "demo": "Demo",
      "description": "Opis",
```

- [ ] **Step 5: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/hr.json','utf8')); console.log('OK')"`
Expected: prints `OK` (no parse error — confirms commas/braces are correct).

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/hr.json
git commit -m "i18n(exercise-video): coach video/description + client demo keys (en/hr)"
```

---

## Task 6: `<ExerciseDemo>` presentational component

**Files:**
- Create: `components/exercise-demo.tsx`

- [ ] **Step 1: Create the component**

Create `components/exercise-demo.tsx`:

```tsx
"use client";

import { getYouTubeEmbedUrl, buildPublicVideoUrl } from "@/lib/video";

type Props = {
  videoUrl: string | null;
  videoStoragePath: string | null;
  description: string | null;
  descriptionLabel: string;
};

// Renders the resolved exercise demo: an uploaded clip (HTML5 video) or an
// external link (YouTube iframe, otherwise a direct <video>), plus the
// client-facing description. Renders nothing when there is no media or text.
export function ExerciseDemo({
  videoUrl,
  videoStoragePath,
  description,
  descriptionLabel,
}: Props) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  let media: React.ReactNode = null;
  if (videoStoragePath) {
    media = (
      <video
        src={buildPublicVideoUrl(baseUrl, videoStoragePath)}
        controls
        playsInline
        preload="metadata"
        className="w-full rounded-lg border border-border bg-black"
      />
    );
  } else if (videoUrl) {
    const embed = getYouTubeEmbedUrl(videoUrl);
    media = embed ? (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          src={embed}
          title="Demo"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    ) : (
      <video
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        className="w-full rounded-lg border border-border bg-black"
      />
    );
  }

  if (!media && !description) return null;

  return (
    <div className="flex flex-col gap-3">
      {media}
      {description ? (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
            {descriptionLabel}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{description}</p>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/exercise-demo.tsx
git commit -m "feat(exercise-video): shared ExerciseDemo (YouTube embed / video + description)"
```

---

## Task 7: Coach form — Link/Upload toggle, file input, rename Notes→Description

**Files:**
- Modify: `app/coach/exercises/exercise-manager.tsx`

- [ ] **Step 1: Add imports + extend the `Exercise` type**

At the top of `app/coach/exercises/exercise-manager.tsx`, add the helper import after the existing `translate-error` import:

```ts
import { buildPublicVideoUrl } from "@/lib/video";
```

Extend the `Exercise` type (add the new field):

```ts
type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  difficulty: string | null;
  notes: string | null;
  video_url: string | null;
  video_storage_path: string | null;
};
```

- [ ] **Step 2: Add local video-mode state inside `ExerciseForm`**

Inside the `ExerciseForm` function component, as the first lines of its body (before `return`), add:

```tsx
    const hasUpload = !!exercise?.video_storage_path;
    const [videoMode, setVideoMode] = useState<"link" | "upload">(
      hasUpload ? "upload" : "link"
    );
    const [removeVideo, setRemoveVideo] = useState(false);
    const hasExistingVideo = !!(exercise?.video_url || exercise?.video_storage_path);
    const toggleBase =
      "inline-flex h-7 items-center rounded-md border px-2.5 font-mono text-[11px] uppercase tracking-[0.06em]";
    const toggleOn = `${toggleBase} border-ink bg-ink text-bg`;
    const toggleOff = `${toggleBase} border-hairline-2 bg-surface-2 text-ink-2 hover:text-ink`;
```

(`useState` is already imported at the top of the file.)

- [ ] **Step 3: Replace the video URL field block with the Link/Upload block**

Find this block (the `video_url` field):

```tsx
              <div className="sm:col-span-1 lg:col-span-3">
                <Label className="mb-1 text-xs">{t("videoUrlLabel")}</Label>
                <Input
                  name="video_url"
                  type="url"
                  defaultValue={exercise?.video_url ?? ""}
                  placeholder="https://..."
                />
              </div>
```

Replace it with:

```tsx
              <div className="sm:col-span-1 lg:col-span-3">
                <Label className="mb-1 text-xs">{t("videoLabel")}</Label>
                <div className="mb-2 flex gap-1.5">
                  <button
                    type="button"
                    className={videoMode === "link" ? toggleOn : toggleOff}
                    onClick={() => setVideoMode("link")}
                  >
                    {t("videoModeLink")}
                  </button>
                  <button
                    type="button"
                    className={videoMode === "upload" ? toggleOn : toggleOff}
                    onClick={() => setVideoMode("upload")}
                  >
                    {t("videoModeUpload")}
                  </button>
                </div>

                <input
                  type="hidden"
                  name="current_video_storage_path"
                  value={exercise?.video_storage_path ?? ""}
                />
                <input
                  type="hidden"
                  name="current_video_url"
                  value={exercise?.video_url ?? ""}
                />
                <input type="hidden" name="video_remove" value={removeVideo ? "1" : ""} />

                {videoMode === "link" ? (
                  <Input
                    name="video_url"
                    type="url"
                    defaultValue={exercise?.video_url ?? ""}
                    placeholder={t("videoLinkPlaceholder")}
                  />
                ) : (
                  <div className="space-y-1">
                    <Input
                      name="video_file"
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                    />
                    <p className="text-[11px] text-ink-3">{t("videoUploadHint")}</p>
                    {hasUpload && !removeVideo ? (
                      <p className="text-[11px] text-ink-2">{t("videoCurrent")} ✓</p>
                    ) : null}
                  </div>
                )}

                {hasExistingVideo ? (
                  <button
                    type="button"
                    onClick={() => setRemoveVideo((v) => !v)}
                    className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 underline hover:text-danger"
                  >
                    {removeVideo ? tCommon("cancel") : t("videoRemove")}
                  </button>
                ) : null}
              </div>
```

- [ ] **Step 4: Rename the Notes field to Description**

Find:

```tsx
            <div>
              <Label className="mb-1 text-xs">{t("notesLabel")}</Label>
              <Textarea
                name="notes"
                rows={2}
                defaultValue={exercise?.notes ?? ""}
                placeholder={t("notesPlaceholder")}
              />
            </div>
```

Replace the two translation keys (keep `name="notes"`):

```tsx
            <div>
              <Label className="mb-1 text-xs">{t("descriptionLabel")}</Label>
              <Textarea
                name="notes"
                rows={3}
                defaultValue={exercise?.notes ?? ""}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
```

- [ ] **Step 5: Make the card "Demo" link work for uploaded videos**

Find the card demo link:

```tsx
                  {ex.video_url && (
                    <a
                      href={ex.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 rounded-[3px] border border-hairline-2 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 transition-colors hover:text-lime"
                    >
                      <Play size={10} />
                      {t("demo")}
                    </a>
                  )}
```

Replace with (compute an href that also covers uploads):

```tsx
                  {(() => {
                    const demoHref =
                      ex.video_url ||
                      (ex.video_storage_path
                        ? buildPublicVideoUrl(
                            process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
                            ex.video_storage_path
                          )
                        : null);
                    return demoHref ? (
                      <a
                        href={demoHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 rounded-[3px] border border-hairline-2 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 transition-colors hover:text-lime"
                      >
                        <Play size={10} />
                        {t("demo")}
                      </a>
                    ) : null;
                  })()}
```

- [ ] **Step 6: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/coach/exercises/exercise-manager.tsx
git commit -m "feat(exercise-video): coach form Link/Upload toggle + Description label"
```

---

## Task 8: Client workout view — expandable Demo

**Files:**
- Modify: `app/app/workout/page.tsx`

- [ ] **Step 1: Add imports + extend the `Exercise` type**

In `app/app/workout/page.tsx`, add the import after the existing component imports:

```ts
import { ExerciseDemo } from "@/components/exercise-demo";
```

Add `Play` to the existing lucide import:

```ts
import { ChevronDown, ChevronUp, Loader2, Play } from "lucide-react";
```

Extend the client `Exercise` type:

```ts
type Exercise = {
  id: string;
  name: string;
  notes: string | null;
  video_url: string | null;
  video_storage_path: string | null;
};
```

- [ ] **Step 2: Add per-exercise expand state**

In the `WorkoutPage` component, after the existing `expandedDay` state declaration, add:

```ts
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
```

- [ ] **Step 3: Replace the exercise `<li>` with an expandable row**

Find the exercises list map (the `day.program_exercises.map(...)` returning a `<li>`), and replace the whole `<li>` return with:

```tsx
                    {day.program_exercises.map((pe, i) => {
                      const ex = pe.exercises;
                      const hasDemo = !!(
                        ex.video_url ||
                        ex.video_storage_path ||
                        ex.notes
                      );
                      const isExExpanded = expandedExercise === pe.id;
                      return (
                        <li
                          key={pe.id}
                          className="overflow-hidden rounded-lg border border-border bg-surface-1"
                        >
                          <div
                            className={`grid grid-cols-[24px_1fr_auto] items-center gap-3 px-3 py-2.5 ${
                              hasDemo ? "cursor-pointer active:bg-surface-2/50" : ""
                            }`}
                            onClick={
                              hasDemo
                                ? () =>
                                    setExpandedExercise(
                                      isExExpanded ? null : pe.id
                                    )
                                : undefined
                            }
                          >
                            <span className="font-mono text-[11px] text-ink-3 tabular-nums">
                              {(i + 1).toString().padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink truncate">
                                {ex.name}
                              </div>
                              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                                {pe.sets} × {pe.reps}
                                {pe.rpe ? ` · RPE ${pe.rpe}` : ""}
                                {pe.rest_sec
                                  ? ` · ${t("restSecondsShort", {
                                      sec: pe.rest_sec,
                                    })}`
                                  : ""}
                              </div>
                            </div>
                            {hasDemo ? (
                              <span className="flex items-center gap-1 text-ink-3">
                                <Play size={12} className="text-lime" />
                                {isExExpanded ? (
                                  <ChevronUp size={14} />
                                ) : (
                                  <ChevronDown size={14} />
                                )}
                              </span>
                            ) : (
                              <span className="text-ink-3">›</span>
                            )}
                          </div>
                          {hasDemo && isExExpanded ? (
                            <div className="border-t border-border px-3 py-3">
                              <ExerciseDemo
                                videoUrl={ex.video_url}
                                videoStoragePath={ex.video_storage_path}
                                description={ex.notes}
                                descriptionLabel={t("description")}
                              />
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
```

- [ ] **Step 4: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/app/workout/page.tsx
git commit -m "feat(exercise-video): client workout view shows demo video + description"
```

---

## Task 9: Full verification (suite + lint + preview deploy)

**Files:** none (verification only)

- [ ] **Step 1: Run the unit test suite**

Run: `npm test`
Expected: PASS, including `lib/video.test.ts`.

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors in the changed files.

- [ ] **Step 4: Deploy a Vercel preview**

This project deploys via Vercel (local `next build` can't complete in the sandbox). Push the branch and open a preview, or use the Vercel MCP/CLI. Confirm the build succeeds on Vercel.

- [ ] **Step 5: Manual runtime check on the preview**

As coach (English UI, `/coach/exercises`):
1. Edit an exercise → **Link** tab → paste a YouTube watch URL → save. The card shows a **Demo** link.
2. Edit another exercise → **Upload** tab → choose a short `.mp4` (< 50 MB) → save. Card shows Demo.
3. Try uploading a > 50 MB file → expect the friendly "Video is too large (max 50 MB)." toast.
4. Add a **Description** to both → save.

As a client (Croatian UI, `/app/workout`) with those exercises in the active program:
5. Open a day, tap an exercise with a YouTube link → the embed plays; description shows under it.
6. Tap the exercise with the uploaded clip → the video player plays; description shows.
7. An exercise with neither video nor description shows no expand affordance (plain `›`).

- [ ] **Step 6: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore(exercise-video): verification fixes"
```

---

## Notes / out of scope (YAGNI)

- No per-client/per-program video override (video lives on the library exercise).
- No transcoding, thumbnails, or compression; no resumable uploads or progress bar (a spinner via the existing `saving` state is enough).
- Non-YouTube links fall back to a direct `<video>` (no Vimeo-specific embedding).
- The workout **log/session** screen (`app/app/workout/log`) is not changed; `getDayExercises` now returns `video_storage_path` but rendering there is a future enhancement.
