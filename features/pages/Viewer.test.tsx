import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Gallery } from "./Viewer";

const UID = "11111111-1111-4111-8111-111111111111";
const photo = (n: number) => ({
  media: { path: `${UID}/${n}.jpg`, name: `${n}.jpg`, type: "image/jpeg", size: 1 },
  alt: `Photo ${n}`,
  caption: n === 2 ? "The terrace" : undefined,
});
const three = [photo(1), photo(2), photo(3)];

describe("Gallery and Viewer", () => {
  it("opens the photo you tap, full screen, with its caption", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 2 of 3" }));
    const dialog = screen.getByRole("dialog", { name: "Photo 2 of 3" });
    expect(within(dialog).getByRole("img", { name: "Photo 2" })).toBeInTheDocument();
    expect(within(dialog).getByText("The terrace")).toBeInTheDocument();
  });

  it("goes back and forth with the arrow keys and buttons, and stops at the ends", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 1 of 3" }));
    expect(screen.getByRole("button", { name: "Previous photo" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Photo 2 of 3" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByRole("dialog", { name: "Photo 3 of 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next photo" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("dialog", { name: "Photo 2 of 3" })).toBeInTheDocument();
  });

  it("closes on Escape and gives focus back to the photo you opened", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    const thumb = screen.getByRole("button", { name: "Open photo 3 of 3" });
    await user.click(thumb);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(thumb).toHaveFocus();
  });

  it("turns a sideways swipe into next or previous, and ignores a tap", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 2 of 3" }));
    const stage = screen.getByTestId("viewer-stage");
    fireEvent.pointerDown(stage, { clientX: 200, pointerType: "touch" });
    fireEvent.pointerUp(stage, { clientX: 190, pointerType: "touch" });
    expect(screen.getByRole("dialog", { name: "Photo 2 of 3" })).toBeInTheDocument();
    fireEvent.pointerDown(stage, { clientX: 200, pointerType: "touch" });
    fireEvent.pointerUp(stage, { clientX: 60, pointerType: "touch" });
    expect(screen.getByRole("dialog", { name: "Photo 3 of 3" })).toBeInTheDocument();
  });

  it("shows one photo with no previous or next", async () => {
    const user = userEvent.setup();
    render(<Gallery images={[photo(1)]} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 1 of 1" }));
    expect(screen.queryByRole("button", { name: "Previous photo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next photo" })).toBeNull();
  });

  it("is a still row in the editor's preview", () => {
    render(<Gallery images={three} label="Photos" preview />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("list", { name: "Photos" })).toBeInTheDocument();
  });

  it("keeps focus on Next at the last photo, so it never falls out of the viewer", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 2 of 3" }));
    const next = screen.getByRole("button", { name: "Next photo" });
    next.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Photo 3 of 3" })).toBeInTheDocument();
    // A disabled button would drop focus to the page behind; this one stays focusable.
    expect(next).not.toBeDisabled();
    expect(next).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Photo 3 of 3" })).toBeInTheDocument();
  });

  it("announces which photo is showing when it changes", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 1 of 3" }));
    const title = screen.getByText("Photo 1 of 3");
    expect(title).toHaveAttribute("aria-live", "polite");
  });

  it("offers an image's link", async () => {
    const user = userEvent.setup();
    render(
      <Gallery
        images={[{ ...photo(1), link: "https://example.com/1" }, photo(3)]}
        label="Photos"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open photo 1 of 2" }));
    expect(screen.getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://example.com/1",
    );
    await user.keyboard("{ArrowRight}");
    expect(screen.queryByRole("link", { name: "Open link" })).toBeNull();
  });
});
