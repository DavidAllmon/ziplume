import { describe, expect, it } from "vitest";

import { squareCrop, validateAvatarFile } from "./avatarImage";

describe("validateAvatarFile", () => {
  it("accepts JPG, PNG and WebP photos up to 10 MB", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 3_000_000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/webp", size: 1000 })).toBeNull();
  });

  it("explains what to use instead", () => {
    expect(validateAvatarFile({ type: "image/heic", size: 1000 })).toBe(
      "Use a JPG, PNG or WebP photo.",
    );
    expect(validateAvatarFile({ type: "image/gif", size: 1000 })).toBe(
      "Use a JPG, PNG or WebP photo.",
    );
    expect(validateAvatarFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toBe(
      "That photo is over 10 MB. Try a smaller one.",
    );
  });
});

describe("squareCrop", () => {
  it("takes the largest centered square", () => {
    expect(squareCrop(1200, 800)).toEqual({ sx: 200, sy: 0, side: 800 });
    expect(squareCrop(800, 1201)).toEqual({ sx: 0, sy: 200, side: 800 });
    expect(squareCrop(512, 512)).toEqual({ sx: 0, sy: 0, side: 512 });
  });
});
