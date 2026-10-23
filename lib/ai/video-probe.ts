import "server-only";

export type FfmpegCommandCtor = typeof import("fluent-ffmpeg");

/**
 * Load fluent-ffmpeg with the platform binaries from npm installers.
 * Vercel images do not ship ffprobe on PATH (Node 24 / Oct 3 project).
 */
export async function getFfmpegCommand(): Promise<FfmpegCommandCtor> {
  const [
    { default: FfmpegCommand },
    { default: ffmpegInstaller },
    ffprobeInstaller,
  ] = await Promise.all([
    import("fluent-ffmpeg"),
    import("@ffmpeg-installer/ffmpeg"),
    import("@ffprobe-installer/ffprobe"),
  ]);

  const ffprobePath =
    (ffprobeInstaller as { path?: string }).path ??
    (ffprobeInstaller as { default?: { path: string } }).default?.path;

  FfmpegCommand.setFfmpegPath(ffmpegInstaller.path);
  if (ffprobePath) {
    FfmpegCommand.setFfprobePath(ffprobePath);
  } else {
    console.error("[video] @ffprobe-installer/ffprobe did not expose a path");
  }

  return FfmpegCommand;
}

/** Only a real ffprobe value is reported. Never invent 90s (or any fallback). */
export function reportedVideoDurationSec(
  probed: number | null | undefined
): number | undefined {
  return probed && probed > 0 ? probed : undefined;
}

export async function probeVideoDurationSec(inPath: string): Promise<number | null> {
  try {
    const FfmpegCommand = await getFfmpegCommand();
    const duration = await new Promise<number | null>((resolve, reject) => {
      FfmpegCommand.ffprobe(inPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration ?? null);
      });
    });
    const reported = reportedVideoDurationSec(duration);
    if (reported != null) {
      console.log(`[video] probed duration=${reported}s`);
      return reported;
    }
    console.error("[video] ffprobe returned no duration; omitting from grader context");
    return null;
  } catch (err) {
    console.error(
      "[video] ffprobe failed; omitting duration from grader context:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
