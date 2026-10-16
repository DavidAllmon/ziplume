import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";

import type { QrCodeRow } from "@/types/supabase";

import {
  createCodes,
  createCodeWithSettings,
  duplicateCode,
  updateCodeWithSettings,
  type NewCode,
} from "./api";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ rpc, from }) }));

const row = { id: "c1", name: "Poster" };
const base: NewCode = {
  name: "Poster",
  qrType: "url",
  content: { url: "" },
  design: DEFAULT_DESIGN,
};
const link = { destination: "https://example.com" };

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
});

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

  it("sends Private only when it's on", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    await createCodeWithSettings({ ...base, isPrivate: true });
    expect(rpc.mock.lastCall![1].p_code).toMatchObject({ is_private: true });
    await createCodeWithSettings(base);
    expect(rpc.mock.lastCall![1].p_code).not.toHaveProperty("is_private");
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

describe("createCodes", () => {
  it("reports each saved batch, so a save that stops partway can resume with the rest", async () => {
    const insert = vi.fn((rows: { name: string }[]) => ({
      select: async () => ({
        data: rows.map((row) => ({ id: `id-${row.name}`, name: row.name })),
        error: null,
      }),
    }));
    from.mockReturnValue({ insert });
    const inputs = Array.from({ length: 150 }, (_, i) => ({ ...base, name: `Code ${i + 1}` }));
    const onProgress = vi.fn();
    const result = await createCodes(inputs, onProgress);
    expect(result.ok && result.value).toHaveLength(150);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0]![0]).toBe(100);
    expect(onProgress.mock.calls[0]![1]).toHaveLength(100);
    expect(onProgress.mock.calls[1]![0]).toBe(150);
    expect(onProgress.mock.calls[1]![1]).toHaveLength(50);
    expect(onProgress.mock.calls[1]![1][0]).toMatchObject({ name: "Code 101" });
  });
});

describe("duplicateCode", () => {
  it("copies a code into your own codes, keeping its folder only when asked", async () => {
    const insert = vi.fn((row: Record<string, unknown>) => ({
      select: () => ({ single: async () => ({ data: { id: "copy", ...row }, error: null }) }),
    }));
    from.mockReturnValue({ insert });
    const teammate = {
      id: "c1",
      user_id: "kim",
      folder_id: "f-kim",
      name: "Menu",
      qr_type: "text",
      content: { text: "hi" },
      design: {},
      is_dynamic: false,
      destination: null,
    } as unknown as QrCodeRow;
    await duplicateCode(teammate, { keepFolder: false });
    expect(insert.mock.calls[0]![0]).not.toHaveProperty("user_id");
    expect(insert.mock.calls[0]![0]).not.toHaveProperty("folder_id");
    await duplicateCode(teammate, { keepFolder: true });
    expect(insert.mock.calls[1]![0]).toMatchObject({ folder_id: "f-kim" });
  });

  it("copies a private code as private", async () => {
    const insert = vi.fn((row: Record<string, unknown>) => ({
      select: () => ({ single: async () => ({ data: { id: "copy", ...row }, error: null }) }),
    }));
    from.mockReturnValue({ insert });
    const mine = {
      id: "c2",
      user_id: "me",
      folder_id: null,
      name: "Diary",
      qr_type: "text",
      content: { text: "hi" },
      design: {},
      is_dynamic: false,
      destination: null,
      is_private: true,
    } as unknown as QrCodeRow;
    await duplicateCode(mine, { keepFolder: true });
    expect(insert.mock.calls[0]![0]).toMatchObject({ is_private: true });
  });
});

describe("updateCodeWithSettings", () => {
  it("sends only the changed fields, by column name, with the password action", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    const result = await updateCodeWithSettings("c1", {
      name: "Lunch menu",
      destination: "https://example.com/lunch",
      content: { url: "https://example.com/lunch" },
      folderId: null,
      activeFrom: "2030-01-01T09:00:00.000Z",
    });
    expect(result).toEqual({ ok: true, value: row });
    expect(rpc).toHaveBeenCalledWith("update_code", {
      p_id: "c1",
      p_patch: {
        name: "Lunch menu",
        destination: "https://example.com/lunch",
        content: { url: "https://example.com/lunch" },
        folder_id: null,
        active_from: "2030-01-01T09:00:00.000Z",
      },
      p_password: null,
      p_password_action: "keep",
    });
  });

  it("sends a change to Private by column name", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    await updateCodeWithSettings("c1", { isPrivate: false });
    expect(rpc.mock.lastCall![1].p_patch).toEqual({ is_private: false });
  });

  it("sends a new password, or asks to clear it", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    await updateCodeWithSettings("c1", {}, { action: "set", password: "open sesame" });
    expect(rpc).toHaveBeenLastCalledWith("update_code", {
      p_id: "c1",
      p_patch: {},
      p_password: "open sesame",
      p_password_action: "set",
    });
    await updateCodeWithSettings("c1", {}, { action: "clear" });
    expect(rpc).toHaveBeenLastCalledWith("update_code", {
      p_id: "c1",
      p_patch: {},
      p_password: null,
      p_password_action: "clear",
    });
  });

  it("explains what went wrong", async () => {
    const failWith = async (code: string, message = "") => {
      rpc.mockResolvedValueOnce({ data: null, error: { code, message } });
      const result = await updateCodeWithSettings("c1", { name: "x" });
      return result.ok ? null : result.error;
    };
    expect(await failWith("23505")).toBe("That link ending is already taken. Try another.");
    expect(await failWith("23503")).toBe("That folder isn't in this code's space.");
    expect(await failWith("22023", "Passwords are 4 to 128 characters")).toBe(
      "Passwords are 4 to 128 characters.",
    );
    expect(await failWith("23514", 'violates check constraint "qr_codes_active_window"')).toBe(
      "The end date must be after the start date.",
    );
    expect(await failWith("42501", "Not allowed")).toBe("You can't change this code.");
    expect(await failWith("XX000", "boom")).toBe(
      "Your changes couldn't be saved. Please try again.",
    );
  });

  it("refuses a malformed link ending before asking the server", async () => {
    const result = await updateCodeWithSettings("c1", { slug: "no spaces" });
    expect(result).toEqual({
      ok: false,
      error: "Link endings use 3–40 letters, numbers or dashes.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
