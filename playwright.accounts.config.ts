import { defineConfig, devices } from "@playwright/test";

import { PHONE_SPEC, PHONES } from "./e2e/phones";

// Signed-in browser tests against a local Supabase. Run them with `npm run test:e2e:accounts`,
// which sets the project's URL and keys and builds the app first.
const PORT = 4174;

export default defineConfig({
  testDir: "./e2e/accounts",
  globalSetup: "./e2e/accounts/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}/`, trace: "retain-on-failure" },
  projects: [
    {
      name: "accounts",
      testIgnore: PHONE_SPEC,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    ...PHONES,
  ],
  webServer: {
    command: "node scripts/start.mjs",
    env: { PORT: String(PORT), LEGACY_HOSTS: "qr.techitdave.com" },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
  },
});
