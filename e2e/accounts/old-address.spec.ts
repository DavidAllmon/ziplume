import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { seed } from "./fixtures";

// playwright.accounts.config.ts starts the app with LEGACY_HOSTS=qr.techitdave.com.
test("a scan on the old address keeps the visitor there for the hosted page", async ({
  request,
}) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const slug = `OLD${Date.now().toString(36).toUpperCase()}`;
  const { error } = await admin.from("qr_codes").insert({
    user_id: seed().ownerId,
    name: "Old address page",
    qr_type: "links",
    is_dynamic: true,
    slug,
    content: { title: "Old address page", links: [] },
  });
  expect(error).toBeNull();

  // An old printed code: the page opens on the old address, so a password unlock (a cookie on
  // that host) and the page agree.
  const old = await request.get(`/r/${slug}`, {
    headers: { host: "qr.techitdave.com" },
    maxRedirects: 0,
  });
  expect(old.status()).toBe(302);
  expect(old.headers()["location"]).toBe(`https://qr.techitdave.com/p/${slug}`);

  // A new code: the site address.
  const site = await request.get(`/r/${slug}`, { maxRedirects: 0 });
  expect(site.headers()["location"]).toBe(`http://localhost:4174/p/${slug}`);
});
