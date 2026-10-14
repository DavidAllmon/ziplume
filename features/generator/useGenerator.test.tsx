import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as CodesApi from "@/features/codes/api";
import { updateCode } from "@/features/codes/api";
import { editableWorkspace, type Workspace } from "@/features/teams/workspace";

import { useGenerator } from "./useGenerator";

// The address bar, as useSearchParams sees it. Tests change it and rerender.
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => search }));

const USER_ID = "user-1";
const codes: Record<string, ReturnType<typeof savedCode>> = {};
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => ({ data: codes[id] ?? null }),
        }),
      }),
    }),
    auth: { getSession: async () => ({ data: { session: { user: { id: USER_ID } } } }) },
  }),
}));

vi.mock("@/features/codes/api", async (original) => ({
  ...(await original<typeof CodesApi>()),
  createCode: vi.fn(),
  updateCode: vi.fn(),
}));
vi.mock("@/features/teams/workspace", () => ({ editableWorkspace: vi.fn() }));
// Real scan checks render to a canvas, which jsdom does not have.
vi.mock("./preview/useScanVerification", () => ({ useScanVerification: () => null }));

/** A promise the test resolves when it wants the "network" to answer. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function savedCode(id: string, userId = USER_ID) {
  return {
    id,
    user_id: userId,
    name: `Code ${id}`,
    qr_type: "url",
    content: { url: `https://example.com/${id}` },
    design: {},
    is_dynamic: true,
    slug: `slug-${id}`,
    destination: `https://example.com/${id}`,
  };
}

const TEAM: Workspace = { ownerId: "owner-1", label: "Cafe team", role: "editor" };

beforeEach(() => {
  search = new URLSearchParams();
  for (const id of Object.keys(codes)) delete codes[id];
  vi.mocked(updateCode).mockReset();
  vi.mocked(editableWorkspace).mockReset();
});

describe("useGenerator: answers that arrive after you moved on", () => {
  it("a save that finishes after New code does not reopen the old code", async () => {
    codes.a = savedCode("a");
    search = new URLSearchParams("edit=a");
    const { result } = renderHook(() => useGenerator());
    await waitFor(() => expect(result.current.saved?.id).toBe("a"));

    const update = deferred<Awaited<ReturnType<typeof updateCode>>>();
    vi.mocked(updateCode).mockReturnValue(update.promise);
    let saving!: Promise<unknown>;
    act(() => {
      saving = result.current.save("Renamed");
    });
    act(() => result.current.startNew());
    await act(async () => {
      update.resolve({ ok: true, value: { ...codes.a, name: "Renamed" } } as never);
      await saving;
    });

    expect(result.current.saved).toBeNull();
    expect(result.current.state.content.url.url).toBe("");
  });

  it("a teammate's code that finishes loading after you left is not opened", async () => {
    codes.b = savedCode("b", "owner-1");
    const lookup = deferred<Workspace | null>();
    vi.mocked(editableWorkspace).mockReturnValue(lookup.promise);
    search = new URLSearchParams("edit=b");
    const { result, rerender } = renderHook(() => useGenerator());
    await waitFor(() => expect(editableWorkspace).toHaveBeenCalledWith("owner-1"));

    // The logo is clicked while the workspace lookup is still running.
    search = new URLSearchParams();
    rerender();
    await act(async () => {
      lookup.resolve(TEAM);
      await lookup.promise;
    });

    expect(result.current.saved).toBeNull();
    expect(result.current.workspace).toBeNull();
    expect(result.current.state.content.url.url).toBe("");
  });

  it("new codes always save to your own account, whatever ?workspace= says", async () => {
    search = new URLSearchParams("workspace=owner-1");
    const { result } = renderHook(() => useGenerator());
    await act(async () => {});
    expect(editableWorkspace).not.toHaveBeenCalled();
    expect(result.current.workspace).toBeNull();
  });
  it("opens a new code of the type in ?type= (the Codes page's quick starts)", async () => {
    search = new URLSearchParams("type=wifi");
    const { result } = renderHook(() => useGenerator());
    await waitFor(() => expect(result.current.state.activeType).toBe("wifi"));
  });
});
