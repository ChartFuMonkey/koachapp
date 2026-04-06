"use server";

import { createClient } from "@/lib/supabase/server";

export async function getPhotos() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Nisi prijavljen/a." };

  const { data: photos, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("client_id", user.id)
    .order("photo_date", { ascending: false });

  if (error) {
    console.error("Photos fetch error:", error);
    return { error: "Greska pri dohvacanju fotografija." };
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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
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
    return { error: "Greska pri uploadu fotografije." };
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
    return { error: "Greska pri spremanju fotografije." };
  }

  // Generate signed URL for the new photo
  const { data: urlData } = await supabase.storage
    .from("progress-photos")
    .createSignedUrl(storagePath, 3600);

  return { data: { ...row, signedUrl: urlData?.signedUrl || null } };
}
