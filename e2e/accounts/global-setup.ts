import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

import {
  AUTH_DIR,
  MAKER,
  OWNER,
  PAGES,
  PAT,
  PAUSED_PAGE_SLUG,
  PHONE_PAGES,
  QUINN,
  RAY,
  SEED_FILE,
  SKY,
  VIEWER,
  type Seed,
} from "./fixtures";

type Person = { email: string; password: string; name: string };

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
  for (const person of [OWNER, VIEWER, MAKER, PAT, QUINN, RAY, SKY, PAGES]) {
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
  const makerId = await create(MAKER);
  const patId = await create(PAT);
  const quinnId = await create(QUINN);
  const rayId = await create(RAY);
  const skyId = await create(SKY);
  const pagesId = await create(PAGES);
  const { error: pagesError } = await admin.from("qr_codes").insert(
    [
      ...PHONE_PAGES.map((page) => ({
        user_id: pagesId,
        name: page.slug,
        qr_type: page.type,
        is_dynamic: true,
        slug: page.slug,
        content: page.content,
      })),
      {
        user_id: pagesId,
        name: PAUSED_PAGE_SLUG,
        qr_type: "links",
        is_dynamic: true,
        slug: PAUSED_PAGE_SLUG,
        status: "paused",
        content: { title: "Paused page", links: [] },
      },
    ],
    { defaultToNull: false },
  );
  if (pagesError) throw pagesError;

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
  const { data: posters, error: postersError } = await admin
    .from("folders")
    .insert({ user_id: makerId, name: "Posters" })
    .select("id")
    .single();
  if (postersError || !posters) throw postersError ?? new Error("Couldn't create the folder");
  const { error: teamsError } = await admin.from("team_members").insert([
    { owner_id: patId, member_id: quinnId, role: "editor" },
    { owner_id: rayId, member_id: skyId, role: "viewer" },
  ]);
  if (teamsError) throw teamsError;
  const note = { qr_type: "text", content: { text: "hello" } };
  const { data: own, error: ownError } = await admin
    .from("qr_codes")
    .insert(
      [
        { user_id: viewerId, name: "Victor note", ...note },
        { user_id: quinnId, name: "Quinn poster", ...note },
        { user_id: rayId, name: "Ray sign", ...note },
        { user_id: skyId, name: "Sky flyer", ...note },
      ],
      { defaultToNull: false },
    )
    .select("id, name");
  if (ownError || !own) throw ownError ?? new Error("Couldn't create team codes");
  const seeded: Seed = {
    ownerId,
    viewerId,
    menuId: menu.id,
    folderId: flyers.id,
    makerId,
    makerFolderId: posters.id,
    viewerCodeId: own.find((code) => code.name === "Victor note")!.id,
    rayId,
    skyId,
  };
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(SEED_FILE, JSON.stringify(seeded));

  const baseURL = config.projects[0]!.use.baseURL!;
  const browser = await chromium.launch();
  for (const person of [OWNER, VIEWER, MAKER, PAT, QUINN, RAY, SKY]) {
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
