import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { probeVideoDurationSec } from "@/lib/ai/video-probe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Preview-only diagnostic. Removed after we confirm ffprobe works on Vercel.
 * Never available when VERCEL_ENV=production.
 */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
  const ffprobeInstaller = await import("@ffprobe-installer/ffprobe");
  const ffmpegPath = ffmpegInstaller.default.path;
  const ffprobePath =
    (ffprobeInstaller as { path?: string }).path ??
    (ffprobeInstaller as { default?: { path: string } }).default?.path;

  const outPath = path.join(os.tmpdir(), `iq_ffprobe_check_${Date.now()}.mp4`);
  try {
    const generated = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=160x120:d=1",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-t",
        "1",
        outPath,
      ],
      { encoding: "utf8" }
    );
    if (generated.status !== 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "ffmpeg failed to generate probe fixture",
          stderr: (generated.stderr || "").slice(0, 500),
        },
        { status: 500 }
      );
    }

    const durationSec = await probeVideoDurationSec(outPath);
    return NextResponse.json({
      ok: durationSec != null && durationSec > 0 && durationSec < 2,
      durationSec,
      ffmpegPathExists: fs.existsSync(ffmpegPath),
      ffprobePathExists: Boolean(ffprobePath && fs.existsSync(ffprobePath)),
    });
  } finally {
    try {
      fs.unlinkSync(outPath);
    } catch {
      /* ignore */
    }
  }
}
