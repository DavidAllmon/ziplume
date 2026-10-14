import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { resendInvite, sendInvites } from "./actions";
import { TeamManager, type Invite } from "./TeamManager";

vi.mock("./actions", () => ({ sendInvites: vi.fn(), resendInvite: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const TOKEN = "a".repeat(48);
const HOUR = 3_600_000;

function renderTeam(props: Partial<ComponentProps<typeof TeamManager>> = {}) {
  return render(
    <ToastProvider>
      <TeamManager
        userId="owner"
        members={[]}
        invites={[]}
        workspaces={[]}
        emailEnabled
        {...props}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.mocked(sendInvites).mockReset();
  vi.mocked(resendInvite).mockReset();
});

describe("TeamManager invites", () => {
  it("emails invites and says who got one", async () => {
    vi.mocked(sendInvites).mockResolvedValue({
      outcomes: [{ email: "sam@cafe.com", token: TOKEN, status: "sent" }],
    });
    renderTeam();
    await userEvent.type(screen.getByLabelText("Email addresses"), "sam@cafe.com");
    await userEvent.click(screen.getByRole("button", { name: "Send invites" }));
    expect(sendInvites).toHaveBeenCalledWith({
      emails: "sam@cafe.com",
      role: "editor",
      email: true,
    });
    expect(await screen.findByText(/Invite emailed to/)).toHaveTextContent(
      "Invite emailed to sam@cafe.com",
    );
  });

  it("without email, makes a link to share", async () => {
    vi.mocked(sendInvites).mockResolvedValue({
      outcomes: [{ email: "sam@cafe.com", token: TOKEN, status: "link" }],
    });
    renderTeam({ emailEnabled: false });
    expect(screen.getByText(/Email invites aren’t set up on this server/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email addresses"), "sam@cafe.com");
    await userEvent.click(screen.getByRole("button", { name: "Create invite link" }));
    expect(sendInvites).toHaveBeenCalledWith({
      emails: "sam@cafe.com",
      role: "editor",
      email: false,
    });
    expect(await screen.findByText(`http://localhost:3000/invite/${TOKEN}`)).toBeInTheDocument();
  });

  it("shows why an invite couldn’t be sent", async () => {
    vi.mocked(sendInvites).mockResolvedValue({
      error: "Invite up to 10 people at a time.",
      outcomes: [],
    });
    renderTeam();
    await userEvent.type(screen.getByLabelText("Email addresses"), "a@b.co");
    await userEvent.click(screen.getByRole("button", { name: "Send invites" }));
    expect(await screen.findByText("Invite up to 10 people at a time.")).toBeInTheDocument();
  });

  it("recovers when the server can’t be reached", async () => {
    vi.mocked(sendInvites).mockRejectedValue(new Error("fetch failed"));
    renderTeam();
    await userEvent.type(screen.getByLabelText("Email addresses"), "sam@cafe.com");
    await userEvent.click(screen.getByRole("button", { name: "Send invites" }));
    expect(
      await screen.findByText("The invites couldn’t be sent. Check your connection and try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send invites" })).toBeEnabled();
  });

  it("lists pending invites with when they were emailed, and resends them", async () => {
    const invite: Invite = {
      id: "i1",
      email: "lee@cafe.com",
      role: "viewer",
      token: TOKEN,
      created_at: new Date(Date.now() - 3 * HOUR).toISOString(),
      expires_at: new Date(Date.now() + 13 * 24 * HOUR).toISOString(),
      last_sent_at: new Date(Date.now() - 2 * HOUR).toISOString(),
      send_count: 1,
    };
    vi.mocked(resendInvite).mockResolvedValue({
      outcomes: [{ email: "lee@cafe.com", token: TOKEN, status: "sent" }],
    });
    renderTeam({ invites: [invite] });
    expect(
      screen.getByText("Viewer · emailed 2 hours ago · expires in 13 days"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resend" }));
    expect(resendInvite).toHaveBeenCalledWith("i1");
  });
});
