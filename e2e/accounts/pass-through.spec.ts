import { expect, test, type APIResponse } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { seed } from "./fixtures";

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Same status; same redirect (ignoring the per-request state); otherwise the same body. */
async function expectSameAnswer(direct: APIResponse, through: APIResponse) {
  expect(through.status()).toBe(direct.status());
  const where = (value: string | undefined) => {
    if (!value) return value;
    const url = new URL(value, SUPABASE);
    url.searchParams.delete("state");
    return url.toString();
  };
  const [a, b] = [direct.headers()["location"], through.headers()["location"]];
  if (a || b) expect(where(b)).toBe(where(a));
  else expect(await through.text()).toBe(await direct.text());
}

test("Google sign-in's first and last stops answer as Supabase does", async ({ request }) => {
  for (const path of [
    "/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A4174%2Fauth%2Fcallback",
    "/auth/v1/callback?error=access_denied&error_description=Cancelled",
  ]) {
    const direct = await request.get(`${SUPABASE}${path}`, { maxRedirects: 0 });
    const through = await request.get(path, { maxRedirects: 0 });
    await expectSameAnswer(direct, through);
  }
});

test("public files load through the site, whole or in part", async ({ request }) => {
  const admin = createClient(SUPABASE, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // A 1×1 PNG: the avatars bucket accepts PNG, JPEG and WebP only.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  const path = `${seed().ownerId}/pass-through.png`;
  const { error } = await admin.storage
    .from("avatars")
    .upload(path, png, { contentType: "image/png", upsert: true });
  expect(error).toBeNull();

  const whole = await request.get(`/storage/v1/object/public/avatars/${path}`);
  expect(whole.status()).toBe(200);
  expect(whole.headers()["content-type"]).toBe("image/png");
  expect(Buffer.compare(await whole.body(), png)).toBe(0);
  // Supabase says a year; Cloudflare keeps its copy ten minutes, so deleted files stop soon.
  expect(whole.headers()["cloudflare-cdn-cache-control"]).toBe("max-age=600");

  // Audio and video seek with byte ranges.
  const part = await request.get(`/storage/v1/object/public/avatars/${path}`, {
    headers: { range: "bytes=0-7" },
  });
  expect(part.status()).toBe(206);
  expect(Buffer.compare(await part.body(), png.subarray(0, 8))).toBe(0);
});
