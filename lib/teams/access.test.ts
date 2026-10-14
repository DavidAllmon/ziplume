import { describe, expect, it } from "vitest";

import { accessTo, personLabel, toTeam, type TeamPerson } from "./access";

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
