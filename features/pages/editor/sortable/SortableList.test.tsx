import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TextField, type ErrorsApi } from "../fields";
import { SortableList } from "./SortableList";

interface Row {
  label: string;
}

function Harness({
  initial,
  addAt,
  errors,
  max = 10,
}: {
  initial: Row[];
  addAt?: "start" | "end";
  errors?: ErrorsApi;
  max?: number;
}) {
  const [items, setItems] = useState(initial);
  return (
    <>
      <SortableList
        label="Links"
        items={items}
        onChange={setItems}
        max={max}
        newItem={() => ({ label: "" })}
        addLabel="Add link"
        addAt={addAt}
        path="links"
        errors={errors}
        itemLabel={(item, i) => (item.label ? `link “${item.label}”` : `link ${i + 1}`)}
        render={(item, update, i) => (
          <TextField
            path={`links.${i}.label`}
            label="Button text"
            value={item.label}
            onChange={(label) => update({ label })}
          />
        )}
      />
      <button type="button" onClick={() => setItems([{ label: "X" }])}>
        Replace
      </button>
    </>
  );
}

const values = () =>
  screen.getAllByLabelText("Button text").map((input) => (input as HTMLInputElement).value);

describe("SortableList", () => {
  it("adds a row on top and puts the cursor in it", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ label: "A" }]} />);
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(values()).toEqual(["", "A"]);
    expect(screen.getAllByLabelText("Button text")[0]).toHaveFocus();
  });

  it("adds at the end for lists read in order", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ label: "A" }]} addAt="end" />);
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(values()).toEqual(["A", ""]);
    expect(screen.getAllByLabelText("Button text")[1]).toHaveFocus();
  });

  it("moves and removes rows from each row's ⋯ menu, and what's typed goes with its row", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ label: "A" }, { label: "B" }, { label: "C" }]} />);
    await user.click(screen.getByRole("button", { name: "Actions for link “A”" }));
    expect(screen.getByRole("menuitem", { name: "Move up" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.click(screen.getByRole("menuitem", { name: "Move down" }));
    expect(values()).toEqual(["B", "A", "C"]);
    await user.click(screen.getByRole("button", { name: "Actions for link “C”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    expect(values()).toEqual(["B", "C", "A"]);
    await user.click(screen.getByRole("button", { name: "Actions for link “C”" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    expect(values()).toEqual(["B", "A"]);
  });

  it("tells the form which way rows moved, so their errors follow", async () => {
    const user = userEvent.setup();
    const reorder = vi.fn();
    const errors: ErrorsApi = { error: () => undefined, touch: vi.fn(), reorder };
    render(<Harness initial={[{ label: "A" }, { label: "B" }]} errors={errors} />);
    await user.click(screen.getByRole("button", { name: "Actions for link “B”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    expect(reorder).toHaveBeenLastCalledWith("links", [1, 0]);
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(reorder).toHaveBeenLastCalledWith("links", [-1, 0, 1]);
  });

  it("lines up with a list replaced from outside", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ label: "A" }, { label: "B" }]} />);
    await user.click(screen.getByRole("button", { name: "Replace" }));
    expect(values()).toEqual(["X"]);
  });

  it("gives each row a drag handle keyboard users can reach", () => {
    render(<Harness initial={[{ label: "A" }]} />);
    const handle = screen.getByRole("button", { name: "Drag link “A”" });
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it("hides Add once the list is full", () => {
    render(<Harness initial={[{ label: "A" }]} max={1} />);
    expect(screen.queryByRole("button", { name: "Add link" })).toBeNull();
  });
});
