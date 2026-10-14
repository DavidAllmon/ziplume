// Runs the signed-in browser tests against the local Supabase (start it with `npm run db:start`;
// Docker required). Builds the app with that project's URL and keys, then runs Playwright with
// playwright.accounts.config.ts. Pass --no-build to reuse the last build; other arguments go to
// Playwright.
import { execFileSync, spawnSync } from "node:child_process";

const status = JSON.parse(
  execFileSync("npx", ["--yes", "supabase@2.120.0", "status", "-o", "json"], { encoding: "utf8" }),
);
for (const key of ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]) {
  if (!status[key]) {
    console.error(`supabase status has no ${key}. Keys: ${Object.keys(status).join(", ")}`);
    process.exit(1);
  }
}

const env = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: "http://localhost:4174",
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  SCAN_HASH_SECRET: "accounts-e2e-only-scan-hash-secret-0123456789",
};

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const args = process.argv.slice(2);
if (!args.includes("--no-build")) run("npm", ["run", "build"]);
run("npx", [
  "playwright",
  "test",
  "--config",
  "playwright.accounts.config.ts",
  ...args.filter((arg) => arg !== "--no-build"),
]);
