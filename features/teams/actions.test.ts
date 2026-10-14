// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthState } from "@/lib/auth/server";
import { emailConfigured, sendEmail } from "@/lib/email/brevo";

import { resendInvite, sendInvites } from "./actions";

vi.mock("@/lib/auth/server", () => ({ getAuthState: vi.fn() }));
vi.mock("@/lib/email/brevo", () => ({ emailConfigured: vi.fn(), sendEmail: vi.fn() }));

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
} = {}) {
  const inserted: { email: string; role: Role }[] = [];
  const deleted: string[] = [];
  const recorded: string[] = [];

  function table(name: string) {
    let op: "select" | "insert" | "delete" = "select";
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
      throw new Error(`Unexpected rpc ${fn}`);
    }),
  };
  return { client, inserted, deleted, recorded };
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
