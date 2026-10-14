import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignupForm } from "./SignupForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./GoogleButton", () => ({ GoogleButton: () => null, OrDivider: () => null }));

describe("SignupForm", () => {
  it("fills in and locks the invited address", () => {
    render(
      <SignupForm next="/invite/x" invite={{ token: "a".repeat(48), email: "sam@cafe.com" }} />,
    );
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("sam@cafe.com");
    expect(email).toHaveAttribute("readonly");
    expect(screen.getByText("This invite is for this address.")).toBeInTheDocument();
  });

  it("leaves the address open without an invite", () => {
    render(<SignupForm next="/dashboard" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("readonly");
  });
});
