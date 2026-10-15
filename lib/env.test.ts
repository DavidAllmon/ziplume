import { describe, expect, it } from "vitest";

import { publicFileUrl, SITE_URL } from "./env";
import { mediaUrl } from "./pages/urls";

describe("public file links", () => {
  it("use the site's own address, encoding each part of the path", () => {
    expect(publicFileUrl("avatars", "u1/a b.png")).toBe(
      `${SITE_URL}/storage/v1/object/public/avatars/u1/a%20b.png`,
    );
    expect(mediaUrl("u1/menu.pdf")).toBe(
      `${SITE_URL}/storage/v1/object/public/page-media/u1/menu.pdf`,
    );
  });
});
