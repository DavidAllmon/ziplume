import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { linkify } from "./linkify";

const show = (text: string) => render(<p>{linkify(text)}</p>);

describe("linkify", () => {
  it("links web addresses and emails, keeping the text as written", () => {
    show("Menu at www.example.com or https://example.com/a?b=1, or write hi@example.com.");
    expect(screen.getByRole("link", { name: "www.example.com" })).toHaveAttribute(
      "href",
      "https://www.example.com",
    );
    expect(screen.getByRole("link", { name: "https://example.com/a?b=1" })).toHaveAttribute(
      "href",
      "https://example.com/a?b=1",
    );
    expect(screen.getByRole("link", { name: "hi@example.com" })).toHaveAttribute(
      "href",
      "mailto:hi@example.com",
    );
    const link = screen.getByRole("link", { name: "www.example.com" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
  });

  it("leaves trailing punctuation and brackets out of the link", () => {
    show("See (https://x.com). Or example.org!");
    expect(screen.getByRole("link", { name: "https://x.com" })).toHaveAttribute(
      "href",
      "https://x.com",
    );
    expect(screen.queryByRole("link", { name: /example\.org/ })).toBeNull();
  });

  it("never makes a script link", () => {
    show("javascript:alert(1) and data:text/html,hi");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps @handles in web addresses as web links", () => {
    show("Follow www.tiktok.com/@mybakery and https://www.youtube.com/@mybakery");
    expect(screen.getByRole("link", { name: "www.tiktok.com/@mybakery" })).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@mybakery",
    );
    expect(screen.getByRole("link", { name: "https://www.youtube.com/@mybakery" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/@mybakery",
    );
  });

  it("leaves curly quotes, possessives and an ellipsis out of the link", () => {
    show("“Visit https://x.com” and https://y.com’s menu, or https://z.com…");
    expect(screen.getByRole("link", { name: "https://x.com" })).toHaveAttribute(
      "href",
      "https://x.com",
    );
    expect(screen.getByRole("link", { name: "https://y.com" })).toHaveAttribute(
      "href",
      "https://y.com",
    );
    expect(screen.getByRole("link", { name: "https://z.com" })).toHaveAttribute(
      "href",
      "https://z.com",
    );
  });

  it("keeps brackets that belong to the address, and drops ones around it", () => {
    show("(see https://en.wikipedia.org/wiki/Foo_(bar)) or [https://x.com] or {https://y.com}");
    expect(
      screen.getByRole("link", { name: "https://en.wikipedia.org/wiki/Foo_(bar)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://x.com" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://y.com" })).toBeInTheDocument();
  });
});
