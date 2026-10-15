import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { SocialItem } from "@/lib/pages/types";

import { SocialsField, type ErrorsApi } from "./fields";

const errors: ErrorsApi = { error: () => undefined, touch: vi.fn(), reorder: vi.fn() };

function Harness({ initial, max = 16 }: { initial: SocialItem[]; max?: number }) {
  const [items, setItems] = useState(initial);
  return <SocialsField items={items} onChange={setItems} max={max} errors={errors} />;
}

describe("SocialsField", () => {
  it("adds a profile from its icon, with the cursor in its address", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[]} />);
    await user.click(screen.getByRole("button", { name: "Add Instagram" }));
    expect(screen.getByLabelText("Instagram")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Add TikTok" }));
    expect(screen.getByLabelText("TikTok")).toHaveFocus();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Edit Instagram" })).toBeInTheDocument();
  });

  it("goes to a network that's already there instead of adding it twice", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ network: "instagram", url: "@me" }]} />);
    await user.click(screen.getByRole("button", { name: "Edit Instagram" }));
    expect(screen.getByLabelText("Instagram")).toHaveFocus();
    expect(screen.getAllByLabelText("Instagram")).toHaveLength(1);
  });

  it("stops adding at the limit", () => {
    render(<Harness initial={[{ network: "instagram", url: "@me" }]} max={1} />);
    expect(screen.getByRole("button", { name: "Add TikTok" })).toBeDisabled();
    expect(screen.getByText("You can add up to 1 profile.")).toBeInTheDocument();
  });
});
