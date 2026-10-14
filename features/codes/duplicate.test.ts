import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QrCodeRow } from "@/types/supabase";

import { duplicateCode } from "./api";
import { copyCodeMedia } from "./copyMedia";
import { copyToMyCodes } from "./duplicate";

vi.mock("./api", () => ({ duplicateCode: vi.fn() }));
vi.mock("./copyMedia", () => ({ copyCodeMedia: vi.fn() }));

const page = { id: "p1", qr_type: "links", content: { title: "Links" } } as unknown as QrCodeRow;
const link = {
  id: "l1",
  qr_type: "url",
  content: { url: "https://x.example" },
} as unknown as QrCodeRow;

beforeEach(() => {
  vi.mocked(duplicateCode)
    .mockReset()
    .mockResolvedValue({ ok: true, value: { id: "copy" } as QrCodeRow });
  vi.mocked(copyCodeMedia).mockReset();
});

describe("copyToMyCodes", () => {
  it("copies your own code into its folder, without touching files", async () => {
    await copyToMyCodes(page, { fromTeammate: false });
    expect(copyCodeMedia).not.toHaveBeenCalled();
    expect(duplicateCode).toHaveBeenCalledWith(page, { keepFolder: true });
  });

  it("gives a teammate's hosted page its own copies of the files", async () => {
    vi.mocked(copyCodeMedia).mockResolvedValue({ ok: true, content: { title: "Links (copied)" } });
    await copyToMyCodes(page, { fromTeammate: true });
    expect(duplicateCode).toHaveBeenCalledWith(
      { ...page, content: { title: "Links (copied)" } },
      { keepFolder: false },
    );
  });

  it("stops when the files can't be copied", async () => {
    vi.mocked(copyCodeMedia).mockResolvedValue({
      ok: false,
      error: "Sign in again, then try once more.",
    });
    expect(await copyToMyCodes(page, { fromTeammate: true })).toEqual({
      ok: false,
      error: "Sign in again, then try once more.",
    });
    expect(duplicateCode).not.toHaveBeenCalled();
  });

  it("copies a teammate's link without its folder", async () => {
    await copyToMyCodes(link, { fromTeammate: true });
    expect(copyCodeMedia).not.toHaveBeenCalled();
    expect(duplicateCode).toHaveBeenCalledWith(link, { keepFolder: false });
  });
});
