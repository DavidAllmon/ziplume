import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OneAtATime } from "./OneAtATime";

describe("OneAtATime", () => {
  it("pauses the other players when one starts", () => {
    const { container } = render(
      <>
        <OneAtATime />
        <audio data-testid="a" />
        <audio data-testid="b" />
        <video data-testid="c" />
      </>,
    );
    const [a, b, c] = container.querySelectorAll<HTMLMediaElement>("audio, video");
    for (const el of [a!, b!, c!]) el.pause = vi.fn();
    fireEvent.play(b!);
    expect(a!.pause).toHaveBeenCalled();
    expect(c!.pause).toHaveBeenCalled();
    expect(b!.pause).not.toHaveBeenCalled();
  });
});
