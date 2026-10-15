import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { Media } from "@/lib/pages/types";

import { ImagesField } from "./fields";

const UID = "11111111-1111-4111-8111-111111111111";
const image = (name: string): Media => ({
  path: `${UID}/${name}`,
  name,
  type: "image/png",
  size: 1,
});

function Harness() {
  const [images, setImages] = useState([image("a.png"), image("b.png"), image("c.png")]);
  return (
    <>
      <ImagesField value={images} onChange={setImages} max={24} />
      <output aria-label="Order">{images.map((m) => m.name).join(",")}</output>
    </>
  );
}

const order = () => screen.getByRole("status", { name: "Order" });

describe("ImagesField", () => {
  it("moves images earlier and later, and removes them, from each image's ⋯ menu", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Actions for image 2" }));
    await user.click(screen.getByRole("menuitem", { name: "Move earlier" }));
    expect(order()).toHaveTextContent("b.png,a.png,c.png");
    await user.click(screen.getByRole("button", { name: "Actions for image 1" }));
    await user.click(screen.getByRole("menuitem", { name: "Move later" }));
    expect(order()).toHaveTextContent("a.png,b.png,c.png");
    await user.click(screen.getByRole("button", { name: "Actions for image 3" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    expect(order()).toHaveTextContent("a.png,b.png");
  });

  it("puts Add images before the images, with a drag handle on each", () => {
    render(<Harness />);
    const add = screen.getByText("Add images");
    const first = screen.getByRole("button", { name: "Drag image 1" });
    expect(add.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps focus on an image's ⋯ as it moves, and on the next one's after a remove", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Actions for image 2" }));
    await user.click(screen.getByRole("menuitem", { name: "Move earlier" }));
    expect(screen.getByRole("button", { name: "Actions for image 1" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Actions for image 1" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    // a.png is image 1 now.
    expect(order()).toHaveTextContent("a.png,c.png");
    expect(screen.getByRole("button", { name: "Actions for image 1" })).toHaveFocus();
  });

  it("goes to Add images after the last image is removed", async () => {
    const user = userEvent.setup();
    function One() {
      const [images, setImages] = useState([image("a.png")]);
      return <ImagesField value={images} onChange={setImages} max={24} />;
    }
    const { container } = render(<One />);
    await user.click(screen.getByRole("button", { name: "Actions for image 1" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    expect(container.querySelector("input[type=file]")).toHaveFocus();
  });
});
