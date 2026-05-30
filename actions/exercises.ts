"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireCoach } from "@/lib/auth/require-coach";

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

export async function getExercises() {
  const auth = await requireCoach();
  if (auth.error) return { error: auth.error };

  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("id, name, muscle_group, equipment, difficulty, notes, video_url, video_storage_path")
    .order("name", { ascending: true });

  if (error) {
    console.error("Exercises fetch error:", error);
    return { error: "loadFailed" as const };
  }

  return { data: data ?? [] };
}

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
