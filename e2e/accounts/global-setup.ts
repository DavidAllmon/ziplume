import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

import {
  AUTH_DIR,
  MAKER,
  OWNER,
  LOOK_PAGES,
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
      ...[...PHONE_PAGES, ...LOOK_PAGES].map((page) => ({
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
  // A feedback page Maker owns, so a test can answer it and then read the summary.
  const { data: makerFeedback, error: feedbackError } = await admin
    .from("qr_codes")
    .insert({
      user_id: makerId,
      name: "Maker feedback",
      qr_type: "feedback",
      is_dynamic: true,
      slug: "MAKER-FEEDBACK",
      content: {
        business: "Maker Cafe",
        questions: [
          { text: "How was the food?", style: "stars" },
          { text: "Would you come back?", style: "thumbs" },
          { text: "How likely are you to recommend us?", style: "scale" },
        ],
        allowComment: false,
        askContact: false,
        thanks: "Thank you!",
        reviewUrl: "",
      },
    })
    .select("id")
    .single();
  if (feedbackError || !makerFeedback) throw feedbackError ?? new Error("Couldn't create feedback");
  // Maker's pages that take what visitors send back, so tests can send it and read it.
  const { data: makerPages, error: makerPagesError } = await admin
    .from("qr_codes")
    .insert([
      {
        user_id: makerId,
        name: "Maker card",
        qr_type: "vcard",
        is_dynamic: true,
        slug: "MAKER-CARD",
        content: {
          firstName: "Max",
          lastName: "Maker",
          phones: [],
          emails: [{ label: "Work", address: "max@example.com" }],
          socials: [],
          shareDetails: true,
        },
      },
      {
        user_id: makerId,
        name: "Maker coupon",
        qr_type: "coupon",
        is_dynamic: true,
        slug: "MAKER-COUPON",
        content: { business: "Maker Cafe", offer: "FREE COFFEE", code: "COFFEE", markUsed: true },
      },
      {
        user_id: makerId,
        name: "Maker dinner",
        qr_type: "event",
        is_dynamic: true,
        slug: "MAKER-DINNER",
        content: {
          title: "Maker dinner",
          start: "2099-12-05T18:00",
          end: "2099-12-05T21:00",
          timeZone: "America/New_York",
          rsvp: true,
          rsvpCapacity: "4",
        },
      },
    ])
    .select("id, slug");
  if (makerPagesError || !makerPages) throw makerPagesError ?? new Error("Couldn't create pages");
  const makerPage = (slug: string) => makerPages.find((p) => p.slug === slug)!.id;
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
        // Private: only Victor sees it (teams spec 6).
        { user_id: viewerId, name: "Victor diary", is_private: true, ...note },
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
    makerFeedbackId: makerFeedback.id,
    makerCardId: makerPage("MAKER-CARD"),
    makerCouponId: makerPage("MAKER-COUPON"),
    makerDinnerId: makerPage("MAKER-DINNER"),
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
