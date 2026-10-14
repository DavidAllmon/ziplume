import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

import { AUTH_DIR, OWNER, SEED_FILE, VIEWER, type Seed } from "./fixtures";

type Person = typeof OWNER;

/** Fresh owner and viewer accounts, two codes, and a signed-in browser state for each. */
export default async function globalSetup(config: FullConfig) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Run these tests with `npm run test:e2e:accounts` so the local keys are set.");
  }
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const person of [OWNER, VIEWER]) {
    const old = existing?.users.find((user) => user.email === person.email);
    if (old) await admin.auth.admin.deleteUser(old.id);
  }

  async function create(person: Person) {
    const { data, error } = await admin.auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { full_name: person.name },
    });
    if (error || !data.user) throw error ?? new Error(`Couldn't create ${person.email}`);
    return data.user.id;
  }
  const ownerId = await create(OWNER);
  const viewerId = await create(VIEWER);

  const { data: codes, error: codesError } = await admin
    .from("qr_codes")
    .insert(
      [
        {
          user_id: ownerId,
          name: "Spring menu",
          qr_type: "url",
          is_dynamic: true,
          slug: "SPRING1",
          destination: "https://example.com/menu",
          content: { url: "https://example.com/menu" },
        },
        {
          user_id: ownerId,
          name: "Front desk Wi-Fi",
          qr_type: "wifi",
          content: { ssid: "Guest", password: "welcome123", security: "WPA", hidden: false },
        },
        // Rows have different columns; without this PostgREST sends NULL for the ones a row omits.
      ],
      { defaultToNull: false },
    )
    .select("id, name");
  if (codesError || !codes) throw codesError ?? new Error("Couldn't create codes");
  const { error: teamError } = await admin
    .from("team_members")
    .insert({ owner_id: ownerId, member_id: viewerId, role: "viewer" });
  if (teamError) throw teamError;

  const menu = codes.find((code) => code.name === "Spring menu")!;
  const wifi = codes.find((code) => code.name === "Front desk Wi-Fi")!;
  const { data: flyers, error: folderError } = await admin
    .from("folders")
    .insert({ user_id: ownerId, name: "Flyers" })
    .select("id")
    .single();
  if (folderError || !flyers) throw folderError ?? new Error("Couldn't create the folder");
  await admin.from("qr_codes").update({ folder_id: flyers.id }).eq("id", wifi.id);
  // Three recent scans for the menu, so the Scans column has something to show.
  const { error: scanError } = await admin
    .from("scan_events")
    .insert(["a", "b", "c"].map((visitor) => ({ code_id: menu.id, visitor_hash: visitor })));
  if (scanError) throw scanError;
  const seeded: Seed = { ownerId, viewerId, menuId: menu.id, folderId: flyers.id };
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(SEED_FILE, JSON.stringify(seeded));

  const baseURL = config.projects[0]!.use.baseURL!;
  const browser = await chromium.launch();
  for (const person of [OWNER, VIEWER]) {
    const page = await browser.newPage({ baseURL });
    await page.goto("login");
    await page.getByLabel("Email", { exact: true }).fill(person.email);
    await page.getByLabel("Password", { exact: true }).fill(person.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/(dashboard|codes)/);
    await page.context().storageState({ path: person.state });
    await page.close();
  }
  await browser.close();
}
