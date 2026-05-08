"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayCET } from "@/lib/date";

const ALLOWED_ANGLES = ["front", "side", "back"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function getPhotos() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "unauthenticated" };

  const { data: photos, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("client_id", user.id)
    .order("photo_date", { ascending: false });

  if (error) {
    console.error("Photos fetch error:", error);
    return { error: "loadFailed" };
  }

  // Generate signed URLs for all photos
  const photosWithUrls = await Promise.all(
    (photos || []).map(async (photo) => {
      const { data, error: urlError } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(photo.storage_path, 3600);
      if (urlError) {
        console.error("Signed URL error:", urlError, photo.storage_path);
      }
      return { ...photo, signedUrl: data?.signedUrl || null };
    })
  );

  return { data: photosWithUrls };
}

export async function uploadPhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "unauthenticated" };

  const file = formData.get("file") as File | null;
  const angle = formData.get("angle") as string;

  if (!file) return { error: "noFile" };

  // Validate angle
  if (!ALLOWED_ANGLES.includes(angle as typeof ALLOWED_ANGLES[number])) {
    return { error: "invalidAngle" };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: "fileTooLarge" };
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "invalidFileType" };
  }

  const timestamp = Date.now();
  const storagePath = `${user.id}/${timestamp}_${angle}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("progress-photos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { error: "uploadFailed" };
  }

  const today = todayCET();

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
    return { error: "insertFailed" };
  }

  // Generate signed URL for the new photo
  const { data: urlData, error: urlError } = await supabase.storage
    .from("progress-photos")
    .createSignedUrl(storagePath, 3600);

  if (urlError) {
    console.error("Signed URL error:", urlError, storagePath);
  }

  revalidatePath("/coach");
  revalidatePath(`/coach/clients/${user.id}`);

  return { data: { ...row, signedUrl: urlData?.signedUrl || null } };
}
