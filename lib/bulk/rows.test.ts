import { describe, expect, it } from "vitest";

import { parseCsv } from "@/lib/csv/parse";

import { MAX_BULK_ROWS, NOT_A_WEB_ADDRESS, parseBulk, requireWebLinks, templateCsv } from "./rows";

describe("parseBulk", () => {
  it("makes one code per row and names them", () => {
    const result = parseBulk("url", "Name,URL\nFlyer,example.com/a\n,https://example.com/b\n");
    expect(result.error).toBeNull();
    expect(result.rows.map((r) => [r.line, r.name, r.payload, r.error])).toEqual([
      [2, "Flyer", "https://example.com/a", null],
      [3, "example.com/b", "https://example.com/b", null],
    ]);
  });

  it("reports invalid rows without dropping the rest", () => {
    const result = parseBulk("url", "name,url\nBad,not a url\nGood,https://example.com\n");
    expect(result.rows[0]?.error).toMatch(/web address/i);
    expect(result.rows[0]?.payload).toBe("");
    expect(result.rows[1]?.error).toBeNull();
  });

  it("matches header aliases and lists unknown columns", () => {
    const result = parseBulk("location", "label,address,notes\nHQ,10 Main St,ignore me\n");
    expect(result.ignored).toEqual(["notes"]);
    expect(result.rows[0]?.name).toBe("HQ");
    expect(result.rows[0]?.payload).toContain("10%20Main%20St");
  });

  it("uses coordinates when there's no address", () => {
    const result = parseBulk("location", "name,latitude,longitude\nPier,37.8,-122.4\n");
    expect(result.rows[0]?.values.mode).toBe("coordinates");
    expect(result.rows[0]?.error).toBeNull();
  });

  it("normalizes Wi-Fi security and hidden flags", () => {
    const result = parseBulk(
      "wifi",
      "name,ssid,password,security,hidden\nA,Home,longpassword,wpa2,yes\nB,Open,,,\n",
    );
    expect(result.rows[0]?.values).toMatchObject({ security: "WPA", hidden: true });
    expect(result.rows[0]?.payload).toBe("WIFI:T:WPA;S:Home;P:longpassword;H:true;;");
    expect(result.rows[1]?.values).toMatchObject({ security: "nopass", hidden: false });
  });

  it("rejects unknown payment methods", () => {
    const result = parseBulk("payment", "name,method,account\nTip,zelle,sam\nOk,Cash App,$sam\n");
    expect(result.rows[0]?.error).toMatch(/method/);
    expect(result.rows[1]?.values.method).toBe("cashapp");
  });

  it("explains missing headers and empty files", () => {
    expect(parseBulk("url", "").error).toMatch(/header/);
    expect(parseBulk("url", "foo,bar\n1,2").error).toMatch(/columns match/);
  });

  it("flags content too long for a QR code", () => {
    const result = parseBulk("text", `name,text\nLong,${"x".repeat(5000)}\n`);
    expect(result.rows[0]?.error).toMatch(/Too much/);
  });

  it(`stops at ${MAX_BULK_ROWS} rows`, () => {
    const lines = Array.from({ length: MAX_BULK_ROWS + 5 }, (_, i) => `R${i},hello`);
    const result = parseBulk("text", `name,text\n${lines.join("\n")}`);
    expect(result.rows).toHaveLength(MAX_BULK_ROWS);
    expect(result.skipped).toBe(5);
  });

  it("templates parse back into valid codes for every type", () => {
    for (const type of [
      "url",
      "text",
      "wifi",
      "contact",
      "email",
      "phone",
      "sms",
      "whatsapp",
      "location",
      "payment",
    ] as const) {
      const csv = templateCsv(type);
      expect(parseCsv(csv)[0]?.[0]).toBe("name");
      const result = parseBulk(type, csv);
      expect(result.error, type).toBeNull();
      expect(
        result.rows.map((r) => r.error),
        type,
      ).toEqual(result.rows.map(() => null));
    }
  });
});

describe("requireWebLinks", () => {
  it("flags links that aren't web addresses and keeps the rest", () => {
    const { rows } = parseBulk(
      "url",
      "name,url\nMenu,example.com/menu\nMail,mailto:hi@example.com\nBad,not a link",
      "M",
    );
    const checked = requireWebLinks(rows);
    expect(checked[0]!.error).toBeNull();
    expect(checked[1]!.error).toBe(NOT_A_WEB_ADDRESS);
    // A row that already needs fixing keeps its own reason.
    expect(checked[2]!.error).toBe(rows[2]!.error);
    expect(checked[2]!.error).not.toBeNull();
  });
});
