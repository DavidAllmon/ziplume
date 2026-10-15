import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PREVIEW_SLUG } from "@/lib/dynamic/slug";
import { PAGE_DEFAULTS } from "@/lib/pages/types";

import { PagePreview } from "./PagePreview";

const page = { ...PAGE_DEFAULTS.links(), title: "Hi" };

describe("PagePreview", () => {
  it("shows the page's address in the desktop frame", () => {
    render(<PagePreview type="links" page={page} slug="LUNCH1" device="desktop" />);
    expect(screen.getByText(/\/p\/LUNCH1$/)).toBeInTheDocument();
  });

  it("doesn't make up an address before the page has one", () => {
    render(<PagePreview type="links" page={page} slug={PREVIEW_SLUG} device="desktop" />);
    expect(screen.queryByText(new RegExp(PREVIEW_SLUG.replace(".", "\\.")))).toBeNull();
    expect(screen.getByText(/\/p\/…$/)).toBeInTheDocument();
  });
});
