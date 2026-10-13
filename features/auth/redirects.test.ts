import { describe, expect, it } from "vitest";

import { safeNext } from "./redirects";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/dashboard/codes/1?tab=stats")).toBe("/dashboard/codes/1?tab=stats");
    expect(safeNext("/account")).toBe("/account");
  });

  it("rejects external and protocol-relative targets", () => {
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext("/\t/evil.example")).toBe("/dashboard");
    expect(safeNext("/\n/evil.example")).toBe("/dashboard");
    expect(safeNext("/.//evil.example")).toBe("/dashboard");
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext(null, "/")).toBe("/");
    expect(safeNext("")).toBe("/dashboard");
  });
});
