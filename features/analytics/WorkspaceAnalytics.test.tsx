import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceAnalytics } from "./WorkspaceAnalytics";

const rpc = vi.fn(async (_name: string, _args: Record<string, unknown>) => ({
  data: {
    total: 5,
    unique: 3,
    daily: [{ day: "2030-01-10", scans: 5, unique: 3 }],
    countries: [{ label: "US", scans: 5 }],
    devices: [{ label: "mobile", scans: 5 }],
    codes: [
      { id: "c1", name: "Spring menu", owner: "me", scans: 3, unique: 2 },
      { id: "c2", name: "Cafe flyer", owner: "pat", scans: 2, unique: 1 },
    ],
  },
  error: null,
}));
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ rpc }) }));

const show = (props: Partial<Parameters<typeof WorkspaceAnalytics>[0]> = {}) =>
  render(
    <WorkspaceAnalytics
      owner="me"
      meId="me"
      title="Analytics"
      description="Scans across all your codes."
      since="2030-01-01T00:00:00Z"
      hasCodes
      {...props}
    />,
  );

describe("WorkspaceAnalytics", () => {
  beforeEach(() => rpc.mockClear());
  afterEach(() => vi.useRealTimers());

  it("shows the workspace's totals and top codes, each opening its own analytics", async () => {
    show();
    expect(await screen.findByText("Spring menu")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith(
      "workspace_analytics",
      expect.objectContaining({ p_owner: "me" }),
    );
    const scans = within(screen.getByText("Scans").parentElement!);
    expect(scans.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spring menu" })).toHaveAttribute(
      "href",
      "/codes/c1/analytics",
    );
    // A teammate's code opens inside their workspace.
    expect(screen.getByRole("link", { name: "Cafe flyer" })).toHaveAttribute(
      "href",
      "/codes/c2/analytics?workspace=pat",
    );
    expect(screen.getByRole("link", { name: /CSV/ }).getAttribute("href")).toMatch(
      /^\/analytics\/export\?range=30d&tz=.+&workspace=me$/,
    );
  });

  it("asks Everyone for every code the viewer can see", async () => {
    show({ owner: null });
    await screen.findByText("Spring menu");
    expect(rpc).toHaveBeenCalledWith(
      "workspace_analytics",
      expect.objectContaining({ p_owner: null }),
    );
    expect(screen.getByRole("link", { name: /CSV/ }).getAttribute("href")).toMatch(
      /&view=everyone$/,
    );
  });

  it("takes a custom range of days, and says when it isn't one", async () => {
    // A clock after the days picked, so they're in the past.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-03-01T12:00:00Z"));
    const user = userEvent.setup();
    show();
    await screen.findByText("Spring menu");
    await user.click(screen.getByRole("radio", { name: "Custom dates" }));
    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");
    // Date boxes take a whole value at once.
    fireEvent.change(from, { target: { value: "2030-01-10" } });
    fireEvent.change(to, { target: { value: "2030-01-05" } });
    expect(await screen.findByText("Pick a start on or before the end.")).toBeInTheDocument();
    const calls = rpc.mock.calls.length;
    fireEvent.change(to, { target: { value: "2030-01-12" } });
    await vi.waitFor(() => expect(rpc.mock.calls.length).toBeGreaterThan(calls));
    expect(rpc.mock.lastCall![1]).toMatchObject({ p_owner: "me" });
    expect(screen.getByRole("link", { name: /CSV/ }).getAttribute("href")).toMatch(
      /range=custom&tz=[^&]+&from=2030-01-10&to=2030-01-12/,
    );
  });

  it("points to Create when the workspace has no trackable codes", () => {
    show({ hasCodes: false });
    expect(screen.getByText("No trackable codes yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create a trackable code/ })).toHaveAttribute(
      "href",
      "/codes/new?type=url",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
