import { describe, expect, it } from "vitest";

import { apiKeyFrom, imageOptions, parseCreate, parseUpdate, withLinks } from "./v1";

const USER = "11111111-1111-4111-8111-111111111111";

async function errorOf(result: { error: Response } | { value: unknown }) {
  expect("error" in result).toBe(true);
  return ((await (result as { error: Response }).error.json()) as { error: { message: string } })
    .error.message;
}

describe("parseCreate", () => {
  it("creates dynamic url codes from a destination", () => {
    const result = parseCreate(
      { type: "url", dynamic: true, destination: "example.com/menu", name: " Menu " },
      USER,
    );
    expect(result).toEqual({
      value: {
        type: "url",
        dynamic: true,
        name: "Menu",
        destination: "https://example.com/menu",
        content: { url: "https://example.com/menu" },
      },
    });
  });

  it("validates static content with the generator's rules", async () => {
    const ok = parseCreate({ type: "wifi", content: { ssid: "Cafe", security: "nopass" } }, USER);
    expect("value" in ok && ok.value.content).toEqual({
      ssid: "Cafe",
      password: "",
      security: "nopass",
      hidden: false,
    });
    expect(await errorOf(parseCreate({ type: "wifi", content: {} }, USER))).toMatch(/content/);
    // Unknown choices fall back to defaults instead of breaking validation.
    const payment = parseCreate(
      { type: "payment", content: { method: "zelle", account: "sam" } },
      USER,
    );
    expect("value" in payment && (payment.value.content as { method: string }).method).toBe(
      "paypal",
    );
  });

  it("rejects bad types, dynamic static codes and bad fields", async () => {
    expect(await errorOf(parseCreate({ type: "nope" }, USER))).toMatch(/type/);
    expect(await errorOf(parseCreate({ type: "text", dynamic: true }, USER))).toMatch(/dynamic/);
    expect(
      await errorOf(parseCreate({ type: "url", dynamic: true, destination: "javascript:x" }, USER)),
    ).toMatch(/destination/);
    expect(
      await errorOf(parseCreate({ type: "text", content: { text: "a" }, slug: "a b" }, USER)),
    ).toMatch(/slug/);
    expect(
      await errorOf(
        parseCreate({ type: "text", content: { text: "a" }, active_from: "soon" }, USER),
      ),
    ).toMatch(/active_from/);
    expect(
      await errorOf(parseCreate({ type: "text", content: { text: "a" }, folder_id: 5 }, USER)),
    ).toMatch(/folder_id/);
    expect(await errorOf(parseCreate([], USER))).toMatch(/JSON object/);
  });

  it("drops uploaded logos from designs", () => {
    const result = parseCreate(
      {
        type: "text",
        content: { text: "hi" },
        design: { fgColor: "#112233", logo: "data:image/png;base64,AAAA" },
      },
      USER,
    );
    expect("value" in result && result.value.design).toMatchObject({
      fgColor: "#112233",
      logo: null,
    });
  });

  it("makes hosted pages dynamic and only allows the owner's files", async () => {
    const page = parseCreate(
      {
        type: "links",
        content: { title: "Hi", links: [{ label: "A", url: "https://a.example" }] },
      },
      USER,
    );
    expect("value" in page && page.value.dynamic).toBe(true);
    const foreign = parseCreate(
      {
        type: "pdf",
        content: {
          title: "Doc",
          file: {
            path: "22222222-2222-4222-8222-222222222222/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf",
            name: "a.pdf",
            type: "application/pdf",
            size: 10,
          },
        },
      },
      USER,
    );
    expect(await errorOf(foreign)).toMatch(/files you don't own|isn't valid/);
  });
});

describe("parseUpdate", () => {
  it("only lets dynamic url codes change destination", async () => {
    expect(
      parseUpdate({ destination: "https://new.example" }, { type: "url", dynamic: true }, USER),
    ).toEqual({
      value: { destination: "https://new.example", content: { url: "https://new.example" } },
    });
    expect(
      await errorOf(
        parseUpdate({ destination: "https://x.example" }, { type: "text", dynamic: false }, USER),
      ),
    ).toMatch(/destination/);
    expect(
      await errorOf(parseUpdate({ content: { url: "x" } }, { type: "url", dynamic: true }, USER)),
    ).toMatch(/destination/);
    expect(
      await errorOf(parseUpdate({ slug: "NEW-ONE" }, { type: "text", dynamic: false }, USER)),
    ).toMatch(/slug/);
  });

  it("clears dates and folders with null", () => {
    expect(
      parseUpdate(
        { active_until: null, folder_id: null, status: "paused" },
        { type: "text", dynamic: false },
        USER,
      ),
    ).toEqual({ value: { active_until: null, folder_id: null, status: "paused" } });
  });
});

describe("withLinks and imageOptions", () => {
  it("adds the payload and short link", () => {
    expect(withLinks({ type: "url", dynamic: true, slug: "AB3X9Q" })).toMatchObject({
      payload: expect.stringMatching(/\/r\/AB3X9Q$/i),
      short_link: expect.stringMatching(/\/r\/AB3X9Q$/),
    });
    expect(
      withLinks({ type: "phone", dynamic: false, slug: null, content: { phone: "+1 555" } }),
    ).toMatchObject({ payload: "tel:+1555", short_link: null });
  });

  it("checks image options", async () => {
    expect(imageOptions(new URLSearchParams("format=png&size=300&fg=ff0000&ec=h"))).toMatchObject({
      format: "png",
      size: 300,
      fg: "#FF0000",
      errorCorrection: "H",
    });
    expect(await errorOf(imageOptions(new URLSearchParams("size=10")) as never)).toMatch(/size/);
    expect(await errorOf(imageOptions(new URLSearchParams("format=gif")) as never)).toMatch(
      /format/,
    );
    expect(await errorOf(imageOptions(new URLSearchParams("fg=zzz")) as never)).toMatch(/hex/);
  });
});

describe("apiKeyFrom", () => {
  const key = (prefix: string) => `${prefix}_${"a1".repeat(24)}`;

  it("accepts qq_ and zl_ keys", () => {
    expect(apiKeyFrom(`Bearer ${key("zl")}`)).toBe(key("zl"));
    expect(apiKeyFrom(`Bearer ${key("qq")}`)).toBe(key("qq"));
  });

  it("refuses anything else", () => {
    expect(apiKeyFrom(`Bearer ${key("xx")}`)).toBeNull();
    expect(apiKeyFrom(key("zl"))).toBeNull();
    expect(apiKeyFrom(`Bearer zl_short`)).toBeNull();
    expect(apiKeyFrom(null)).toBeNull();
  });
});
