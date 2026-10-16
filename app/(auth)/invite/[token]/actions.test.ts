// @vitest-environment node
import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { acceptInvite } from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ getServerSupabase: async () => ({ rpc }) }));

describe("acceptInvite", () => {
  it("opens your codes with the one-time joined tip", async () => {
    rpc.mockResolvedValue({ data: "owner-1", error: null });
    await acceptInvite("token");
    expect(redirect).toHaveBeenCalledWith("/codes?joined=1");
  });
});
