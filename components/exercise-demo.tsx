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
