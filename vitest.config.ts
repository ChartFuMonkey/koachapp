import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // Node 26 + the default worker-thread pool can stall; forks is stable.
    pool: "forks",
  },
});
