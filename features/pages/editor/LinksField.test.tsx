import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { newLink } from "@/lib/pages/links";
import type { LinkItem } from "@/lib/pages/types";

import { LinksField, type ErrorsApi } from "./fields";
import { uploadMedia } from "./upload";

vi.mock("./upload", async (original) => ({ ...(await original<object>()), uploadMedia: vi.fn() }));

const errors: ErrorsApi = { error: () => undefined, touch: () => {}, reorder: () => {} };

function Harness({
  initial,
  extras = true,
  errorsApi = errors,
}: {
  initial: LinkItem[];
  extras?: boolean;
  errorsApi?: ErrorsApi;
}) {
  const [links, setLinks] = useState(initial);
  return (
    <>
      <LinksField items={links} onChange={setLinks} max={30} errors={errorsApi} extras={extras} />
      <output aria-label="Links">{JSON.stringify(links)}</output>
    </>
  );
}
const links = () =>
  JSON.parse(screen.getByRole("status", { name: "Links" }).textContent!) as LinkItem[];

describe("LinksField with extras", () => {
  it("adds a header row, which has only its text", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ ...newLink(), label: "Shop", url: "shop.com" }]} />);
    await user.click(screen.getByRole("button", { name: "Add header" }));
    expect(links().some((l) => l.kind === "header")).toBe(true);
    expect(screen.getByRole("textbox", { name: /^Header text/ })).toBeInTheDocument();
  });

  it("switches a link to email, and asks for an email address", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[newLink()]} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Link type" }), "Email");
    expect(links()[0]!.type).toBe("email");
    expect(screen.getByRole("textbox", { name: /^Email address/ })).toBeInTheDocument();
  });

  it("features one link at a time", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={[
          { ...newLink(), label: "One", url: "a.com", featured: true },
          { ...newLink(), label: "Two", url: "b.com" },
        ]}
      />,
    );
    const second = screen
      .getAllByRole("listitem")
      .find((li) => within(li).queryByDisplayValue("Two"))!;
    await user.click(within(second).getByRole("button", { name: /More options/ }));
    await user.click(within(second).getByRole("switch", { name: /Featured/ }));
    expect(links().map((l) => l.featured)).toEqual([false, true]);
  });

  it("schedules a link in the owner's own time, and says so on the row", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ ...newLink(), label: "Sale", url: "shop.com" }]} />);
    await user.click(screen.getByRole("button", { name: /More options/ }));
    const from = screen.getByLabelText(/^Show from/);
    await user.type(from, "2030-01-10T09:00");
    expect(links()[0]!.showFrom).toBe(new Date("2030-01-10T09:00").toISOString());
    // The row says when it shows (ruling 2), in the owner's own time.
    expect(screen.getByText("From Jan 10, 9:00 AM")).toBeInTheDocument();
  });

  it("uploads a link's own image as a small square", async () => {
    const user = userEvent.setup();
    const image = {
      path: "11111111-1111-4111-8111-111111111111/i.png",
      name: "i.png",
      type: "image/png",
      size: 1,
    };
    vi.mocked(uploadMedia).mockResolvedValue({ ok: true, media: image });
    const { container } = render(
      <Harness initial={[{ ...newLink(), label: "Shop", url: "shop.com" }]} />,
    );
    await user.click(screen.getByRole("button", { name: /More options/ }));
    await user.click(screen.getByRole("radio", { name: "Image" }));
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    await act(async () => user.upload(input, new File(["x"], "i.png", { type: "image/png" })));
    expect(vi.mocked(uploadMedia).mock.lastCall![2]).toMatchObject({ maxSide: 256 });
    expect(links()[0]).toMatchObject({ icon: "image", image });
  });

  it("shows none of this for Business buttons", () => {
    render(<Harness initial={[newLink()]} extras={false} />);
    expect(screen.queryByRole("button", { name: "Add header" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Link type" })).toBeNull();
    expect(screen.queryByRole("button", { name: /More options/ })).toBeNull();
  });

  it("opens More options when its schedule has a problem, so Show me can reach it", () => {
    const failing: ErrorsApi = {
      ...errors,
      error: (path) => (path === "links.0.showUntil" ? "End after the start" : undefined),
    };
    render(
      <Harness
        errorsApi={failing}
        initial={[
          {
            ...newLink(),
            label: "Sale",
            url: "shop.com",
            showFrom: "2030-01-12T00:00:00.000Z",
            showUntil: "2030-01-10T00:00:00.000Z",
          },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: /More options/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("End after the start")).toBeInTheDocument();
  });

  it("says on the row when a scheduled link shows, or that its time has passed", () => {
    const from = new Date("2030-01-10T09:00").toISOString();
    const { unmount } = render(
      <Harness initial={[{ ...newLink(), label: "Sale", url: "shop.com", showFrom: from }]} />,
    );
    expect(screen.getByText("From Jan 10, 9:00 AM")).toBeInTheDocument();
    unmount();
    render(
      <Harness
        initial={[
          { ...newLink(), label: "Old", url: "shop.com", showUntil: "2020-01-01T00:00:00.000Z" },
        ]}
      />,
    );
    expect(screen.getByText("Ended")).toBeInTheDocument();
  });
});
