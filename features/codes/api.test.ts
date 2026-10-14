import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";

import { createCodeWithSettings, type NewCode } from "./api";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ rpc }) }));

const row = { id: "c1", name: "Poster" };
const base: NewCode = {
  name: "Poster",
  qrType: "url",
  content: { url: "" },
  design: DEFAULT_DESIGN,
};
const link = { destination: "https://example.com" };

beforeEach(() => rpc.mockReset());

describe("createCodeWithSettings", () => {
  it("sends the code, its folder, dates and password in one call", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    const result = await createCodeWithSettings(
      { ...base, ownerId: "owner-1", folderId: "f1", dynamic: { ...link, slug: "SPRING" } },
      { password: "open sesame", activeFrom: "2030-01-01T09:00:00.000Z", activeUntil: null },
    );
    expect(result).toEqual({ ok: true, value: row });
    expect(rpc).toHaveBeenCalledWith("create_code", {
      p_code: expect.objectContaining({
        user_id: "owner-1",
        folder_id: "f1",
        name: "Poster",
        qr_type: "url",
        content: { url: "https://example.com" },
        is_dynamic: true,
        slug: "SPRING",
        destination: "https://example.com",
        active_from: "2030-01-01T09:00:00.000Z",
        active_until: null,
      }),
      p_password: "open sesame",
    });
  });

  it("sends a static code with no ending, destination or password", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    await createCodeWithSettings({ ...base, qrType: "text", content: { text: "Hi" } });
    expect(rpc).toHaveBeenCalledWith("create_code", {
      p_code: expect.objectContaining({
        is_dynamic: false,
        slug: null,
        destination: null,
        content: { text: "Hi" },
      }),
      p_password: null,
    });
  });

  it("picks a new random ending when one collides", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { code: "23505", message: "duplicate key" } })
      .mockResolvedValueOnce({ data: row, error: null });
    const result = await createCodeWithSettings({ ...base, dynamic: link });
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(2);
    const [first, second] = rpc.mock.calls.map(([, args]) => args.p_code.slug as string);
    expect(first).not.toBe(second);
  });

  it.each([
    [
      { code: "23505", message: "duplicate key" },
      "That link ending is already taken. Try another.",
    ],
    [
      { code: "23514", message: 'violates check constraint "qr_codes_active_window"' },
      "The end date must be after the start date.",
    ],
    [
      { code: "22023", message: "Passwords are 4 to 128 characters" },
      "Passwords are 4 to 128 characters.",
    ],
    [
      { code: "42501", message: "new row violates row-level security policy" },
      "You can't add codes to this workspace.",
    ],
    [
      { code: "08006", message: "connection failure" },
      "The code couldn't be saved. Please try again.",
    ],
  ])("explains %o", async (error, message) => {
    rpc.mockResolvedValue({ data: null, error });
    const result = await createCodeWithSettings({ ...base, dynamic: { ...link, slug: "MINE" } });
    expect(result).toEqual({ ok: false, error: message });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("refuses a malformed ending before asking the server", async () => {
    const result = await createCodeWithSettings({
      ...base,
      dynamic: { ...link, slug: "no spaces" },
    });
    expect(result).toEqual({
      ok: false,
      error: "Link endings use 3–40 letters, numbers or dashes.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
