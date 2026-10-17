import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { videoEmbed } from "@/lib/pages/urls";

import { TapToPlay } from "./TapToPlay";

describe("TapToPlay", () => {
  it("moves focus to the player it loads, so a screen reader keeps its place", async () => {
    const user = userEvent.setup();
    const embed = videoEmbed("https://www.tiktok.com/@cafe/video/7234567890123456789")!;
    const { container } = render(<TapToPlay embed={embed} title="Clip" />);
    await user.click(screen.getByRole("button", { name: "Tap to play from TikTok" }));
    expect(container.querySelector("iframe")).toHaveFocus();
  });
});
