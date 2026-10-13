import { describe, expect, it } from "vitest";

import { measure } from "./capacity";
import { checkScannability, type ScanInput } from "./scannability";

const data = "https://example.com";
const base: ScanInput = {
  data,
  measurement: measure(data, "M"),
  fgColor: "#0F172A",
  bgColor: "#FFFFFF",
  transparent: false,
  errorCorrection: "M",
  logoSize: 0,
  exportSize: 1024,
};

const ids = (input: Partial<ScanInput>) =>
  checkScannability({ ...base, ...input }).issues.map((i) => i.id);

describe("checkScannability", () => {
  it("is empty without data and ok for the defaults", () => {
    expect(checkScannability({ ...base, data: "" }).status).toBe("empty");
    expect(checkScannability(base)).toEqual({ status: "ok", issues: [] });
  });

  it("flags low contrast as an error and borderline contrast as a warning", () => {
    expect(checkScannability({ ...base, fgColor: "#DDDDDD" }).status).toBe("error");
    expect(checkScannability({ ...base, fgColor: "#777777" }).status).toBe("warn");
  });

  it("warns about inverted colors and transparency", () => {
    expect(ids({ fgColor: "#FFFFFF", bgColor: "#0F172A" })).toContain("inverted");
    expect(ids({ transparent: true })).toEqual(["transparent"]);
  });

  it("warns when the logo is too big for the error correction level", () => {
    expect(ids({ logoSize: 0.3, errorCorrection: "L" })).toContain("logo");
    expect(ids({ logoSize: 0.22, errorCorrection: "H" })).not.toContain("logo");
  });

  it("errors when content overflows", () => {
    const long = "x".repeat(3000);
    const report = checkScannability({ ...base, data: long, measurement: measure(long, "H") });
    expect(report.status).toBe("error");
    expect(report.issues[0]?.id).toBe("overflow");
  });

  it("warns about dense codes at small export sizes", () => {
    const long = "x".repeat(1200);
    expect(ids({ data: long, measurement: measure(long, "L"), exportSize: 256 })).toEqual(
      expect.arrayContaining(["density", "print"]),
    );
  });
});
