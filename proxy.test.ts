// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as Env from "@/lib/env";

import { proxy } from "./proxy";

const refreshSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/proxy", () => ({ refreshSession }));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof Env>()),
  SITE_URL: "https://ziplume.com",
  accountsEnabled: true,
}));

const request = (url: string, host: string) => new NextRequest(url, { headers: { host } });

beforeEach(() => {
  vi.stubEnv("LEGACY_HOSTS", "qr.techitdave.com");
  refreshSession.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
});
afterEach(() => vi.unstubAllEnvs());

describe("on the old address", () => {
  it("forwards app pages to the site address with a 308, keeping the query", async () => {
    const response = await proxy(
      request("http://localhost:3000/codes?folder=f1", "qr.techitdave.com"),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://ziplume.com/codes?folder=f1");
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("still routes uppercase short links to the scan handler", async () => {
    const response = await proxy(request("http://localhost:3000/R/AB3X9Q", "qr.techitdave.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/r/AB3X9Q");
  });

  it("serves hosted pages itself", async () => {
    const response = await proxy(request("http://localhost:3000/p/MENU12", "qr.techitdave.com"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("on the site address", () => {
  it("refreshes the session on app pages", async () => {
    for (const path of ["/", "/codes", "/codes/abc/edit", "/team", "/settings/security"]) {
      await proxy(request(`https://ziplume.com${path}`, "ziplume.com"));
    }
    expect(refreshSession).toHaveBeenCalledTimes(5);
  });

  it("skips the session for short links, hosted pages, files and the pass-through", async () => {
    for (const path of [
      "/r/AB3X9Q",
      "/p/MENU12",
      "/storage/v1/object/public/avatars/u/a.png",
      "/auth/v1/callback",
      "/api/health",
      "/brand/email-header.png",
      "/codesx",
    ]) {
      const response = await proxy(request(`https://ziplume.com${path}`, "ziplume.com"));
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
    }
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("keeps sending old edit links to the editor", async () => {
    const response = await proxy(request("https://ziplume.com/?edit=abc", "ziplume.com"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://ziplume.com/codes/abc/edit");
  });
});
