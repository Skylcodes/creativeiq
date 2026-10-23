import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { afterEach, describe, expect, it } from "vitest";
import { formatGeminiVisualContextForGrading } from "@/lib/ai/gemini-vertex-video";
import { buildVideoBrief } from "@/lib/ai/video";
import {
  probeVideoDurationSec,
  reportedVideoDurationSec,
} from "@/lib/ai/video-probe";
import type { VideoAnalysisResult } from "@/lib/ai/video-analysis-types";
import type { VideoCreativeContext } from "@/lib/ai/video";

const tmpFiles: string[] = [];

afterEach(() => {
  for (const file of tmpFiles.splice(0)) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
});

function makeTestMp4(durationSec: number): string {
  const outPath = path.join(
    os.tmpdir(),
    `iq_probe_fixture_${Date.now()}_${durationSec}s.mp4`
  );
  tmpFiles.push(outPath);
  const result = spawnSync(
    ffmpegInstaller.path,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=black:s=160x120:d=${durationSec}`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-t",
      String(durationSec),
      outPath,
    ],
    { encoding: "utf8" }
  );
  if (result.status !== 0 || !fs.existsSync(outPath)) {
    throw new Error(
      `Failed to generate test mp4: ${result.stderr || result.stdout || result.error}`
    );
  }
  return outPath;
}

function baseAnalysis(): VideoAnalysisResult {
  return {
    visualDescription: "a black test card",
    primaryMessaging: "buy now",
    backgroundAudioNote: "",
    onScreenText: "",
    coldScrollStopScore: 5,
    watchThroughScore: 5,
  };
}

describe("reportedVideoDurationSec", () => {
  it("omits duration on probe failure instead of inventing 90", () => {
    expect(reportedVideoDurationSec(null)).toBeUndefined();
    expect(reportedVideoDurationSec(undefined)).toBeUndefined();
    expect(reportedVideoDurationSec(0)).toBeUndefined();
    expect(reportedVideoDurationSec(-1)).toBeUndefined();
    expect(reportedVideoDurationSec(90)).toBe(90);
    expect(reportedVideoDurationSec(43.441678)).toBe(43.441678);
  });
});

describe("probeVideoDurationSec", () => {
  it("returns the real duration of a ~3s fixture mp4", async () => {
    const fixture = makeTestMp4(3);
    const duration = await probeVideoDurationSec(fixture);
    expect(duration).toBeTypeOf("number");
    expect(duration!).toBeGreaterThan(2.5);
    expect(duration!).toBeLessThan(3.5);
  });

  it("returns null (not 90) when ffprobe cannot read the file", async () => {
    const missing = path.join(os.tmpdir(), `iq_missing_${Date.now()}.mp4`);
    const duration = await probeVideoDurationSec(missing);
    expect(duration).toBeNull();
    expect(reportedVideoDurationSec(duration)).toBeUndefined();
  });
});

describe("formatGeminiVisualContextForGrading duration", () => {
  it("omits the coverage line when duration is unknown — never says ~90s", () => {
    const text = formatGeminiVisualContextForGrading(baseAnalysis(), {});
    expect(text).not.toMatch(/~90s/);
    expect(text).not.toMatch(/Coverage: COMPLETE video/);
  });

  it("uses the probed duration when present and keeps the coverage template", () => {
    const text = formatGeminiVisualContextForGrading(baseAnalysis(), {
      videoDurationSec: 43.441678,
      analyzedDurationSec: 43.441678,
    });
    expect(text).toContain("Coverage: COMPLETE video, ~43s, no trimming");
    expect(text).not.toMatch(/~90s/);
  });
});

describe("buildVideoBrief duration interpolation", () => {
  const baseCtx: VideoCreativeContext = {
    transcript: "",
    primaryMessaging: "buy now",
    backgroundAudioNote: "",
    onScreenText: "",
    messagingSource: "gemini_vertex",
    transcriptAvailable: false,
    visualDescription: "a black test card",
    frameCount: 0,
    visualAnalysisMode: "gemini_vertex",
    processingNotes: [],
  };

  it("keeps the duration template when probe succeeded", () => {
    const { text } = buildVideoBrief({
      ...baseCtx,
      videoDurationSec: 43.44,
      analyzedDurationSec: 43.44,
    });
    expect(text).toContain(
      "COMPLETE VIDEO (all ~43s, no trimming) analyzed natively via Gemini Vertex"
    );
    expect(text).not.toMatch(/~90s/);
  });

  it("omits invented duration when probe failed", () => {
    const { text } = buildVideoBrief(baseCtx);
    expect(text).toContain(
      "COMPLETE VIDEO (no trimming) analyzed natively via Gemini Vertex"
    );
    expect(text).not.toMatch(/~90s/);
    expect(text).not.toMatch(/all ~0s/);
  });
});
