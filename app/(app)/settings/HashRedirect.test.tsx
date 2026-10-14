import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HashRedirect } from "./HashRedirect";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("HashRedirect", () => {
  it("sends old /account#api-keys links to the API keys tab", () => {
    window.location.hash = "#api-keys";
    render(<HashRedirect />);
    expect(replace).toHaveBeenCalledWith("/settings/api-keys");
    window.location.hash = "";
  });
});
