import { describe, expect, it } from "vitest";

import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { shortLink } from "@/lib/env";
import type { QrCodeRow } from "@/types/supabase";

import { indexCsv, itemsFromCodes, itemsFromRows } from "./zip";

const code = (overrides: Record<string, unknown>) =>
  ({
    id: "c1",
    user_id: "u1",
    name: "Menu",
    qr_type: "url",
    content: { url: "https://example.com/menu" },
    design: {},
    is_dynamic: false,
    slug: null,
    destination: null,
    status: "active",
    ...overrides,
  }) as unknown as QrCodeRow;

describe("bulk ZIP", () => {
  it("lists each file with its code's name, what it opens and its short link", () => {
    const options = { ...DEFAULT_DESIGN, data: "x", size: 64 };
    const items = [
      {
        label: "Menu",
        options,
        content: "https://example.com/menu",
        shortLink: "https://qr.example/r/ABC",
      },
      { label: "Guest, Wi-Fi", options, content: "WIFI:S:Guest;;", shortLink: "" },
    ];
    expect(indexCsv(items, ["menu.png", "guest-wi-fi.png"])).toBe(
      'file,name,content,short_link\r\nmenu.png,Menu,https://example.com/menu,https://qr.example/r/ABC\r\nguest-wi-fi.png,"Guest, Wi-Fi",WIFI:S:Guest;;,',
    );
  });

  it("uses a saved trackable code's destination and short link", () => {
    const [item] = itemsFromCodes([
      code({ is_dynamic: true, slug: "ABC123", destination: "https://example.com/menu" }),
    ]);
    expect(item).toMatchObject({
      label: "Menu",
      content: "https://example.com/menu",
      shortLink: shortLink("ABC123"),
    });
    expect(item!.options.data).not.toBe("");
  });

  it("encodes rows from a list directly, in the classic design", () => {
    const [item] = itemsFromRows([
      {
        line: 2,
        name: "Menu",
        values: { url: "https://example.com/menu" },
        payload: "https://example.com/menu",
        error: null,
      },
    ]);
    expect(item).toMatchObject({
      label: "Menu",
      content: "https://example.com/menu",
      shortLink: "",
    });
    expect(item!.options).toMatchObject({
      ...DEFAULT_DESIGN,
      data: "https://example.com/menu",
      size: 1024,
    });
  });
});
