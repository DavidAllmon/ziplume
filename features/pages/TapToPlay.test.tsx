import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { videoEmbed } from "@/lib/pages/urls";

import { TapToPlay } from "./TapToPlay";

describe("TapToPlay", () => {
  it("moves focus to the player it loads, so a screen reader keeps its place", async () => {
    const user = userEvent.setup();
    const embed = videoEmbed("https://www.tiktok.com/@cafe/video/7234567890123456789")!;
    const { container } = render(<TapToPlay src={embed.src} name={embed.name} title="Clip" />);
    await user.click(screen.getByRole("button", { name: "Tap to play from TikTok" }));
    expect(container.querySelector("iframe")).toHaveFocus();
  });

  it("holds a player of a set height until it's tapped", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TapToPlay
        src="https://open.spotify.com/embed/track/x"
        name="Spotify"
        title="Song"
        height={152}
      />,
    );
    const button = screen.getByRole("button", { name: "Tap to play from Spotify" });
    expect(button).toHaveStyle({ height: "152px" });
    await user.click(button);
    expect(container.querySelector("iframe")).toHaveAttribute("height", "152");
  });
});
