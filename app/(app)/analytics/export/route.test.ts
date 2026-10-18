// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as Env from "@/lib/env";

const pages: unknown[][] = [];
// The signed-in person owns a team, so Everyone is a real scope.
const team = [
  {
    user_id: "me",
    email: "me@example.com",
    name: "Me",
    avatar_url: null,
    role: "owner",
    is_me: true,
  },
  {
    user_id: "pat",
    email: "pat@example.com",
    name: "Pat",
    avatar_url: null,
    role: "editor",
    is_me: false,
  },
];
const rpc = vi.fn(async (name: string, _args: Record<string, unknown>) => {
  if (name === "my_team") return { data: team, error: null };
  return { data: pages.shift() ?? [], error: null };
});
const firstCode = { created_at: "2030-01-01T00:00:00Z" };
const chain: Record<string, unknown> = {};
for (const m of ["select", "eq", "order", "limit"]) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: firstCode, error: null });
vi.mock("@/lib/auth/server", () => ({
  getAuthState: async () => ({
    supabase: { rpc, from: () => chain },
    user: { id: "me" },
    needsMfa: false,
  }),
}));
vi.mock("@/lib/env", async (original) => ({
  ...(await original<typeof Env>()),
  accountsEnabled: true,
}));

import { GET } from "./route";

const get = (query: string) =>
  GET(new Request(`https://ziplume.com/analytics/export?${query}`) as never);
const row = (id: number, name: string) => ({
  id,
  scanned_at: "2030-01-10T15:00:00Z",
  code_name: name,
  code_slug: "MENU12",
  country: "US",
  region: null,
  city: "Austin",
  device_type: "mobile",
  os: "iOS",
  browser: "Safari",
});

describe("GET /analytics/export", () => {
  beforeEach(() => {
    pages.length = 0;
    rpc.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("streams every page of the workspace's scans, with each code's name and link", async () => {
    pages.push(
      Array.from({ length: 1000 }, (_, i) => row(5000 - i, "Spring menu")),
      [row(10, "=SUM(A1)"), row(9, 'Cafe, "flyer"')],
    );
    const response = await get("range=30d&tz=UTC");
    expect(response.headers.get("content-type")).toMatch(/text\/csv/);
    const lines = (await response.text()).trim().split("\r\n");
    expect(lines[0]).toBe(
      "scanned_at_utc,local_date,local_time,code,short_link,country,region,city,device,os,browser",
    );
    expect(lines).toHaveLength(1 + 1002);
    expect(lines.at(-2)).toContain("'=SUM(A1)");
    expect(lines.at(-1)).toContain('"Cafe, ""flyer"""');
    const scanCalls = rpc.mock.calls.filter(([name]) => name === "workspace_scans");
    expect(scanCalls[0]![1]).toMatchObject({ p_owner: "me", p_before: null });
    expect(scanCalls[1]![1]).toMatchObject({ p_before: 4001 });
  });

  it("uses Everyone and a custom range when asked, and refuses an impossible range", async () => {
    // A clock after the days asked for, so they're in the past.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-03-01T12:00:00Z"));
    await (await get("view=everyone&range=custom&from=2030-01-05&to=2030-01-06&tz=UTC")).text();
    expect(rpc.mock.calls.find(([name]) => name === "workspace_scans")![1]).toMatchObject({
      p_owner: null,
      p_from: "2030-01-05T00:00:00.000Z",
      p_to: "2030-01-07T00:00:00.000Z",
    });
    expect((await get("range=custom&from=2030-01-09&to=2030-01-01&tz=UTC")).status).toBe(400);
  });

  it("names the file from the range it used, never from the link", async () => {
    const hostile = encodeURIComponent(`x"; filename*=UTF-8''report.bat; x="`);
    const response = await get(`range=${hostile}&tz=UTC`);
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="ziplume-scans-all-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
  });
});
