import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type * as Env from "@/lib/env";

import { initialState } from "../state/defaults";
import { HostedPageForm } from "./HostedPageForm";
import type { ContentEditor } from "./types";

vi.mock("@/lib/env", async (original) => ({
  ...(await original<typeof Env>()),
  accountsEnabled: true,
}));
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => ({ user: { id: "user-1" }, loading: false }),
}));

const editor = (overrides: Partial<ContentEditor> = {}): ContentEditor => ({
  state: { ...initialState(), activeType: "links" },
  setField: vi.fn(),
  setPage: vi.fn(),
  pageErrors: {},
  workspace: null,
  ...overrides,
});

describe("HostedPageForm", () => {
  it("keeps the page color under the form where there's no Look tab (the home page)", () => {
    render(<HostedPageForm generator={editor()} type="links" />);
    expect(screen.getByText("Page color")).toBeInTheDocument();
  });

  it("leaves the page color to the editor's Look tab", () => {
    render(<HostedPageForm generator={editor({ pageColorInLook: true })} type="links" />);
    expect(screen.queryByText("Page color")).toBeNull();
  });
});
