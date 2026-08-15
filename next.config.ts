import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "fluent-ffmpeg",
    "@ffmpeg-installer/ffmpeg",
    "@google/genai",
  ],
  // Keep Turbopack scoped to this app (avoids scanning sibling folders in the repo).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
