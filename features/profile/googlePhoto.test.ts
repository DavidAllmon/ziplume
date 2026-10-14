import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { googlePhotoOf } from "./googlePhoto";

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
