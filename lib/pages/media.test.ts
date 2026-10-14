import { describe, expect, it } from "vitest";

import { replaceMediaPaths } from "./media";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("replaceMediaPaths", () => {
  it("swaps the paths it's given, wherever they are, and leaves everything else", () => {
    const content = {
      title: "Menu",
      logo: { path: `${A}/logo.png`, name: "logo.png", type: "image/png", size: 10 },
      images: [{ path: `${A}/one.jpg`, name: "one.jpg", type: "image/jpeg", size: 20 }],
      other: { path: "not-a-media-path" },
    };
    const renamed = new Map([
      [`${A}/logo.png`, `${B}/logo.png`],
      [`${A}/one.jpg`, `${B}/one.jpg`],
    ]);
    expect(replaceMediaPaths(content, renamed)).toEqual({
      title: "Menu",
      logo: { path: `${B}/logo.png`, name: "logo.png", type: "image/png", size: 10 },
      images: [{ path: `${B}/one.jpg`, name: "one.jpg", type: "image/jpeg", size: 20 }],
      other: { path: "not-a-media-path" },
    });
  });
});
