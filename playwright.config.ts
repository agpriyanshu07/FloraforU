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
const STUB_PORT = Number(process.env.STUB_PORT ?? 3999);

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

  webServer: [
    // Stands in for the Claude API and Cloudinary (tests/stubs/server.mjs), so
    // "Add products from a PDF" is tested end to end with no key, no cost and
    // nothing written to the shop's photo account.
    {
      command: `node tests/stubs/server.mjs`,
      url: `http://127.0.0.1:${STUB_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: "ignore",
      stderr: "pipe",
      env: { STUB_PORT: String(STUB_PORT) },
    },
    {
      command: "npm run start",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${STUB_PORT}`,
        ANTHROPIC_API_KEY: "stub-key",
        CLOUDINARY_UPLOAD_BASE: `http://127.0.0.1:${STUB_PORT}`,
        CLOUDINARY_CLOUD_NAME: "stub",
        CLOUDINARY_API_KEY: "stub",
        CLOUDINARY_API_SECRET: "stub-cloudinary-secret",
      },
    },
  ],
});
