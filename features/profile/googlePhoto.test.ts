import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { googleJustLinked, googlePhotoOf } from "./googlePhoto";

const user = (identities: unknown[], user_metadata: Record<string, unknown> = {}) =>
  ({ identities, user_metadata }) as unknown as User;
const PHOTO = "https://lh3.googleusercontent.com/a/sam";

describe("googlePhotoOf", () => {
  it("uses the photo from the Google sign-in", () => {
    expect(
      googlePhotoOf(user([{ provider: "google", identity_data: { avatar_url: PHOTO } }])),
    ).toBe(PHOTO);
    expect(googlePhotoOf(user([{ provider: "google", identity_data: { picture: PHOTO } }]))).toBe(
      PHOTO,
    );
    expect(
      googlePhotoOf(user([{ provider: "google", identity_data: {} }], { picture: PHOTO })),
    ).toBe(PHOTO);
  });

  it("is empty without Google, or for addresses that aren't https", () => {
    expect(
      googlePhotoOf(user([{ provider: "email", identity_data: {} }], { picture: PHOTO })),
    ).toBeNull();
    expect(
      googlePhotoOf(
        user([{ provider: "google", identity_data: { picture: "http://x.example/a" } }]),
      ),
    ).toBeNull();
  });
});

describe("googleJustLinked", () => {
  const NOW = Date.parse("2026-10-14T12:00:00Z");
  const linked = (createdAt: string | undefined) =>
    ({ identities: [{ provider: "google", created_at: createdAt }] }) as unknown as User;

  it("is true only in the minute after Google was added to the account", () => {
    expect(googleJustLinked(linked("2026-10-14T11:59:50Z"), NOW)).toBe(true);
    expect(googleJustLinked(linked("2026-10-14T11:55:00Z"), NOW)).toBe(false);
  });

  it("is false without Google or a usable date", () => {
    expect(googleJustLinked({ identities: [] } as unknown as User, NOW)).toBe(false);
    expect(googleJustLinked(linked(undefined), NOW)).toBe(false);
    expect(googleJustLinked(linked("soon"), NOW)).toBe(false);
  });
});
