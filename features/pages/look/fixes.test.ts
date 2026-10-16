import { describe, expect, it } from "vitest";

import { themeLook } from "@/lib/pages/look";

import { fixLook } from "./fixes";
import { lookChecks } from "./resolve";

describe("fixLook", () => {
  it("makes each failing check pass in one step", () => {
    const look = themeLook("paper", "links");
    look.text = "#DDDDDD";
    look.button.color = "#EEEEEE";
    look.button.text = "#F5F5F5";
    expect(
      lookChecks(look)
        .map((c) => c.id)
        .sort(),
    ).toEqual(["button", "buttonText", "text"]);
    let fixed = look;
    for (const id of ["text", "buttonText", "button"] as const) fixed = fixLook(fixed, id);
    expect(lookChecks(fixed)).toEqual([]);
    expect(fixed.text).toBe("auto");
    expect(fixed.button.text).toBe("auto");
    expect(fixed.button.color).not.toBe("#EEEEEE");
  });

  it("leaves a look that already passes alone", () => {
    const look = themeLook("ocean", "links");
    expect(fixLook(look, "button")).toEqual(look);
  });
});
