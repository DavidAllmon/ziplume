import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/color/contrast";

import { AVATAR_COLORS, avatarColors, initialsOf, trustedAvatarUrl } from "./avatar";

const PROJECT = "https://proj.supabase.example";

describe("trustedAvatarUrl", () => {
  it("accepts photos uploaded to this project's avatars bucket", () => {
    const url = `${PROJECT}/storage/v1/object/public/avatars/u1/a.webp`;
    expect(trustedAvatarUrl(url, PROJECT)).toBe(url);
  });

  it("accepts Google account photos", () => {
    const url = "https://lh3.googleusercontent.com/a/abc=s96-c";
    expect(trustedAvatarUrl(url, PROJECT)).toBe(url);
  });

  it("rejects other buckets, other hosts, plain http and junk", () => {
    expect(
      trustedAvatarUrl(`${PROJECT}/storage/v1/object/public/page-media/u1/a.webp`, PROJECT),
    ).toBeNull();
    expect(trustedAvatarUrl("https://tracker.example/pixel.gif", PROJECT)).toBeNull();
    expect(
      trustedAvatarUrl("https://googleusercontent.com.evil.example/a.png", PROJECT),
    ).toBeNull();
    expect(trustedAvatarUrl("http://lh3.googleusercontent.com/a/abc", PROJECT)).toBeNull();
    expect(trustedAvatarUrl("not a url", PROJECT)).toBeNull();
    expect(trustedAvatarUrl(null, PROJECT)).toBeNull();
  });
});

describe("initialsOf", () => {
  it("uses the first and last name, or the email's first part", () => {
    expect(initialsOf("David Allmon")).toBe("DA");
    expect(initialsOf("Madonna")).toBe("M");
    expect(initialsOf(null, "sam@cafe.com")).toBe("S");
    expect(initialsOf("", "jo.rivera@cafe.com")).toBe("JR");
    expect(initialsOf("émile zola")).toBe("ÉZ");
    expect(initialsOf("  ", "")).toBe("?");
  });
});

describe("avatarColors", () => {
  it("is stable for an id", () => {
    expect(avatarColors("user-1")).toBe(avatarColors("user-1"));
  });

  it("only uses pairs that are easy to read", () => {
    for (const pair of AVATAR_COLORS)
      expect(contrastRatio(pair.bg, pair.fg)).toBeGreaterThanOrEqual(7);
  });
});
