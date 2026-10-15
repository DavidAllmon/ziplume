import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo, LogoMark, Wordmark } from "./Logo";
import { markSvg } from "./mark";

describe("LogoMark", () => {
  it("follows the theme when plain", () => {
    const { container } = render(<LogoMark />);
    const strokes = [...container.querySelectorAll("path")].map((p) => p.getAttribute("stroke"));
    expect(strokes).toEqual([
      "var(--logo-corners)",
      "var(--logo-bars)",
      "var(--logo-glow)",
      "var(--logo-beam)",
    ]);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("sits on its navy tile as the app icon, and drops the corners when small", () => {
    const tile = render(<LogoMark variant="tile" />).container;
    expect(tile.querySelector("rect")).toHaveAttribute("fill", "#0A1330");
    expect(tile.querySelectorAll("path")).toHaveLength(3);
    const small = render(<LogoMark variant="small" />).container;
    expect(small.querySelectorAll("path")).toHaveLength(2);
  });

  it("can be named for screen readers", () => {
    render(<LogoMark title="Ziplume" />);
    expect(screen.getByRole("img", { name: "Ziplume" })).toBeInTheDocument();
  });
});

describe("Wordmark", () => {
  it("is read as Ziplume, though drawn in capitals", () => {
    render(<Wordmark />);
    expect(screen.getByText("Ziplume")).toHaveClass("uppercase");
  });

  it("adds viewfinder corners only when framed", () => {
    const plain = render(<Wordmark />).container;
    expect(plain.querySelectorAll("[aria-hidden]")).toHaveLength(0);
    const framed = render(<Wordmark framed />).container;
    expect(framed.querySelectorAll("[aria-hidden]")).toHaveLength(4);
  });
});

describe("Logo", () => {
  it("puts the mark beside the text logo", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Ziplume")).toBeInTheDocument();
  });
});

describe("markSvg", () => {
  it("draws each variant for the brand script", () => {
    expect(markSvg("light")).toContain('stroke="#0A1330"');
    expect(markSvg("dark")).toContain('stroke="#E6EEFA"');
    expect(markSvg("tile")).toContain('rx="14" fill="#0A1330"');
    expect(markSvg("small")).not.toContain("M12 22v-6");
    expect(markSvg("bleed")).toContain('<rect width="64" height="64" fill="#0A1330"/>');
  });
});
