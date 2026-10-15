import { defineConfig, devices } from "@playwright/test";

import { PHONE_SPEC, PHONES } from "./e2e/phones";

const PORT = 4173;
// A project's own testIgnore replaces the config's, so these projects repeat "accounts/**".
const IGNORED = ["accounts/**", PHONE_SPEC];

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["accounts/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: IGNORED,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet",
      testIgnore: IGNORED,
      use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    { name: "mobile", testIgnore: IGNORED, use: { ...devices["Pixel 7"] } },
    ...PHONES,
  ],
  webServer: {
    command: "node scripts/start.mjs",
    env: { PORT: String(PORT), LEGACY_HOSTS: "qr.techitdave.com" },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
  },
});
