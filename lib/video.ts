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
