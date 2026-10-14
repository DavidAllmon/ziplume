import { describe, expect, it } from "vitest";

import { isCurrent, newCodeHref, withWorkspace } from "./nav";

describe("withWorkspace", () => {
  it("adds the team to a link, keeping its other parameters", () => {
    expect(withWorkspace("/codes", "t1")).toBe("/codes?workspace=t1");
    expect(withWorkspace("/codes?folder=f1", "t1")).toBe("/codes?folder=f1&workspace=t1");
  });

  it("leaves links to your own codes alone", () => {
    expect(withWorkspace("/codes", null)).toBe("/codes");
  });
});

describe("isCurrent", () => {
  it("matches the page and pages under it, not look-alikes", () => {
    expect(isCurrent("/codes", "/codes?workspace=t1")).toBe(true);
    expect(isCurrent("/codes/abc/analytics", "/codes")).toBe(true);
    expect(isCurrent("/codesx", "/codes")).toBe(false);
    expect(isCurrent("/settings/security", "/settings")).toBe(true);
  });
});

describe("newCodeHref", () => {
  it("opens the Create page with a type, a folder and the team when given", () => {
    expect(newCodeHref({ ownerId: null })).toBe("/codes/new");
    expect(newCodeHref({ type: "wifi", ownerId: null })).toBe("/codes/new?type=wifi");
    expect(newCodeHref({ folderId: "f1", ownerId: "t1" })).toBe(
      "/codes/new?folder=f1&workspace=t1",
    );
    expect(newCodeHref({ type: "links", folderId: "f1", ownerId: null })).toBe(
      "/codes/new?type=links&folder=f1",
    );
  });
});
