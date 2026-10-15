import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeviceFrame } from "./DeviceFrame";
import { outerSize } from "./devices";

/** jsdom has no layout: give boxes a width, and the height probe a height. */
function layout({ width, height = 0 }: { width: number; height?: number }) {
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockImplementation(function (this: Element) {
    return this.hasAttribute("data-frame-height") ? height : 0;
  });
}

/** The box the scaled frame takes up on the page. */
const footprint = () =>
  screen.getByRole("region", { name: "Page preview" }).parentElement!.parentElement as HTMLElement;

afterEach(() => vi.restoreAllMocks());

describe("DeviceFrame", () => {
  it("fits the box it's in from its first paint, before any resize is observed", () => {
    layout({ width: 200 });
    render(
      <DeviceFrame device="phone" address="ziplume.com/p/…">
        <p>Hi</p>
      </DeviceFrame>,
    );
    expect(footprint().style.width).toBe("200px");
  });

  it("fits a height given in CSS, like a share of the screen", () => {
    layout({ width: 1000, height: 300 });
    render(
      <DeviceFrame device="phone" address="ziplume.com/p/…" maxHeight="50dvh">
        <p>Hi</p>
      </DeviceFrame>,
    );
    expect(parseFloat(footprint().style.height)).toBeCloseTo(300);
    const phone = outerSize("phone");
    expect(parseFloat(footprint().style.width)).toBeCloseTo((phone.width * 300) / phone.height);
  });

  it("lets keyboard users scroll the screen, and shows no desktop scrollbar on it", () => {
    render(
      <DeviceFrame device="phone" address="ziplume.com/p/…">
        <p>Hi</p>
      </DeviceFrame>,
    );
    const screenArea = screen.getByRole("region", { name: "Page preview" });
    expect(screenArea).toHaveAttribute("tabindex", "0");
    // A desktop scrollbar would eat into the phone's real width.
    expect(screenArea).toHaveClass("scrollbar-none");
  });
});
