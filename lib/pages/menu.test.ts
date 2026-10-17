import { describe, expect, it } from "vitest";

import { DIET, newDish, priceText, tagsToLabels } from "./menu";
import { sanitizePage } from "./sanitize";
import { PAGE_DEFAULTS } from "./types";
import { validatePage } from "./validate";

describe("menu dishes", () => {
  it("turns old tags that are dietary labels into ticks, and keeps the rest as a note", () => {
    expect(tagsToLabels("Vegan, GF, house special")).toEqual({
      labels: ["vegan", "gluten-free"],
      rest: "house special",
    });
    // "nut-free" is not "Contains nuts"; duplicates collapse; labels keep the list's order.
    expect(tagsToLabels("nut-free, V, vegetarian, Spicy")).toEqual({
      labels: ["vegetarian", "spicy"],
      rest: "nut-free",
    });
    expect(tagsToLabels("")).toEqual({ labels: [], rest: "" });
  });

  it("reads an old menu with every dish shown, its tags upgraded, and nothing else changed", () => {
    const page = sanitizePage("menu", {
      name: "Diner",
      sections: [
        {
          name: "Mains",
          items: [{ name: "Chili", price: "9", tags: "spicy, contains nuts, chef's pick" }],
        },
      ],
    });
    expect(page.sections[0]).toEqual({
      name: "Mains",
      description: "",
      items: [
        { ...newDish(), name: "Chili", price: "9", labels: ["spicy", "nuts"], tags: "chef's pick" },
      ],
    });
  });

  it("keeps a dish's labels once it has them, and drops unknown and repeated ones", () => {
    const page = sanitizePage("menu", {
      name: "D",
      sections: [
        {
          name: "S",
          items: [{ name: "Soup", labels: ["vegan", "keto", "vegan"], tags: "vegetarian" }],
        },
      ],
    });
    expect(page.sections[0]!.items[0]).toMatchObject({ labels: ["vegan"], tags: "vegetarian" });
  });

  it("asks for each price option's name and price", () => {
    const page = {
      ...PAGE_DEFAULTS.menu(),
      name: "D",
      sections: [
        {
          name: "S",
          description: "",
          items: [
            {
              ...newDish(),
              name: "Pizza",
              options: [
                { label: "", price: "8" },
                { label: "Large", price: "" },
              ],
            },
          ],
        },
      ],
    };
    expect(validatePage("menu", page)).toEqual({
      "sections.0.items.0.options.0.label": "Name this option, like Small",
      "sections.0.items.0.options.1.price": "Add its price",
    });
  });

  it("asks to show a dish when every dish is hidden", () => {
    const page = {
      ...PAGE_DEFAULTS.menu(),
      name: "D",
      sections: [
        { name: "S", description: "", items: [{ ...newDish(), name: "Pizza", on: false }] },
      ],
    };
    expect(validatePage("menu", page)).toEqual({
      "sections.0.items.0.name": "Show at least one dish or drink",
    });
  });

  it("writes number prices with the currency, and lists the labels in order", () => {
    expect(priceText("8", "$")).toBe("$8");
    expect(priceText(" 8.50 ", "€")).toBe("€8.50");
    expect(priceText("Market price", "$")).toBe("Market price");
    expect(DIET.map((d) => d.label)).toEqual([
      "Vegan",
      "Vegetarian",
      "Gluten-free",
      "Dairy-free",
      "Spicy",
      "Contains nuts",
      "Halal",
      "Kosher",
    ]);
  });

  it("leaves a hidden dish's unfinished price options alone, as it's parked", () => {
    const page = {
      ...PAGE_DEFAULTS.menu(),
      name: "D",
      sections: [
        {
          name: "S",
          description: "",
          items: [
            { ...newDish(), name: "Soup" },
            { ...newDish(), name: "Pizza", on: false, options: [{ label: "", price: "8" }] },
          ],
        },
      ],
    };
    expect(validatePage("menu", page)).toEqual({});
  });
});
