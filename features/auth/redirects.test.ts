import { describe, expect, it } from "vitest";

import { confirmDestination, safeNext } from "./redirects";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/codes/1?tab=stats")).toBe("/codes/1?tab=stats");
    expect(safeNext("/account")).toBe("/account");
  });

  it("rejects external and protocol-relative targets", () => {
    expect(safeNext("https://evil.example")).toBe("/codes");
    expect(safeNext("//evil.example")).toBe("/codes");
    expect(safeNext("/\\evil.example")).toBe("/codes");
    expect(safeNext("/\t/evil.example")).toBe("/codes");
    expect(safeNext("/\n/evil.example")).toBe("/codes");
    expect(safeNext("/.//evil.example")).toBe("/codes");
    expect(safeNext("javascript:alert(1)")).toBe("/codes");
    expect(safeNext(null, "/")).toBe("/");
    expect(safeNext("")).toBe("/codes");
  });
});

describe("confirmDestination", () => {
  const TOKEN = "c".repeat(48);

  it("opens a waiting team invite after a new account confirms its email", () => {
    expect(confirmDestination("/codes", "email", TOKEN)).toBe(`/invite/${TOKEN}`);
    expect(confirmDestination("/codes", "signup", TOKEN)).toBe(`/invite/${TOKEN}`);
  });

  it("still opens a waiting invite from confirmation emails sent before the move", () => {
    expect(confirmDestination("/dashboard", "email", TOKEN)).toBe(`/invite/${TOKEN}`);
  });

  it("keeps the page it was going to otherwise", () => {
    expect(confirmDestination("/codes", "email", null)).toBe("/codes");
    expect(confirmDestination("/bulk", "email", TOKEN)).toBe("/bulk");
    expect(confirmDestination("/account/update-password", "recovery", TOKEN)).toBe(
      "/account/update-password",
    );
    expect(confirmDestination("/codes", "email", "../../evil")).toBe("/codes");
  });
});
