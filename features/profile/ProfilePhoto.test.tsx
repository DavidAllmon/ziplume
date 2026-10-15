import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { uploadAvatar } from "./api";
import { ProfilePhoto } from "./ProfilePhoto";

vi.mock("./api", () => ({
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
  restoreGooglePhoto: vi.fn(),
}));

const GOOGLE = "https://lh3.googleusercontent.com/a/google";
const UPLOADED = "https://lh3.googleusercontent.com/a/new";

function renderPhoto(props: Partial<ComponentProps<typeof ProfilePhoto>> = {}) {
  return render(
    <ToastProvider>
      <ProfilePhoto
        userId="u1"
        name="Sam Lee"
        email="sam@cafe.com"
        initialUrl={null}
        googlePhoto={null}
        {...props}
      />
    </ToastProvider>,
  );
}

beforeEach(() => vi.mocked(uploadAvatar).mockReset());

describe("ProfilePhoto", () => {
  it("with no photo, shows initials and offers the Google photo", () => {
    renderPhoto({ googlePhoto: GOOGLE });
    expect(screen.getByText("SL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use Google photo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("while using the Google photo, offers Remove instead", () => {
    renderPhoto({ initialUrl: GOOGLE, googlePhoto: GOOGLE });
    expect(screen.queryByRole("button", { name: "Use Google photo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getByText(/Using your Google photo\./)).toBeInTheDocument();
  });

  it("shows an uploaded photo and tells the rest of the page", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({ ok: true, url: UPLOADED });
    const heard = vi.fn();
    window.addEventListener("ziplume:profile", (event) => heard((event as CustomEvent).detail));
    const { container } = renderPhoto();
    const file = new File(["x"], "me.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Upload photo"), file);
    expect(uploadAvatar).toHaveBeenCalledWith("u1", file);
    await waitFor(() => expect(container.querySelector("img")).toHaveAttribute("src", UPLOADED));
    expect(heard).toHaveBeenCalledWith({ avatar_url: UPLOADED });
  });

  it("explains a failed upload", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({
      ok: false,
      error: "That photo is over 10 MB. Try a smaller one.",
    });
    renderPhoto();
    await userEvent.upload(
      screen.getByLabelText("Upload photo"),
      new File(["x"], "me.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("That photo is over 10 MB.");
  });
});
