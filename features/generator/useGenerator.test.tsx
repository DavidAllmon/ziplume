import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as CodesApi from "@/features/codes/api";
import { createCode } from "@/features/codes/api";

import { useGenerator } from "./useGenerator";

// The address bar, as useSearchParams sees it. Tests change it and rerender.
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => search }));

vi.mock("@/features/codes/api", async (original) => ({
  ...(await original<typeof CodesApi>()),
  createCode: vi.fn(),
}));
// Real scan checks render to a canvas, which jsdom does not have.
vi.mock("./preview/useScanVerification", () => ({ useScanVerification: () => null }));

beforeEach(() => {
  search = new URLSearchParams();
  vi.mocked(createCode).mockReset();
});

describe("useGenerator", () => {
  it("new codes always save to your own account, whatever ?workspace= says", async () => {
    search = new URLSearchParams("workspace=owner-1");
    const { result } = renderHook(() => useGenerator());
    await act(async () => {});
    expect(result.current.workspace).toBeNull();
  });

  it("opens a new code of the type in ?type= (the Codes page's quick starts)", async () => {
    search = new URLSearchParams("type=wifi");
    const { result } = renderHook(() => useGenerator());
    await waitFor(() => expect(result.current.state.activeType).toBe("wifi"));
  });

  it("saving a new code reports its id, for opening its page", async () => {
    vi.mocked(createCode).mockResolvedValue({
      ok: true,
      value: { id: "new-1", name: "Poster" },
    } as never);
    const { result } = renderHook(() => useGenerator());
    act(() => result.current.setField("url", "url", "example.com"));
    let outcome: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      outcome = await result.current.save("Poster");
    });
    expect(outcome).toEqual({ ok: true, id: "new-1", message: "Saved “Poster” to your codes." });
    expect(result.current).not.toHaveProperty("saved");
  });

  it("ignores the old ?edit= address (it is forwarded before the page loads)", async () => {
    search = new URLSearchParams("edit=abc");
    const { result } = renderHook(() => useGenerator());
    await act(async () => {});
    expect(result.current.state.content.url.url).toBe("");
  });
});
