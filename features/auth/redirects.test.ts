import { describe, expect, it } from "vitest";

import { confirmDestination, safeNext } from "./redirects";

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

describe("confirmDestination", () => {
  const TOKEN = "c".repeat(48);

  it("opens a waiting team invite after a new account confirms its email", () => {
    expect(confirmDestination("/dashboard", "email", TOKEN)).toBe(`/invite/${TOKEN}`);
    expect(confirmDestination("/dashboard", "signup", TOKEN)).toBe(`/invite/${TOKEN}`);
  });

  it("keeps the page it was going to otherwise", () => {
    expect(confirmDestination("/dashboard", "email", null)).toBe("/dashboard");
    expect(confirmDestination("/bulk", "email", TOKEN)).toBe("/bulk");
    expect(confirmDestination("/account/update-password", "recovery", TOKEN)).toBe(
      "/account/update-password",
    );
    expect(confirmDestination("/dashboard", "email", "../../evil")).toBe("/dashboard");
  });
});
