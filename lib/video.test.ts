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
