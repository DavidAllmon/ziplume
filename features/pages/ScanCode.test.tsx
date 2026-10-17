import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScanCode } from "./ScanCode";

describe("ScanCode", () => {
  it("draws a QR code or a barcode, black on white, named for screen readers", () => {
    const { rerender } = render(<ScanCode kind="qr" value="SAVE20" />);
    expect(screen.getByRole("img", { name: "QR code for SAVE20" })).toBeInTheDocument();
    rerender(<ScanCode kind="barcode" value="SAVE20" />);
    const bars = screen.getByRole("img", { name: "Barcode for SAVE20" });
    // Start, 6 characters and the check value have 3 bars each; Stop has 4.
    expect(bars.querySelectorAll("rect[data-bar]")).toHaveLength(8 * 3 + 4);
    rerender(<ScanCode kind="barcode" value="CAFÉ" />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
