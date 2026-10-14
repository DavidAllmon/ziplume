import { describe, expect, it } from "vitest";

import type { QrCodeRow } from "@/types/supabase";

import { filterCodes, listStatus, NO_FILTERS, sortCodes, typesIn } from "./filters";

const NOW = Date.parse("2026-10-14T12:00:00Z");

function code(patch: Partial<QrCodeRow>): QrCodeRow {
  return {
    id: "id",
    user_id: "u1",
    name: "Code",
    qr_type: "url",
    content: { url: "https://example.com" },
    design: {},
    is_dynamic: false,
    slug: null,
    destination: null,
    status: "active",
    scan_count: 0,
    last_scanned_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    folder_id: null,
    active_from: null,
    active_until: null,
    has_password: false,
    ...patch,
  } as QrCodeRow;
}

const trackable = (patch: Partial<QrCodeRow> = {}) =>
  code({ is_dynamic: true, slug: "ABC123", destination: "https://example.com/menu", ...patch });

describe("listStatus", () => {
  it("gives static codes one status: Static", () => {
    expect(listStatus(code({ status: "paused" }), NOW)).toBe("static");
  });

  it("gives trackable codes Active, Paused, Scheduled or Expired", () => {
    expect(listStatus(trackable(), NOW)).toBe("active");
    expect(listStatus(trackable({ status: "paused" }), NOW)).toBe("paused");
    expect(listStatus(trackable({ active_from: "2026-10-14T18:00:00Z" }), NOW)).toBe("scheduled");
    expect(listStatus(trackable({ active_until: "2026-10-14T12:00:00Z" }), NOW)).toBe("expired");
    expect(listStatus(trackable({ active_until: "2026-10-14T12:00:01Z" }), NOW)).toBe("active");
  });
});

describe("filterCodes", () => {
  const menu = trackable({ id: "menu", name: "Spring menu" });
  const wifi = code({
    id: "wifi",
    name: "Front desk",
    qr_type: "wifi",
    content: { ssid: "Guest", password: "x", security: "WPA", hidden: false },
  });
  const paused = trackable({ id: "paused", name: "Old flyer", status: "paused", slug: "OLD999" });

  it("searches names, content and short links", () => {
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, query: "spring" }, NOW)).toEqual([
      menu,
    ]);
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, query: "guest" }, NOW)).toEqual([
      wifi,
    ]);
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, query: "old999" }, NOW)).toEqual([
      paused,
    ]);
  });

  it("filters by type and by status", () => {
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, type: "wifi" }, NOW)).toEqual([wifi]);
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, status: "paused" }, NOW)).toEqual([
      paused,
    ]);
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, status: "static" }, NOW)).toEqual([
      wifi,
    ]);
  });
});

describe("sortCodes", () => {
  const a = code({
    id: "a",
    name: "Banana",
    created_at: "2026-10-03T00:00:00Z",
    updated_at: "2026-10-04T00:00:00Z",
  });
  const b = code({
    id: "b",
    name: "apple",
    created_at: "2026-10-05T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  });
  const c = code({
    id: "c",
    name: "Cherry",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-06T00:00:00Z",
  });

  it("sorts by newest, recently updated, most scans or name", () => {
    const ids = (list: QrCodeRow[]) => list.map((x) => x.id);
    expect(ids(sortCodes([a, b, c], "newest", {}))).toEqual(["b", "a", "c"]);
    expect(ids(sortCodes([a, b, c], "updated", {}))).toEqual(["c", "a", "b"]);
    expect(ids(sortCodes([a, b, c], "scans", { a: 2, c: 9 }))).toEqual(["c", "a", "b"]);
    expect(ids(sortCodes([a, b, c], "name", {}))).toEqual(["b", "a", "c"]);
  });

  it("doesn't change the list it was given", () => {
    const list = [a, b, c];
    sortCodes(list, "name", {});
    expect(list.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("typesIn", () => {
  it("lists each type once", () => {
    expect(typesIn([code({}), code({ qr_type: "wifi" }), code({})])).toEqual(["url", "wifi"]);
  });
});
