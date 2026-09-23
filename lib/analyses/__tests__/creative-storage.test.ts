import { describe, expect, it } from "vitest";
import {
  collectAnalysisCreativePaths,
  collectDeconstructionCreativePaths,
  storagePathFromCreativeUrl,
} from "@/lib/analyses/creative-storage";

describe("creative-storage helpers", () => {
  it("extracts storage path from public/signed URLs", () => {
    expect(
      storagePathFromCreativeUrl(
        "https://xyz.supabase.co/storage/v1/object/public/analysis-creatives/user1/thumb.jpg"
      )
    ).toBe("user1/thumb.jpg");
  });

  it("collects creative paths but excludes thumbnails by default", () => {
    const paths = collectAnalysisCreativePaths({
      creative_storage_path: "u/video.mp4",
      thumbnail_url:
        "https://xyz.supabase.co/storage/v1/object/public/analysis-creatives/u/thumb.jpg",
      creative_type: "video",
      variants: null,
    });
    expect(paths).toEqual(["u/video.mp4"]);
  });

  it("includes thumbnails when requested", () => {
    const paths = collectAnalysisCreativePaths(
      {
        creative_storage_path: "u/video.mp4",
        thumbnail_url:
          "https://xyz.supabase.co/storage/v1/object/public/analysis-creatives/u/thumb.jpg",
        creative_type: "video",
        variants: [
          {
            id: "1",
            label: "A",
            creative_type: "video",
            creative_storage_path: "u/v2.mp4",
            thumbnail_url:
              "https://xyz.supabase.co/storage/v1/object/public/analysis-creatives/u/t2.jpg",
          },
        ],
      },
      { includeThumbnails: true }
    );
    expect(paths.sort()).toEqual(
      ["u/thumb.jpg", "u/t2.jpg", "u/v2.mp4", "u/video.mp4"].sort()
    );
  });

  it("collects deconstruction creative paths", () => {
    expect(
      collectDeconstructionCreativePaths({
        landingPageUrl: "https://example.com",
        creativeType: "image",
        creativeStoragePath: "u/ad.png",
      })
    ).toEqual(["u/ad.png"]);
  });
});
