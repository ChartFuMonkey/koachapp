# Exercise Video + Description — Design Spec

**Date:** 2026-05-30
**Branch:** feature/optimization (current)
**Status:** Approved design, pending implementation plan

## Goal

Let the coach attach, to each exercise in the library:

1. A **video** — either an uploaded video file **or** an external link (e.g. YouTube), and
2. A **description** — instructions/cues shown to the client.

And — critically — **render both for the client** in the workout view. Today the client app fetches `notes` and `video_url` but displays neither, so the existing fields are invisible to clients.

## Background: current state

- `exercises` table (library) columns in use: `id, name, muscle_group, equipment, difficulty, notes, video_url, created_by, created_at`. A plain-text `video_url` and a `notes` field already exist.
- Coach creates/edits exercises in `app/coach/exercises/exercise-manager.tsx` via Server Actions `createExercise` / `updateExercise` / `deleteExercise` in `actions/exercises.ts`. These use the **service-role admin client** (`@/lib/supabase/admin`) gated by `requireCoach()`. Fields are read from `FormData` whose keys map 1:1 to DB columns.
- The coach form already has a `video_url` URL input and a `notes` textarea.
- Client views the program in `app/app/workout/page.tsx` (`"use client"`, Croatian UI). It fetches via `getActiveProgram()` (`actions/workout.ts`) and renders each exercise as a row showing only name + sets/reps/RPE/rest. `notes` / `video_url` are fetched but not rendered; `video_storage_path` does not exist yet.
- File-upload precedent: `actions/photos.ts#uploadPhoto` — validates size/type, uploads to a Supabase Storage bucket (`progress-photos`), stores the `storage_path` in a table. Public read URLs are built as `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/<bucket>/<path>` (see `app/coach/clients/[id]/client-detail.tsx:990`).
- i18n: `next-intl`, namespaced JSON in `messages/en.json` (coach UI = English) and `messages/hr.json` (client UI = Croatian). Coach exercise strings under `coach.exercises(.errors)`; client workout strings under `app.workout(.errors)`.
- Tests: `vitest`, colocated `*.test.ts` (e.g. `lib/reports/week.test.ts`).
- **Next.js 16** with documented breaking changes — `node_modules/next/dist/docs/` must be consulted before writing code.

## Decisions (from brainstorming)

- **Single description, client-facing.** Reuse the existing `notes` column as the one description shown to clients; rename the UI label "Notes" → "Description". No separate private coach-notes field.
- **Both video sources.** Coach picks per exercise: paste a link **or** upload a file. Not both at once.
- **Library-level.** Video + description live on the library exercise, shared by every client whose program includes that exercise. Per-client custom video is out of scope.
- **Public bucket.** Exercise demos are non-sensitive; serve via public URLs (simple, cacheable, supports seeking). Uploads happen server-side via service role; clients never write.
- **50 MB upload cap** (free-tier ceiling); recommend short clips and YouTube for longer videos.

## Data model

New migration `supabase/migrations/20260530_exercise_video_media.sql` (also applied to remote via Supabase MCP `apply_migration`, since there is no local stack — see env memory):

```sql
-- 1. New column for uploaded-video storage path (links keep using video_url)
alter table exercises add column if not exists video_storage_path text;

-- 2. Public storage bucket for uploaded exercise demos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-videos', 'exercise-videos', true, 52428800,
        array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
```

No custom storage RLS policies needed: writes are service-role (bypass RLS), reads are public.

**Video resolution rule (client + coach):** if `video_storage_path` is set → play the uploaded file from the public bucket; else if `video_url` is set → embed it (YouTube → iframe, otherwise `<video>`); else → no demo.

## Storage & upload (actions/exercises.ts)

Add constants: `MAX_VIDEO_SIZE = 50 * 1024 * 1024`, `ALLOWED_VIDEO_TYPES = ["video/mp4","video/webm","video/quicktime"]`.

The form sends one of: `video_file` (File) when "Upload" is chosen, or `video_url` (string) when "Link" is chosen, plus a `video_mode` discriminator and (on edit) the existing `current_video_storage_path`.

- **createExercise**: resolve video first. If `video_file` present and non-empty → validate type/size, upload to `exercise-videos` at path `${Date.now()}_${slug(name)}.${ext}` (timestamp-based, needs no row id), then insert the row with `video_storage_path` set (and `video_url = null`). Else insert with `video_url` from form, `video_storage_path = null`. (Single insert either way.)
- **updateExercise**: same resolution. If a new file replaces an old upload, or the coach switches upload→link, **delete the previously stored file** from the bucket. Read the existing `video_storage_path` first to know what to remove.
- **deleteExercise**: before/after deleting the row, if it had a `video_storage_path`, remove that object from the bucket.

New error codes returned to the client: `videoTooLarge`, `invalidVideoType`, `videoUploadFailed`.

`getExercises` select gains `video_storage_path` so the coach UI can show current state.

## Video helper (lib/video.ts) + tests

Pure, unit-tested module (no Supabase, no env):

- `isYouTubeUrl(url: string): boolean`
- `getYouTubeEmbedUrl(url: string): string | null` — handles `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`; returns `https://www.youtube.com/embed/<id>` or null.
- `buildPublicVideoUrl(baseUrl: string, path: string): string` — `${baseUrl}/storage/v1/object/public/exercise-videos/${path}`.

`lib/video.test.ts` covers the YouTube URL variants (and non-YouTube / malformed inputs).

A small shared presentational component `components/exercise-demo.tsx` renders the resolved video: YouTube → responsive `<iframe>`; uploaded/direct → `<video controls playsInline preload="metadata">`. Used by the client view (and optionally the coach preview).

## Coach UI (app/coach/exercises/exercise-manager.tsx)

- Extend the `Exercise` type with `video_storage_path: string | null`.
- Replace the single "Video URL" input with a **Video** block: a two-option toggle (Link / Upload).
  - Link → existing URL input (`name="video_url"`).
  - Upload → file input (`name="video_file"`, `accept="video/*"`), with a hint line: "Short clips, max 50 MB. For longer videos, use a YouTube link."
  - Hidden `name="video_mode"` reflects the chosen tab; on edit, hidden `current_video_storage_path` carries the existing path.
  - When editing an exercise that already has an uploaded video, show "current video" with a small player/preview and the option to replace it.
- Rename the "Notes" label/placeholder to "Description" (new i18n keys `descriptionLabel` / `descriptionPlaceholder`; form field stays `name="notes"`).
- Card "Demo" link: show when `video_url` **or** `video_storage_path` is present (build public URL for the latter).

## Client UI (app/app/workout/page.tsx)

- Add `video_storage_path: string | null` to the `Exercise` type, and add it to the `getActiveProgram` exercise select in `actions/workout.ts` (alongside `notes, video_url`).
- Make each exercise row expandable (the existing `›` becomes a real toggle). Expanding reveals a **Demo** section:
  - `<ExerciseDemo>` with the resolved video (YouTube embed or `<video>`), and
  - the **description** (`notes`) text below it.
- If an exercise has neither video nor description, the row is not expandable (hide the toggle).
- Public URL built with `process.env.NEXT_PUBLIC_SUPABASE_URL`.

## i18n

- `messages/en.json` › `coach.exercises`: add `descriptionLabel`, `descriptionPlaceholder`, `videoLabel`, `videoLink`, `videoUpload`, `videoUploadHint`, `videoCurrent`, `videoReplace`; under `coach.exercises.errors`: `videoTooLarge`, `invalidVideoType`, `videoUploadFailed`.
- `messages/hr.json` › `app.workout`: add `demo`, `description` (and any toggle/empty labels) in Croatian.
- Keep both locale files structurally in sync.

## Out of scope (YAGNI)

- Per-client / per-program custom video overrides.
- Server-side transcoding, thumbnail generation, or video compression.
- Drag-and-drop / resumable uploads, progress bars beyond a simple spinner.
- Vimeo-specific embedding (non-YouTube links fall back to `<video>`; a plain link still works).

## Testing & verification

- **Unit:** `lib/video.test.ts` (YouTube parsing + URL building) via `vitest`.
- **Type/build:** `tsc` / `next build` must pass. Read `node_modules/next/dist/docs/` before touching Next.js-specific code.
- **Runtime:** local `next dev` cannot bind in this sandbox (see env memory). Verify behavior via the Vercel preview deploy: coach uploads a clip + a YouTube link to two exercises; client opens the workout, expands both, confirms playback + description. Confirm the 50 MB cap shows a friendly error.

## Risk / constraints

- **Free-tier storage/egress** (~1 GB storage, ~2 GB egress/month): uploaded videos consume both. Mitigated by the 50 MB cap and steering longer videos to YouTube.
- **Service-role uploads** bypass RLS by design; all write paths remain behind `requireCoach()`.
- **Next.js 16** breaking changes: consult bundled docs before writing route/server-action/file-convention code.

## Files touched (summary)

- `supabase/migrations/20260530_exercise_video_media.sql` (new)
- `actions/exercises.ts` (upload/validate/cleanup; select `video_storage_path`)
- `actions/workout.ts` (select `video_storage_path`)
- `lib/video.ts` + `lib/video.test.ts` (new)
- `components/exercise-demo.tsx` (new)
- `app/coach/exercises/exercise-manager.tsx` (video toggle + upload, rename Notes→Description)
- `app/app/workout/page.tsx` (expandable demo + description)
- `messages/en.json`, `messages/hr.json` (new keys)
