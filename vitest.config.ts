import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["lib/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // `server-only` throws when imported outside the Next.js server runtime;
      // stub it out so unit tests can import pipeline modules directly.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
});
