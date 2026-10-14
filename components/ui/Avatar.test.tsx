import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "./Avatar";

const GOOGLE = "https://lh3.googleusercontent.com/a/sam";

describe("Avatar", () => {
  it("shows a trusted photo", () => {
    const { container } = render(<Avatar id="u1" name="Sam Lee" src={GOOGLE} />);
    expect(container.querySelector("img")).toHaveAttribute("src", GOOGLE);
  });

  it("shows initials without a photo", () => {
    render(<Avatar id="u1" name="Sam Lee" />);
    expect(screen.getByText("SL")).toBeInTheDocument();
  });

  it("shows initials instead of untrusted or broken photos", () => {
    const { container, rerender } = render(
      <Avatar id="u1" name="Sam Lee" src="https://tracker.example/p.gif" />,
    );
    expect(container.querySelector("img")).toBeNull();
    rerender(<Avatar id="u1" name="Sam Lee" src={`${GOOGLE}-broken`} />);
    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByText("SL")).toBeInTheDocument();
  });
});
