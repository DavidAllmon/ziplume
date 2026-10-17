import type { MenuItem } from "./types";

// A menu's dishes (spec items 21–24): dietary labels, a new dish, and how prices read.

export const DIET_LABEL_IDS = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "spicy",
  "nuts",
  "halal",
  "kosher",
] as const;
export type DietLabel = (typeof DIET_LABEL_IDS)[number];

/** Each label, and the words an old free-text tag might have used for it. */
export const DIET: { id: DietLabel; label: string; words: string[] }[] = [
  { id: "vegan", label: "Vegan", words: ["vegan", "vg"] },
  { id: "vegetarian", label: "Vegetarian", words: ["vegetarian", "veggie", "v"] },
  { id: "gluten-free", label: "Gluten-free", words: ["gluten-free", "gluten free", "gf"] },
  { id: "dairy-free", label: "Dairy-free", words: ["dairy-free", "dairy free", "df"] },
  { id: "spicy", label: "Spicy", words: ["spicy"] },
  { id: "nuts", label: "Contains nuts", words: ["contains nuts", "nuts", "nut"] },
  { id: "halal", label: "Halal", words: ["halal"] },
  { id: "kosher", label: "Kosher", words: ["kosher"] },
];

/** Old comma-separated tags as labels, and the tags that aren't one (spec item 22, ruling 8). */
export function tagsToLabels(tags: string): { labels: DietLabel[]; rest: string } {
  const found = new Set<DietLabel>();
  const rest: string[] = [];
  for (const tag of tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)) {
    const id = DIET.find((d) => d.words.includes(tag.toLowerCase()))?.id;
    if (id) found.add(id);
    else rest.push(tag);
  }
  return { labels: DIET_LABEL_IDS.filter((id) => found.has(id)), rest: rest.join(", ") };
}

export const newDish = (): MenuItem => ({
  name: "",
  description: "",
  price: "",
  tags: "",
  photo: null,
  labels: [],
  on: true,
  soldOut: false,
  popular: false,
  options: [],
});

/** "$8" for a number price, the text as typed otherwise ("Market price"). */
export const priceText = (price: string, currency: string) =>
  /^\d/.test(price.trim()) ? `${currency}${price.trim()}` : price.trim();
