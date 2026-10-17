import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedbackForm } from "./FeedbackForm";

const questions = [
  { text: "How was the food?", style: "faces" as const },
  { text: "Would you come back?", style: "thumbs" as const },
  { text: "How likely are you to recommend us?", style: "scale" as const },
];
const form = (patch = {}) => (
  <FeedbackForm
    slug="FB1"
    questions={questions}
    allowComment
    askContact={false}
    thanks="Thanks!"
    reviewUrl="https://g.page/r/abc/review"
    {...patch}
  />
);

describe("FeedbackForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks each question in its style, and sends once all are answered", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetch);
    render(form());
    const send = screen.getByRole("button", { name: "Send feedback" });
    const faces = within(screen.getByRole("group", { name: "How was the food?" }));
    await user.click(faces.getByRole("radio", { name: "4: Good" }));
    expect(send).toBeDisabled();
    await user.click(
      within(screen.getByRole("group", { name: "Would you come back?" })).getByRole("radio", {
        name: "Thumbs up",
      }),
    );
    await user.click(
      within(screen.getByRole("group", { name: "How likely are you to recommend us?" })).getByRole(
        "radio",
        { name: "9 out of 10" },
      ),
    );
    expect(send).toBeEnabled();
    await user.click(send);
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toMatchObject({
      answers: [4, 1, 9],
    });
  });

  it("offers the review link to everyone after sending", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    render(form({ questions: [{ text: "Back?", style: "thumbs" }] }));
    await user.click(screen.getByRole("radio", { name: "Thumbs down" }));
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(await screen.findByText("Thanks!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Share it on Google/ })).toHaveAttribute(
      "href",
      "https://g.page/r/abc/review",
    );
  });

  it("keeps stars for a star question, and can be answered with the keyboard", async () => {
    const user = userEvent.setup();
    render(form({ questions: [{ text: "Rate us", style: "stars" }] }));
    await user.tab();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("radio", { name: /^3 stars/ })).toBeChecked();
  });

  it("sends nothing from the editor's preview", () => {
    render(form({ preview: true }));
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeDisabled();
  });
});
