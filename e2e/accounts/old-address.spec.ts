import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { OWNER, seed } from "./fixtures";

// playwright.accounts.config.ts starts the app with LEGACY_HOSTS=qr.techitdave.com.
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const OLD = { host: "qr.techitdave.com" };

async function pageCode(name: string) {
  const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const slug = `OLD${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
  const { data, error } = await admin
    .from("qr_codes")
    .insert({
      user_id: seed().ownerId,
      name,
      qr_type: "links",
      is_dynamic: true,
      slug,
      content: { title: name, links: [] },
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  return { id: data!.id as string, slug };
}

test("a scan on the old address sends visitors on to the hosted page at the site address", async ({
  request,
}) => {
  const { slug } = await pageCode("Old address page");
  for (const headers of [OLD, {}]) {
    const scan = await request.get(`/r/${slug}`, { headers, maxRedirects: 0 });
    expect(scan.status()).toBe(302);
    expect(scan.headers()["location"]).toBe(`http://localhost:4174/p/${slug}`);
  }
});

test("a password-protected page from an old printed code asks for the password once", async ({
  request,
}) => {
  const { id, slug } = await pageCode("Old address locked page");
  const owner = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await owner.auth.signInWithPassword({
    email: OWNER.email,
    password: OWNER.password,
  });
  expect(signInError).toBeNull();
  const { error } = await owner.rpc("set_code_password", { p_code: id, p_password: "open sesame" });
  expect(error).toBeNull();

  // The scan shows the password form on the old address.
  const form = await request.get(`/r/${slug}`, { headers: OLD, maxRedirects: 0 });
  expect(form.status()).toBe(200);

  // The right password unlocks it there, and the page opens on the same address.
  const unlocked = await request.post(`/r/${slug}`, {
    headers: OLD,
    form: { password: "open sesame" },
    maxRedirects: 0,
  });
  expect(unlocked.status()).toBe(303);
  expect(unlocked.headers()["location"]).toBe(`https://qr.techitdave.com/p/${slug}`);
  const setCookie = unlocked.headers()["set-cookie"] ?? "";
  const cookie = /qq_unlock_[A-Z0-9-]+=[^;]+/.exec(setCookie)?.[0];
  expect(cookie).toBeTruthy();
  expect(setCookie.toLowerCase()).not.toContain("domain=");

  // With that cookie the page shows instead of sending the visitor back to the password form.
  const page = await request.get(`/p/${slug}`, {
    headers: { ...OLD, cookie: cookie! },
    maxRedirects: 0,
  });
  expect(page.status()).toBe(200);
});
