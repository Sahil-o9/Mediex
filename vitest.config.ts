import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Separate from vite.config.ts on purpose: that file loads the TanStack Start
// plugin stack, which is not needed (and not wanted) for unit tests.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
