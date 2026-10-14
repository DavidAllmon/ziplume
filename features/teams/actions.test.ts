// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthState } from "@/lib/auth/server";
import { emailConfigured, sendEmail } from "@/lib/email/brevo";

import { removeMember, resendInvite, sendInvites } from "./actions";
import { copyPageMedia } from "./media";

vi.mock("@/lib/auth/server", () => ({ getAuthState: vi.fn() }));
vi.mock("@/lib/email/brevo", () => ({ emailConfigured: vi.fn(), sendEmail: vi.fn() }));
vi.mock("./media", () => ({ copyPageMedia: vi.fn() }));

const TOKEN = "b".repeat(48);
const EXPIRES = "2026-10-28T12:00:00Z";
type Role = "editor" | "viewer";
interface FakeInvite {
  id: string;
  email: string;
  role: Role;
  token: string;
  expires_at: string;
}

/** Just enough of the Supabase client for the invite actions, recording what they did. */
function fakeSupabase({
  members = [] as string[],
  pending = [] as FakeInvite[],
  recordError = null as { message: string } | null,
  team = [] as unknown[],
  removed = { codes: 0, folders: 0 },
  removeError = null as { message: string } | null,
  updateError = null as { message: string } | null,
} = {}) {
  const inserted: { email: string; role: Role }[] = [];
  const deleted: string[] = [];
  /** Every call in order, so tests can check what happened before what. */
  const calls: string[] = [];
  const updated: { id: string; value: unknown }[] = [];
  const recorded: string[] = [];

  function table(name: string) {
    let op: "select" | "insert" | "delete" | "update" = "select";
    let change: unknown = null;
    let row: { email: string; role: Role } | null = null;
    let id: string | null = null;
    const result = () => {
      if (name === "profiles")
        return { data: { display_name: "David", avatar_url: null }, error: null };
      if (op === "insert" && row) {
        inserted.push(row);
        return {
          data: { id: `id-${row.email}`, ...row, token: TOKEN, expires_at: EXPIRES },
          error: null,
        };
      }
      if (op === "update") {
        calls.push(`update ${id}`);
        if (!updateError && id) updated.push({ id, value: change });
        return { data: null, error: updateError };
      }
      if (op === "delete") {
        if (id) deleted.push(id);
        return { data: null, error: null };
      }
      if (id) return { data: pending.find((p) => p.id === id) ?? null, error: null };
      return { data: pending, error: null };
    };
    const builder = {
      select: () => builder,
      insert: (value: { email: string; role: Role }) => {
        op = "insert";
        row = value;
        return builder;
      },
      delete: () => {
        op = "delete";
        return builder;
      },
      update: (value: unknown) => {
        op = "update";
        change = value;
        return builder;
      },
      eq: (column: string, value: string) => {
        if (column === "id") id = value;
        return builder;
      },
      is: () => builder,
      gt: () => builder,
      single: async () => result(),
      maybeSingle: async () => result(),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result()).then(resolve, reject),
    };
    return builder;
  }

  const client = {
    from: vi.fn(table),
    rpc: vi.fn(async (fn: string, args?: { p_invite: string }) => {
      if (fn === "team_overview") return { data: members.map((email) => ({ email })), error: null };
      if (fn === "record_invite_send") {
        if (!recordError) recorded.push(args!.p_invite);
        return { data: null, error: recordError };
      }
      if (fn === "my_team") return { data: team, error: null };
      if (fn === "remove_member") calls.push("remove_member");
      if (fn === "remove_member")
        return removeError ? { data: null, error: removeError } : { data: removed, error: null };
      throw new Error(`Unexpected rpc ${fn}`);
    }),
  };
  return { client, inserted, deleted, recorded, calls, updated };
}

function signIn(fake: ReturnType<typeof fakeSupabase>) {
  vi.mocked(getAuthState).mockResolvedValue({
    supabase: fake.client,
    user: { id: "owner-1", email: "david@example.com" },
    needsMfa: false,
  } as never);
}

beforeEach(() => {
  vi.mocked(emailConfigured).mockReturnValue(true);
  vi.mocked(sendEmail).mockReset().mockResolvedValue({ ok: true });
});

describe("sendInvites", () => {
  it("emails each new address once and reports it", async () => {
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({
      emails: "Sam@cafe.com, lee@cafe.com\nsam@cafe.com",
      role: "editor",
      email: true,
    });
    expect(result).toEqual({
      outcomes: [
        { email: "Sam@cafe.com", token: TOKEN, status: "sent" },
        { email: "lee@cafe.com", token: TOKEN, status: "sent" },
      ],
    });
    expect(fake.inserted).toEqual([
      { email: "Sam@cafe.com", role: "editor" },
      { email: "lee@cafe.com", role: "editor" },
    ]);
    expect(fake.recorded).toEqual(["id-Sam@cafe.com", "id-lee@cafe.com"]);
    expect(vi.mocked(sendEmail).mock.calls[0]![0]).toMatchObject({
      to: "Sam@cafe.com",
      subject: "David invited you to their QuickQReate codes",
      replyTo: { email: "david@example.com", name: "David" },
    });
  });

  it("gives links instead when this server can't send email", async () => {
    vi.mocked(emailConfigured).mockReturnValue(false);
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({ emails: "sam@cafe.com", role: "viewer", email: true });
    expect(result.outcomes).toEqual([{ email: "sam@cafe.com", token: TOKEN, status: "link" }]);
    expect(fake.recorded).toEqual([]);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("only makes links when asked to share a link", async () => {
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({ emails: "sam@cafe.com", role: "viewer", email: false });
    expect(result.outcomes).toEqual([{ email: "sam@cafe.com", token: TOKEN, status: "link" }]);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("keeps the link and explains when a sending limit is reached", async () => {
    const fake = fakeSupabase({
      recordError: { message: "You have sent 20 invites in the last hour" },
    });
    signIn(fake);
    const result = await sendInvites({ emails: "sam@cafe.com", role: "editor", email: true });
    expect(result.outcomes[0]).toEqual({
      email: "sam@cafe.com",
      token: TOKEN,
      status: "link",
      message: "You have sent 20 invites in the last hour. Share the link instead.",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("keeps the link when Brevo refuses the email", async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "brevo-401" });
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({ emails: "sam@cafe.com", role: "editor", email: true });
    expect(result.outcomes[0]).toEqual({
      email: "sam@cafe.com",
      token: TOKEN,
      status: "failed",
      message: "The email couldn’t be sent. Share the link instead.",
    });
  });

  it("stops emailing after the first failed send and gives links for the rest", async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "network" });
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({
      emails: "a@cafe.com, b@cafe.com, c@cafe.com",
      role: "viewer",
      email: true,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(fake.recorded).toEqual(["id-a@cafe.com"]);
    expect(result.outcomes.map((o) => o.status)).toEqual(["failed", "link", "link"]);
    expect(result.outcomes[1]).toMatchObject({
      token: TOKEN,
      message: "Email isn’t working right now. Share the link instead.",
    });
  });

  it("reuses a pending invite for the same address, and replaces one with another role", async () => {
    const fake = fakeSupabase({
      pending: [
        { id: "p1", email: "sam@cafe.com", role: "editor", token: TOKEN, expires_at: EXPIRES },
        { id: "p2", email: "lee@cafe.com", role: "viewer", token: TOKEN, expires_at: EXPIRES },
      ],
    });
    signIn(fake);
    await sendInvites({ emails: "SAM@cafe.com lee@cafe.com", role: "editor", email: true });
    expect(fake.inserted).toEqual([{ email: "lee@cafe.com", role: "editor" }]);
    expect(fake.deleted).toEqual(["p2"]);
    expect(fake.recorded).toEqual(["p1", "id-lee@cafe.com"]);
  });

  it("checks the request before saving anything", async () => {
    const fake = fakeSupabase({ members: ["lee@cafe.com"] });
    signIn(fake);
    expect(await sendInvites({ emails: "nope", role: "editor", email: true })).toEqual({
      error: "“nope” isn’t an email address.",
      outcomes: [],
    });
    expect(
      (await sendInvites({ emails: "LEE@cafe.com", role: "editor", email: true })).error,
    ).toMatch(/already on your team/);
    expect(
      (await sendInvites({ emails: "a@b.co", role: "owner" as Role, email: true })).error,
    ).toBe("Choose Editor or Viewer.");
    expect(fake.inserted).toEqual([]);
  });

  it("asks you to sign in again when the session has ended", async () => {
    vi.mocked(getAuthState).mockResolvedValue({
      supabase: {},
      user: null,
      needsMfa: false,
    } as never);
    expect(await sendInvites({ emails: "a@b.co", role: "editor", email: true })).toEqual({
      error: "Your session has expired. Sign in again.",
      outcomes: [],
    });
  });
});

describe("resendInvite", () => {
  it("emails a pending invite again", async () => {
    const fake = fakeSupabase({
      pending: [
        { id: "p1", email: "sam@cafe.com", role: "viewer", token: TOKEN, expires_at: EXPIRES },
      ],
    });
    signIn(fake);
    expect(await resendInvite("p1")).toEqual({
      outcomes: [{ email: "sam@cafe.com", token: TOKEN, status: "sent" }],
    });
    expect(fake.recorded).toEqual(["p1"]);
  });

  it("says when the invite has ended", async () => {
    signIn(fakeSupabase());
    expect(await resendInvite("gone")).toEqual({
      error: "That invite has ended. Create a new one.",
      outcomes: [],
    });
  });
});

const OWNER_ROW = {
  user_id: "owner-1",
  email: "david@example.com",
  name: "David",
  avatar_url: null,
  role: "owner",
  is_me: true,
};
const SAM_ROW = {
  user_id: "m1",
  email: "sam@cafe.com",
  name: "Sam",
  avatar_url: null,
  role: "editor",
  is_me: false,
};

describe("sendInvites from a member", () => {
  it("refuses: only the team owner can invite people", async () => {
    const fake = fakeSupabase({
      team: [
        { ...OWNER_ROW, is_me: false },
        { ...SAM_ROW, user_id: "owner-1", is_me: true },
      ],
    });
    signIn(fake);
    const result = await sendInvites({ emails: "lee@cafe.com", role: "viewer", email: true });
    expect(result).toEqual({ error: "Only the team owner can invite people.", outcomes: [] });
    expect(fake.inserted).toEqual([]);
  });
});

describe("removeMember", () => {
  beforeEach(() => vi.mocked(copyPageMedia).mockReset());

  it("keeping their codes copies page images first, then moves the codes", async () => {
    const fake = fakeSupabase({ team: [OWNER_ROW, SAM_ROW], removed: { codes: 3, folders: 1 } });
    signIn(fake);
    vi.mocked(copyPageMedia).mockResolvedValue({
      ok: true,
      pages: [],
      renamed: {},
      files: 2,
      missing: 0,
    });
    expect(await removeMember("m1", true)).toEqual({ codes: 3, folders: 1 });
    expect(copyPageMedia).toHaveBeenCalledWith("m1", "owner-1");
    expect(fake.client.rpc).toHaveBeenCalledWith("remove_member", {
      p_member: "m1",
      p_keep_codes: true,
    });
  });

  it("if a page image can't be copied, nobody is removed", async () => {
    const fake = fakeSupabase({ team: [OWNER_ROW, SAM_ROW] });
    signIn(fake);
    vi.mocked(copyPageMedia).mockResolvedValue({
      ok: false,
      error: "Their page images couldn’t be copied, so nobody was removed. Please try again.",
    });
    expect(await removeMember("m1", true)).toEqual({
      error: "Their page images couldn’t be copied, so nobody was removed. Please try again.",
    });
    expect(fake.client.rpc).not.toHaveBeenCalledWith("remove_member", expect.anything());
  });

  it("letting them take their codes copies nothing", async () => {
    const fake = fakeSupabase({ team: [OWNER_ROW, SAM_ROW] });
    signIn(fake);
    expect(await removeMember("m1", false)).toEqual({ codes: 0, folders: 0 });
    expect(copyPageMedia).not.toHaveBeenCalled();
  });

  it("explains a folder name clash, and only owners can remove people", async () => {
    const clash = fakeSupabase({
      team: [OWNER_ROW, SAM_ROW],
      removeError: {
        message: 'duplicate key value violates unique constraint "folders_user_name"',
      },
    });
    signIn(clash);
    vi.mocked(copyPageMedia).mockResolvedValue({
      ok: true,
      pages: [],
      renamed: {},
      files: 0,
      missing: 0,
    });
    expect(await removeMember("m1", true)).toEqual({
      error: "One of their folders has the same name as one of yours. Rename it and try again.",
    });
    const member = fakeSupabase({
      team: [
        { ...OWNER_ROW, is_me: false },
        { ...SAM_ROW, is_me: true },
      ],
    });
    signIn(member);
    expect(await removeMember("owner-1", false)).toEqual({
      error: "Only the team owner can remove people.",
    });
  });
});

describe("removeMember and page images", () => {
  const M = "3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a";
  const O = "3b3b3b3b-3b3b-4b3b-8b3b-3b3b3b3b3b3b";
  const PAGE = {
    id: "p1",
    content: { logo: { path: `${M}/a.png`, name: "a.png", type: "image/png", size: 1 } },
  };
  const COPIED = {
    ok: true as const,
    pages: [PAGE],
    renamed: { [`${M}/a.png`]: `${O}/a.png` },
    files: 1,
    missing: 0,
  };
  beforeEach(() => vi.mocked(copyPageMedia).mockReset());

  it("repoints moved pages at the copies only after the codes have moved", async () => {
    const fake = fakeSupabase({ team: [OWNER_ROW, SAM_ROW], removed: { codes: 1, folders: 0 } });
    signIn(fake);
    vi.mocked(copyPageMedia).mockResolvedValue(COPIED);
    expect(await removeMember("m1", true)).toEqual({ codes: 1, folders: 0 });
    expect(fake.calls).toEqual(["remove_member", "update p1"]);
    expect(fake.updated[0]!.value).toEqual({
      content: { logo: { path: `${O}/a.png`, name: "a.png", type: "image/png", size: 1 } },
    });
  });

  it("if the codes can't move, no page is repointed", async () => {
    const fake = fakeSupabase({
      team: [OWNER_ROW, SAM_ROW],
      removeError: { message: "connection lost" },
    });
    signIn(fake);
    vi.mocked(copyPageMedia).mockResolvedValue(COPIED);
    expect((await removeMember("m1", true)).error).toBe(
      "They couldn’t be removed. Please try again.",
    );
    expect(fake.updated).toEqual([]);
  });

  it("says when a page couldn't be repointed, or files were already gone", async () => {
    const fake = fakeSupabase({
      team: [OWNER_ROW, SAM_ROW],
      removed: { codes: 1, folders: 0 },
      updateError: { message: "boom" },
    });
    signIn(fake);
    vi.mocked(copyPageMedia).mockResolvedValue({ ...COPIED, missing: 2 });
    expect(await removeMember("m1", true)).toEqual({
      codes: 1,
      folders: 0,
      warning:
        "1 page still uses images from their account, and 2 files were already missing. Open those pages and add the images again.",
    });
  });
});
