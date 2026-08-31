import { defineConfig, devices } from "@playwright/test";

/**
 * The suites drive a real browser against a production build, because that is
 * the only way to verify what this project actually promises: that the Enquire
 * links resolve, the filters change the grid, and the admin round-trips reach
 * the public site.
 *
 * Workers are pinned to 1 and parallelism is off: both suites share one SQLite
 * database and each reseeds it, so they must not overlap.
 */
const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Sandboxes without a Playwright-managed browser can point at their own
    // Chromium build instead of downloading one.
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
