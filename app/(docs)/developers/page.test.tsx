import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DevelopersPage from "./page";

describe("API docs", () => {
  it("list every page field the API takes, including link icons and social icon styles", () => {
    const { container } = render(<DevelopersPage />);
    const text = container.textContent ?? "";
    for (const field of ["socialStyle", "socialSize", "showFrom", "featured"]) {
      expect(text, field).toContain(field);
    }
    // A link's icon (auto, none or image) and its uploaded image.
    expect(text).toMatch(/icon\W+\(?auto/);
    expect(screen.getAllByText("image").length).toBeGreaterThan(0);
  });
});
