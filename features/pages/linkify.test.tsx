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
});
