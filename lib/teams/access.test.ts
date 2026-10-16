import { describe, expect, it } from "vitest";

import { accessTo, codesScope, firstName, personLabel, toTeam, type TeamPerson } from "./access";

const person = (userId: string, role: TeamPerson["role"], isMe = false): TeamPerson => ({
  userId,
  email: `${userId}@example.com`,
  name: userId === "kim" ? "Kim" : null,
  avatarUrl: null,
  role,
  isMe,
});

describe("team access", () => {
  it("your own codes are always yours to change", () => {
    expect(accessTo([], "me", "me")).toEqual({ self: true, canEdit: true, person: null });
  });

  it("viewers look at teammates' codes; editors and owners change them", () => {
    const asViewer = [person("kim", "owner"), person("me", "viewer", true)];
    expect(accessTo(asViewer, "me", "kim")).toEqual({
      self: false,
      canEdit: false,
      person: asViewer[0],
    });
    const asEditor = [person("kim", "owner"), person("me", "editor", true)];
    expect(accessTo(asEditor, "me", "kim")?.canEdit).toBe(true);
    const asOwner = [person("me", "owner", true), person("leo", "viewer")];
    expect(accessTo(asOwner, "me", "leo")?.canEdit).toBe(true);
  });

  it("nobody outside your team, and nobody at all when you're on your own", () => {
    expect(
      accessTo([person("kim", "owner"), person("me", "editor", true)], "me", "ned"),
    ).toBeNull();
    expect(accessTo([], "me", "kim")).toBeNull();
  });

  it("names people by name, or by email when they haven't set one", () => {
    expect(personLabel({ name: " Kim ", email: "kim@example.com" })).toBe("Kim");
    expect(personLabel({ name: null, email: "leo@example.com" })).toBe("leo@example.com");
  });

  it("reads my_team rows", () => {
    expect(
      toTeam([
        {
          user_id: "kim",
          email: "kim@example.com",
          name: "Kim",
          avatar_url: null,
          role: "owner",
          is_me: false,
        },
      ]),
    ).toEqual([
      {
        userId: "kim",
        email: "kim@example.com",
        name: "Kim",
        avatarUrl: null,
        role: "owner",
        isMe: false,
      },
    ]);
  });
});

describe("firstName", () => {
  it("uses the first word of a name, or the email's name part", () => {
    expect(firstName({ name: "  Alex  Rivera ", email: "a@example.com" })).toBe("Alex");
    expect(firstName({ name: null, email: "sam.lee@example.com" })).toBe("sam.lee");
    expect(firstName({ name: " ", email: "kim@example.com" })).toBe("kim");
  });
});

describe("codesScope", () => {
  const team = [person("kim", "owner"), person("me", "viewer", true)];

  it("shows your own codes on your own, and for anyone you can't see", () => {
    expect(codesScope([], "me", { workspace: null, view: "everyone" })).toEqual({ kind: "self" });
    expect(codesScope([], "me", { workspace: "kim", view: null })).toEqual({ kind: "self" });
    expect(codesScope(team, "me", { workspace: "stranger", view: null })).toEqual({ kind: "self" });
    expect(codesScope(team, "me", { workspace: "me", view: null })).toEqual({ kind: "self" });
  });

  it("opens a teammate's codes with what you may do there", () => {
    expect(codesScope(team, "me", { workspace: "kim", view: null })).toEqual({
      kind: "person",
      person: team[0],
      canEdit: false,
    });
  });

  it("shows Everyone, where viewers change only their own codes", () => {
    expect(codesScope(team, "me", { workspace: null, view: "everyone" })).toEqual({
      kind: "everyone",
      canEditOthers: false,
    });
    const asOwner = [person("me", "owner", true), person("leo", "viewer")];
    expect(codesScope(asOwner, "me", { workspace: "leo", view: "everyone" })).toEqual({
      kind: "everyone",
      canEditOthers: true,
    });
  });
});
