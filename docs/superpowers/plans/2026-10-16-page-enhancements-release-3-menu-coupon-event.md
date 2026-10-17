# Page enhancements, Release 3: Menu, Coupon, Event — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- **Menu:** a photo per dish, dietary labels, Sold out / Hidden / Popular, price options, and section descriptions.
- **Coupon:** a QR code or barcode to scan at the till, a countdown to the end date, and a corner badge.
- **Event:**
  - online events with a Join button that opens 15 minutes before the start;
  - a Directions link;
  - an agenda;
  - hosts and speakers;
  - a live countdown.

**Architecture:**
- **Content:** everything is optional page content with defaults, read through `SCHEMAS` in `lib/pages/sanitize.ts`.
  - A new `enumList` schema kind holds a dish's dietary labels.
  - An `UPGRADES` step turns an old dish's free-text tags into labels (Release 2b added `UPGRADES` for Contact pages).
- **Pure helpers, each with its own tests:**
  - `lib/pages/menu.ts`: the label list, the tag upgrade, a new dish, and price text.
  - `lib/pages/scan.ts`: QR modules and Code 128 bar widths.
  - `lib/pages/countdown.ts`: coupon and event countdown text, and the Join window.
- **Small client components** draw the clock-dependent parts after hydration, sharing a `useMinute` hook taken out of Release 2b's `OpenStatus`.
- **Dish photos** open the Release 2b viewer through a new `ViewerGroup` / `ViewerThumb` pair.

**Tech Stack:**
- Next.js 16 and React 19 (`useSyncExternalStore`).
- `qrcode-generator` (already a dependency) for the coupon QR code.
- A hand-written Code 128 encoder (no new dependency).
- Headless UI 2.2, Tailwind 4.
- Vitest with jsdom; `jsqr` (already a dependency) to decode the QR code in tests.
- Playwright 1.56, using `page.clock` for countdown tests.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`, section 6 (items 21–28, 30–32 and 34) and section 3 (rules for every release). Items 29 (one use per coupon) and 33 (RSVP) are Release 5. Release 2b is live; its `Viewer`, `QuickActions`, `formatTime` (`lib/pages/hours.ts`), `OpenStatus`, the `UPGRADES` step and `MoreOptions` exist.

## Global Constraints

- **Menu:**
  - **A photo per dish:** optional, resized to 800 px, shown as a square thumbnail on the dish row. Tapping it opens the full-size viewer. (spec 21)
  - **Dietary labels:** ticks with icons: Vegan, Vegetarian, Gluten-free, Dairy-free, Spicy, Contains nuts, Halal and Kosher. They replace the free-text tags. Known words in old tags become ticks, and anything else stays as a short note on the dish. (spec 22)
  - **Dish markers** (spec 23):
    - *Sold out:* the dish is shown faded with "Sold out".
    - *Hidden:* the dish stays in the editor but not on the page.
    - *Popular:* the dish gets a badge.
  - **Price options:** up to 4 per dish, each a label and a price, such as "Small 8 · Large 12". A dish with options shows them instead of its single price. (spec 24)
  - **Long menus:** each section gets an optional description. Menus with 3 or more sections get a jump bar at the top: section names you can tap, which scroll sideways on phones. (spec 25)
- **Coupon:**
  - **Scan at the till:** the owner chooses how the code shows: as text only (today), plus a QR code, or plus a barcode (Code 128). (spec 26)
  - **Countdown:** from 7 days out, "Ends in 3 days", then "Ends today". After the date, the page still says "This offer has ended". (spec 27)
  - **Discount badge:** up to 12 characters, such as "20% OFF", shown large at the top of the coupon. (spec 28)
- **Event:**
  - **Online events and directions** (spec 30):
    - An "Online event" switch adds a join link.
    - The page shows a Join button that is active from 15 minutes before the start until the end.
    - A physical location gets a Directions link. An event can be both online and at a place.
  - **Agenda:** up to 30 rows, each a time, a title and an optional note. (spec 31)
  - **Hosts and speakers:** up to 12, each with a photo (resized to 400 px), a name and a role. (spec 32)
  - **Countdown:** before the event, "Starts in 3 days 4 hours", updating live. During it, "Happening now". After it, "This event has ended". (spec 34)
- Section 3 rules apply:
  - old pages keep working: every new field is optional with a default, and `sanitizePage` fills them in;
  - the API accepts the new fields and its docs list them;
  - new images are resized;
  - previews show each new part, but anything a visitor would tap stays inert;
  - visible labels, 44 px targets on phones, no sideways scroll from 320 px, and axe clean in light and dark;
  - new page parts use the page's look variables;
  - every new text box shows its limit.
- **Tests:**
  - every new field gets a sanitize test, a validation test where it has rules, an editor test and a renderer test;
  - browser tests cover the main flows;
  - the new pages join the axe and phone sweep.

## Rulings made in this plan (for David's review)

1. **The coupon badge is a new, separate box: a stamp on the coupon's top corner, like "NEW".** The existing Offer box already shows "20% OFF" large, so a second "20% OFF" would repeat it. Old coupons have no badge and look exactly as before.
2. **The menu jump bar stays as it is today, from 2 sections up.** The spec says 3, but menus with 2 sections already have one, and old pages mustn't lose it.
3. **A sold-out dish isn't drawn see-through.** Its name and price turn grey, the price is struck through, its photo fades, and it gets a "Sold out" label. See-through text fails the readability checks on several themes.
4. **Hiding a dish uses the same Show switch as Link list links** (stored as `on`, default on, so every old dish shows).
5. **A dish's photo, dietary labels, other notes and price options sit under its "More options".** Sold out and Popular stay on the row, because owners change them often. With 60 dishes a section, a fully open row would be very long. More options lists what's set ("Photo, Vegan, 2 prices"), and it opens by itself when something inside needs fixing.
6. **Tapping a dish photo opens the viewer with every dish photo on the menu,** captioned with the dish's name, so visitors can swipe through them.
7. **A barcode holds up to 20 plain characters.** Longer codes, or codes with accents, need the QR code; the editor says so. The QR code and barcode are always black on white, whatever the theme, so till scanners can read them.
8. **The coupon countdown uses the visitor's own date, and says "Ends tomorrow" the day before.** Until the page loads in the browser, it shows "Valid until …".
9. **The event countdown updates once a minute.** An event with no end time counts as an hour long, as its calendar file already does.
10. **The join link isn't secret.** Before its window opens, the button shows "The link opens 15 minutes before the start", but the link is in the page's data, as everything on a public page is.
11. **The event's address becomes plain text with a "Directions" link under it.** Today the address itself is the map link; one clear "Directions" link replaces it.
12. **The coupon and event countdowns show in the editor's preview,** so the owner can check their dates. The Join button stays inert there, as buttons always do.

## Review Focus

1. **Old menus.**
   - Tags upgrade as follows:
     - capitals and spaces are ignored;
     - "GF" and "V" are recognised;
     - "nut-free" must not become "Contains nuts";
     - duplicates collapse.
   - Every old dish still shows, and old section names keep their bar.
   - Saving an edited old menu keeps the labels and the leftover note.

   *Task 1 test.*
2. **Countdown and Join edges:**
   - the exact start minute ("Happening now") and end minute ("ended");
   - the 15-minute boundary;
   - an event without an end, and an all-day event;
   - a page with no start or a bad time zone: no line, never a throw;
   - a coupon at local midnight, and a bad `validUntil`.

   *Tasks 5 and 6 tests.*
3. **Codes to scan:**
   - an accented code works as a QR code but is refused as a barcode;
   - a barcode over 20 characters;
   - a scan type chosen with no code;
   - the QR code decodes back to the code;
   - the panel stays black on white on dark themes.

   *Tasks 4 and 5 tests; Task 8 axe sweep.*
4. **A section of 20 dishes with labels, options and long names at 320 px:**
   - no sideways scroll;
   - long names and option labels wrap;
   - sold-out text stays readable;
   - every control in the dish editor is 44 px on phones.

   *Task 8 phone sweep.*
5. **Dish photos in the viewer:**
   - numbering is right when some dishes have no photo or are hidden;
   - each caption is its dish's name;
   - the editor's preview shows the photos but opens nothing.

   *Task 2 test.*

---

### Task 1: Menu data: dietary labels, markers, price options, section descriptions

**Files:**
- Create:
  - `lib/pages/menu.ts`
  - `lib/pages/menu.test.ts`
- Modify:
  - `lib/pages/types.ts` (`MenuItem`, `MenuSection`, `LIMITS.options`, menu defaults)
  - `lib/pages/sanitize.ts` (`enumList` kind; menu schema; menu upgrade)
  - `lib/pages/validate.ts` (menu)

**Interfaces:**
- Produces, in `lib/pages/menu.ts`:
  - `DIET_LABEL_IDS`, `DietLabel`;
  - `DIET: { id: DietLabel; label: string; words: string[] }[]`;
  - `tagsToLabels(tags): { labels: DietLabel[]; rest: string }`;
  - `newDish(): MenuItem`;
  - `priceText(price, currency): string`.
- `MenuItem` gains `photo: Media | null`, `labels: DietLabel[]`, `on: boolean`, `soldOut: boolean`, `popular: boolean` and `options: PriceOption[]`. `tags` stays as the dish's other notes.
- `MenuSection` gains `description: string`.

- [ ] **Step 1: Create the branch and commit this plan.**

```bash
git checkout -b feat/page-enhancements-r3 main
git add docs/superpowers/plans/2026-10-16-page-enhancements-release-3-menu-coupon-event.md
git commit -m "Plan: page enhancements release 3, Menu, Coupon and Event"
```

- [ ] **Step 2: Write the failing tests.** Create `lib/pages/menu.test.ts`:

```ts
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
        { name: "Mains", items: [{ name: "Chili", price: "9", tags: "spicy, contains nuts, chef's pick" }] },
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
        { name: "S", items: [{ name: "Soup", labels: ["vegan", "keto", "vegan"], tags: "vegetarian" }] },
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
      sections: [{ name: "S", description: "", items: [{ ...newDish(), name: "Pizza", on: false }] }],
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
});
```

- [ ] **Step 3: Run them and watch them fail.**

Run: `npx vitest run lib/pages/menu.test.ts`
Expected: FAIL. `./menu` doesn't exist.

- [ ] **Step 4: Implement.** Create `lib/pages/menu.ts`:

```ts
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
  for (const tag of tags.split(",").map((t) => t.trim()).filter(Boolean)) {
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
```

`lib/pages/types.ts`:

```ts
import { newDish, type DietLabel } from "./menu";

export interface PriceOption {
  label: string;
  price: string;
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  /** Other notes the labels don't cover ("contains egg"); old tags that weren't a label. */
  tags: string;
  /** Shown as a square on the row; opens the viewer (spec item 21). */
  photo: Media | null;
  labels: DietLabel[];
  /** Off keeps the dish in the editor but not on the page (spec item 23). */
  on: boolean;
  soldOut: boolean;
  popular: boolean;
  /** Up to 4; shown instead of the price (spec item 24). */
  options: PriceOption[];
}

export interface MenuSection {
  name: string;
  description: string;
  items: MenuItem[];
}
```

- Add `options: 4` to `LIMITS`.
- `PAGE_DEFAULTS.menu`'s section becomes `{ name: "Starters", description: "", items: [newDish()] }`.
- `menu.ts` imports only types from `types.ts`, so there's no import cycle at run time.

`lib/pages/sanitize.ts`:
- Add `| { kind: "enumList"; values: readonly string[]; max: number }` to `Spec`.
- In `clean`:

```ts
    case "enumList":
      return Array.isArray(raw)
        ? [...new Set(raw.filter((v): v is string => typeof v === "string" && spec.values.includes(v)))].slice(0, spec.max)
        : fallback;
```

- `emptyFor` returns `[]` for `enumList`.
- The menu schema's `sections` item becomes:

```ts
      item: {
        name: str(80),
        description: str(LIMITS.medium),
        items: {
          kind: "list",
          max: LIMITS.items,
          item: {
            name: str(),
            description: str(LIMITS.medium),
            price: str(20),
            tags: str(80),
            photo: media,
            labels: { kind: "enumList", values: DIET_LABEL_IDS, max: DIET_LABEL_IDS.length },
            // Dishes saved before they could be hidden all show.
            on: { kind: "bool", fallback: true },
            soldOut: bool,
            popular: bool,
            options: { kind: "list", max: LIMITS.options, item: { label: str(30), price: str(20) } },
          },
        },
      },
```

Add a `menu` entry to `UPGRADES`:

```ts
  // Dishes had free-text tags before they had dietary labels (spec item 22, ruling 8).
  menu: (raw) =>
    Array.isArray(raw.sections)
      ? {
          ...raw,
          sections: raw.sections.map((section) =>
            isObject(section) && Array.isArray(section.items)
              ? { ...section, items: section.items.map(upgradeDish) }
              : section,
          ),
        }
      : raw,
```

with:

```ts
const upgradeDish = (dish: unknown) => {
  if (!isObject(dish) || "labels" in dish || typeof dish.tags !== "string") return dish;
  const { labels, rest } = tagsToLabels(dish.tags);
  return { ...dish, labels, tags: rest };
};
```

`lib/pages/validate.ts`: the menu validator becomes:

```ts
  menu: (p) => {
    const errors: PageErrors = {};
    if (!p.name.trim()) errors.name = "Add the restaurant name";
    const named = p.sections
      .flatMap((s, si) => s.items.map((item, ii) => ({ item, at: `sections.${si}.items.${ii}` })))
      .filter(({ item }) => item.name.trim());
    if (!named.length) errors["sections.0.items.0.name"] = "Add at least one dish or drink";
    else if (!named.some(({ item }) => item.on)) {
      errors[`${named[0]!.at}.name`] = "Show at least one dish or drink";
    }
    p.sections.forEach((s, si) =>
      s.items.forEach((item, ii) =>
        item.options.forEach((o, oi) => {
          const at = `sections.${si}.items.${ii}.options.${oi}`;
          if (o.price.trim() && !o.label.trim()) errors[`${at}.label`] = "Name this option, like Small";
          if (o.label.trim() && !o.price.trim()) errors[`${at}.price`] = "Add its price";
        }),
      ),
    );
    return errors;
  },
```

- [ ] **Step 5: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages && npx tsc --noEmit`
Expected: PASS. Update every `MenuItem` literal TypeScript flags (tests, the Menu editor's `newItem`s) to use `newDish()`. Leave the editor's look to Task 3.

- [ ] **Step 6: Commit.**

```bash
git add lib/pages features
git commit -m "Menu dishes: dietary labels from old tags, Sold out, Hidden, Popular, price options and section descriptions"
```

---

### Task 2: The Menu page: dish photos in the viewer, labels, markers, options

**Files:**
- Modify:
  - `features/pages/Viewer.tsx` (`ViewerGroup`, `ViewerThumb`)
  - `features/pages/PageView.tsx` (`MenuView`)
- Create: `features/pages/DietMark.tsx`
- Test: `features/pages/PageView.test.tsx`

**Interfaces:**
- Consumes: Task 1's `MenuItem`, `DIET` and `priceText`.
- Produces:
  - `<ViewerGroup images={ViewerImage[]}>{children}</ViewerGroup>`;
  - `<ViewerThumb index={number} label={string} className?>{children}</ViewerThumb>`, which renders a button that opens the group's viewer, or a plain `span` outside a group (the preview);
  - `<DietMark id={DietLabel} />`.

- [ ] **Step 1: Write the failing tests.** In `features/pages/PageView.test.tsx`, import `userEvent` from `@testing-library/user-event` and `newDish` from `@/lib/pages/menu`:

```tsx
describe("Menu extras", () => {
  const dish = (patch: object) => ({ ...newDish(), ...patch });
  const menu = (items: object[]) => ({
    ...PAGE_DEFAULTS.menu(),
    name: "Diner",
    sections: [{ name: "Mains", description: "Served all day", items }],
  });

  it("shows labels, Popular, Sold out and price options, and leaves hidden dishes out", () => {
    view(
      "menu",
      menu([
        dish({ name: "Chili", price: "9", labels: ["spicy", "vegan"], popular: true }),
        dish({ name: "Pie", price: "5", soldOut: true }),
        dish({ name: "Secret", price: "1", on: false }),
        dish({
          name: "Pizza",
          price: "10",
          options: [
            { label: "Small", price: "8" },
            { label: "Large", price: "12" },
          ],
        }),
      ]),
      false,
    );
    expect(screen.getByText("Served all day")).toBeInTheDocument();
    const chili = screen.getByText("Chili").closest("li")!;
    expect(within(chili).getByText("Spicy")).toBeInTheDocument();
    expect(within(chili).getByText("Vegan")).toBeInTheDocument();
    expect(within(chili).getByText("Popular")).toBeInTheDocument();
    const pie = screen.getByText("Pie").closest("li")!;
    expect(within(pie).getByText("Sold out")).toBeInTheDocument();
    expect(screen.queryByText("Secret")).toBeNull();
    const pizza = screen.getByText("Pizza").closest("li")!;
    expect(within(pizza).getByText("Small $8")).toBeInTheDocument();
    expect(within(pizza).getByText("Large $12")).toBeInTheDocument();
    expect(within(pizza).queryByText("$10")).toBeNull();
  });

  it("opens a dish's photo full screen, captioned with its name, counting only dishes with one", async () => {
    const user = userEvent.setup();
    view(
      "menu",
      menu([
        dish({ name: "Soup", price: "4" }),
        dish({ name: "Hidden", price: "4", on: false, photo: media("h.jpg", "image/jpeg") }),
        dish({ name: "Chili", price: "9", photo: media("chili.jpg", "image/jpeg") }),
        dish({ name: "Pie", price: "5", photo: media("pie.jpg", "image/jpeg") }),
      ]),
      false,
    );
    await user.click(screen.getByRole("button", { name: "Photo of Pie" }));
    const dialog = screen.getByRole("dialog", { name: "Photo 2 of 2" });
    expect(within(dialog).getByText("Pie")).toBeInTheDocument();
  });

  it("shows dish photos but opens nothing in the editor's preview", () => {
    view("menu", menu([dish({ name: "Pie", price: "5", photo: media("pie.jpg", "image/jpeg") })]), true);
    expect(screen.queryByRole("button", { name: "Photo of Pie" })).toBeNull();
    expect(screen.getByRole("img", { name: "Pie" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/PageView.test.tsx -t "Menu extras"`
Expected: FAIL. There are no labels, markers, options, section descriptions or dish photos yet.

- [ ] **Step 3: Implement.**

`features/pages/Viewer.tsx`: add a group that one viewer serves for many thumbnails.

```tsx
const OpenPhoto = createContext<((index: number) => void) | null>(null);

/** One viewer for photos spread across a page (a menu's dishes); each ViewerThumb opens it. */
export function ViewerGroup({ images, children }: { images: ViewerImage[]; children: ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <OpenPhoto.Provider value={setIndex}>
      {children}
      <Viewer images={images} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </OpenPhoto.Provider>
  );
}

/** A photo that opens its group's viewer; outside a group (the editor's preview) it's still. */
export function ViewerThumb({
  index,
  label,
  className,
  children,
}: {
  index: number;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const open = useContext(OpenPhoto);
  if (!open) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => open(index)}
      className={cn(
        className,
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
      )}
    >
      {children}
    </button>
  );
}
```

Import `createContext`, `useContext` and `type ReactNode` from react, and `cn` from `@/lib/cn`.

`features/pages/DietMark.tsx` (no hooks, so it works on the server):

```tsx
import { Flame, Leaf, MilkOff, Nut, Vegan, WheatOff, type LucideIcon } from "lucide-react";

import { DIET, type DietLabel } from "@/lib/pages/menu";

// Halal and Kosher have no widely understood icon, so they're words alone.
const ICON: Partial<Record<DietLabel, LucideIcon>> = {
  vegan: Vegan,
  vegetarian: Leaf,
  "gluten-free": WheatOff,
  "dairy-free": MilkOff,
  spicy: Flame,
  nuts: Nut,
};

/** A dish's dietary label: its icon and its name (spec item 22). */
export function DietMark({ id }: { id: DietLabel }) {
  const Icon = ICON[id];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {DIET.find((d) => d.id === id)!.label}
    </span>
  );
}
```

`features/pages/PageView.tsx` `MenuView`:
1. **Which dishes show:**

```tsx
  const sections = page.sections
    .map((s) => ({ ...s, items: s.items.filter((item) => item.on && item.name.trim()) }))
    .filter((s) => s.items.length);
  // Every shown dish photo, in page order, for the viewer (spec item 21).
  const photos: ViewerImage[] = sections.flatMap((s) =>
    s.items.flatMap((item) =>
      item.photo ? [{ media: item.photo, alt: item.name, caption: item.name }] : [],
    ),
  );
  let photoAt = 0;
```

2. **Wrap the sections:** `{!preview && photos.length ? <ViewerGroup images={photos}>{body}</ViewerGroup> : body}`, where `body` is today's section cards.
3. **Each section:** a description `{section.description.trim() && <p className="-mt-2 mb-3 text-sm text-fg-muted">{section.description}</p>}` under its `h2`.
4. **Each dish row:**

```tsx
                <li key={j} className="flex gap-3 py-3">
                  {item.photo && (
                    <ViewerThumb
                      index={photoAt++}
                      label={`Photo of ${item.name}`}
                      className="size-16 shrink-0 overflow-hidden rounded-(--pg-radius)"
                    >
                      <MediaImage
                        media={item.photo}
                        alt={preview ? item.name : ""}
                        className={cn("size-full object-cover", item.soldOut && "opacity-50")}
                      />
                    </ViewerThumb>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold [overflow-wrap:anywhere]">
                      <span className={item.soldOut ? "text-fg-muted" : "text-fg"}>{item.name}</span>
                      {item.popular && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-(--page-accent) px-2 py-0.5 text-xs font-semibold text-(--page-accent-fg)">
                          <Star aria-hidden className="size-3" /> Popular
                        </span>
                      )}
                      {item.soldOut && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-fg-muted">
                          Sold out
                        </span>
                      )}
                    </p>
                    {item.description.trim() && (
                      <p className="mt-0.5 text-sm text-fg-muted">{item.description}</p>
                    )}
                    {item.labels.length > 0 && (
                      <ul aria-label="Dietary" className="mt-1.5 flex flex-wrap gap-1">
                        {item.labels.map((id) => (
                          <li key={id}>
                            <DietMark id={id} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.tags.trim() && <p className="mt-1 text-xs text-fg-muted">{item.tags}</p>}
                  </div>
                  <DishPrice item={item} currency={page.currency} />
                </li>
```

with:

```tsx
/** A dish's price, or its options in its place (spec item 24); struck through when sold out. */
function DishPrice({ item, currency }: { item: MenuItem; currency: string }) {
  const options = item.options.filter((o) => o.label.trim() && o.price.trim());
  const style = cn(
    "shrink-0 text-right font-semibold tabular-nums",
    item.soldOut ? "text-fg-muted line-through" : "text-fg",
  );
  if (options.length) {
    return (
      <ul className={cn(style, "max-w-[45%] text-sm [overflow-wrap:anywhere]")}>
        {options.map((o, k) => (
          <li key={k}>{`${o.label.trim()} ${priceText(o.price, currency)}`}</li>
        ))}
      </ul>
    );
  }
  return item.price.trim() ? <p className={style}>{priceText(item.price, currency)}</p> : null;
}
```

**Dropped and kept:**
- Drop the old tag pills: tags are now the dish's other notes, drawn as one line.
- Keep the jump bar as it is (from 2 sections; ruling 2).

**Imports:**
- `ViewerGroup`, `ViewerThumb` and `type ViewerImage` from `./Viewer`;
- `DietMark` from `./DietMark`;
- `priceText` from `@/lib/pages/menu`;
- `Star` from lucide;
- `cn`;
- `type MenuItem`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npx eslint features/pages`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "The Menu page: dish photos in the viewer, dietary labels, Popular, Sold out, price options and section descriptions"
```

---

### Task 3: The Menu editor

**Files:**
- Modify:
  - `features/pages/editor/editors/MenuEditor.tsx`
  - `features/pages/editor/fields.tsx` (export `MoreOptions` with a `summary`)
- Test: `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Consumes:
  - Task 1's fields, `DIET` and `newDish`;
  - `ShowSwitch`, `MoreOptions`, `MediaField`, `SortableList` and `rowName`.
- Produces: `MoreOptions({ name, problem?, summary?, children })`, exported.

- [ ] **Step 1: Write the failing tests.** In `features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("Menu editor extras", () => {
  function Menu() {
    const [page, setPage] = useState(PAGE_DEFAULTS.menu());
    return (
      <>
        <PageEditor type="menu" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);
  const dish = () => saved().sections[0].items[0];

  it("marks a dish sold out or popular, and hides it from the page", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByRole("checkbox", { name: "Sold out" }));
    await user.click(screen.getByRole("checkbox", { name: "Popular" }));
    await user.click(screen.getByRole("switch", { name: "Show item 1 on the page" }));
    expect(dish()).toMatchObject({ soldOut: true, popular: true, on: false });
  });

  it("adds dietary labels, other notes and price options under More options", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByRole("button", { name: "More options for item 1" }));
    await user.click(screen.getByRole("checkbox", { name: "Gluten-free" }));
    await user.click(screen.getByRole("checkbox", { name: "Vegan" }));
    await user.type(screen.getByRole("textbox", { name: /^Other notes/ }), "Contains egg");
    await user.click(screen.getByRole("button", { name: "Add price option" }));
    await user.type(screen.getByRole("textbox", { name: /^Option name/ }), "Small");
    await user.type(screen.getByRole("textbox", { name: /^Option price/ }), "8");
    // Labels keep the list's order, whatever order they're ticked in.
    expect(dish()).toMatchObject({
      labels: ["vegan", "gluten-free"],
      tags: "Contains egg",
      options: [{ label: "Small", price: "8" }],
    });
    expect(screen.getByRole("button", { name: "More options for item 1" })).toHaveTextContent(
      "Vegan, Gluten-free, Notes, 1 price",
    );
  });

  it("gives each section a description, and each dish a photo", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.type(screen.getByRole("textbox", { name: /^Section description/ }), "Served all day");
    expect(saved().sections[0].description).toBe("Served all day");
    await user.click(screen.getByRole("button", { name: "More options for item 1" }));
    expect(screen.getByText("Photo")).toBeInTheDocument();
  });

  it("opens More options by itself when an option inside needs fixing", () => {
    const page = PAGE_DEFAULTS.menu();
    page.sections[0]!.items[0] = { ...newDish(), name: "Pizza", options: [{ label: "", price: "8" }] };
    render(
      <PageEditor type="menu" page={page} errors={validatePage("menu", page)} onUpdate={vi.fn()} reveal />,
    );
    expect(screen.getByRole("textbox", { name: /^Option name/ })).toBeInTheDocument();
  });
});
```

- Import `newDish` from `@/lib/pages/menu`.
- In `LABELS.menu`, remove `"Tags"`: the box is now "Other notes", under More options.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "Menu editor extras"`
Expected: FAIL. There's no Sold out, Popular, Show switch, More options, labels, price options or section description yet.

- [ ] **Step 3: Implement.**

`features/pages/editor/fields.tsx`: export `MoreOptions` and give it a `summary`:

```tsx
export function MoreOptions({
  name,
  problem = false,
  summary,
  children,
}: {
  name: string;
  /** Something inside needs fixing: stay open so the person (and Show me) can reach it. */
  problem?: boolean;
  /** What's set inside, shown while it's closed ("Photo, Vegan, 2 prices"). */
  summary?: string;
  children: ReactNode;
}) {
```

- Inside the button, after "More options", add `{summary && <span className="min-w-0 truncate font-normal text-fg-muted">· {summary}</span>}`.
- The button's `aria-label` stays `More options for ${name}`.
- The test reads the button's text content, which includes the summary.

`features/pages/editor/editors/MenuEditor.tsx`:
1. **Each section:** after Section name, add `<TextField path={\`sections.${s}.description\`} errors={errors} label="Section description" optional placeholder="Served all day" value={section.description} onChange={(description) => update({ description })} />`.
   - The section's `newItem` becomes `() => ({ name: "", description: "", items: [newDish()] })`.
2. **The dishes list:**
   - `newItem={newDish}`, `off={(item) => !item.on}`;
   - `rowActions={(item, updateItem, i) => <ShowSwitch checked={item.on} onChange={(on) => updateItem({ on })} label={\`Show ${rowName("item", item.name, i)} on the page\`} />}`.
3. **Each dish:** after Description:

```tsx
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <label className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-0">
                        <input
                          type="checkbox"
                          className="size-5 accent-primary"
                          checked={item.soldOut}
                          onChange={(event) => updateItem({ soldOut: event.target.checked })}
                        />
                        Sold out
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-0">
                        <input
                          type="checkbox"
                          className="size-5 accent-primary"
                          checked={item.popular}
                          onChange={(event) => updateItem({ popular: event.target.checked })}
                        />
                        Popular
                      </label>
                    </div>
                    <MoreOptions
                      name={rowName("item", item.name, i)}
                      summary={dishSummary(item)}
                      problem={item.options.some(
                        (_, o) =>
                          errors.error(`sections.${s}.items.${i}.options.${o}.label`) ||
                          errors.error(`sections.${s}.items.${i}.options.${o}.price`),
                      )}
                    >
                      <MediaField
                        label="Photo"
                        kind="image"
                        maxSide={800}
                        hint="Shown as a small square; tapping it shows it full size."
                        value={item.photo}
                        onChange={(photo) => updateItem({ photo })}
                      />
                      <fieldset className="flex flex-col gap-2">
                        <legend className="mb-1 text-sm font-medium text-fg">Dietary labels</legend>
                        <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
                          {DIET.map((d) => (
                            <label
                              key={d.id}
                              className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-9"
                            >
                              <input
                                type="checkbox"
                                className="size-5 accent-primary"
                                checked={item.labels.includes(d.id)}
                                onChange={(event) =>
                                  updateItem({
                                    // In the list's order, whatever order they're ticked in.
                                    labels: DIET.filter((x) =>
                                      x.id === d.id ? event.target.checked : item.labels.includes(x.id),
                                    ).map((x) => x.id),
                                  })
                                }
                              />
                              {d.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <TextField
                        path={`sections.${s}.items.${i}.tags`}
                        errors={errors}
                        label="Other notes"
                        optional
                        hint="Anything the labels don’t cover, like contains egg"
                        value={item.tags}
                        onChange={(tags) => updateItem({ tags })}
                      />
                      <SortableList
                        label="Price options"
                        items={item.options}
                        onChange={(options) => updateItem({ options })}
                        max={LIMITS.options}
                        addLabel="Add price option"
                        addAt="end"
                        newRowFocus="input[data-field$='.label']"
                        path={`sections.${s}.items.${i}.options`}
                        errors={errors}
                        itemLabel={(o, k) => rowName("option", o.label, k)}
                        newItem={() => ({ label: "", price: "" })}
                        render={(o, updateOption, k) => (
                          <div className="grid gap-3 grid-cols-[1fr_6rem]">
                            <TextField
                              path={`sections.${s}.items.${i}.options.${k}.label`}
                              errors={errors}
                              label="Option name"
                              placeholder="Small"
                              value={o.label}
                              onChange={(label) => updateOption({ label })}
                            />
                            <TextField
                              path={`sections.${s}.items.${i}.options.${k}.price`}
                              errors={errors}
                              label="Option price"
                              inputMode="decimal"
                              placeholder="8"
                              value={o.price}
                              onChange={(price) => updateOption({ price })}
                            />
                          </div>
                        )}
                      />
                    </MoreOptions>
```

with, at module level:

```tsx
/** What a dish's More options holds, for its closed button: "Photo, Vegan, 2 prices". */
const dishSummary = (item: MenuItem) =>
  [
    item.photo && "Photo",
    ...DIET.filter((d) => item.labels.includes(d.id)).map((d) => d.label),
    item.tags.trim() && "Notes",
    item.options.length &&
      `${item.options.length} ${item.options.length === 1 ? "price" : "prices"}`,
  ]
    .filter(Boolean)
    .join(", ");
```

- Remove the old Tags box.
- Show the price options' hint "Shown instead of the price" with the list's label, if `SortableList` takes a hint. If it doesn't, add it to the Price box: `hint={item.options.length ? "Your price options show instead" : undefined}`.
- Imports: `DIET` and `newDish` from `@/lib/pages/menu`; `MoreOptions` and `ShowSwitch` from `../fields`; `type MenuItem`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including the every-box-has-a-limit test. The new paths are `sections.N.description` and `sections.N.items.N.options.N.label/price`.

- [ ] **Step 5: Commit.**

```bash
git add features/pages/editor
git commit -m "The Menu editor: Sold out, Popular and Show per dish; photo, dietary labels, notes and price options under More options; section descriptions"
```

---

### Task 4: QR codes and barcodes to scan

**Files:**
- Create:
  - `lib/pages/scan.ts`
  - `lib/pages/scan.test.ts`
  - `features/pages/ScanCode.tsx`
  - `features/pages/ScanCode.test.tsx`

**Interfaces:**
- Produces:
  - `qrModules(value): boolean[][]`;
  - `CODE128: string[]` (107 width patterns);
  - `code128Widths(value): number[] | null`;
  - `barcodeProblem(value): string | null`;
  - `<ScanCode kind={"qr" | "barcode"} value={string} />`.

- [ ] **Step 1: Write the failing tests.** Create `lib/pages/scan.test.ts`:

```ts
import jsQR from "jsqr";
import { describe, expect, it } from "vitest";

import { barcodeProblem, CODE128, code128Widths, qrModules } from "./scan";

/** Draws the modules 4 px each, with a quiet zone, and reads them back with jsQR. */
function decode(modules: boolean[][]): string | null {
  const n = modules.length;
  const scale = 4;
  const size = (n + 8) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  modules.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const i = (((r + 4) * scale + dy) * size + (c + 4) * scale + dx) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
    }),
  );
  return jsQR(pixels, size, size)?.data ?? null;
}

describe("a coupon's QR code", () => {
  it("decodes back to the code, accents included", () => {
    expect(decode(qrModules("SPRING20"))).toBe("SPRING20");
    expect(decode(qrModules("CAFÉ-10"))).toBe("CAFÉ-10");
  });
});

describe("a coupon's Code 128 barcode", () => {
  it("has the standard 107 patterns, each 11 modules wide (Stop 13), all different", () => {
    expect(CODE128).toHaveLength(107);
    CODE128.forEach((pattern, i) => {
      const width = [...pattern].reduce((sum, d) => sum + Number(d), 0);
      expect(width, `pattern ${i}`).toBe(i === 106 ? 13 : 11);
    });
    expect(new Set(CODE128).size).toBe(107);
    // Spot checks against the published table: space, "0", "A", Start B and Stop.
    expect(CODE128[0]).toBe("212222");
    expect(CODE128[16]).toBe("123122");
    expect(CODE128[33]).toBe("111323");
    expect(CODE128[104]).toBe("211214");
    expect(CODE128[106]).toBe("2331112");
  });

  it("encodes Start B, the characters, the check value and Stop", () => {
    // "PJJ123C": check = (104 + 1·48 + 2·42 + 3·42 + 4·17 + 5·18 + 6·19 + 7·35) mod 103 = 55.
    const widths = code128Widths("PJJ123C")!;
    const chunk = (from: number, n: number) => widths.slice(from, from + n).join("");
    expect(widths).toHaveLength(9 * 6 + 7);
    expect(chunk(0, 6)).toBe(CODE128[104]);
    expect(chunk(6, 6)).toBe(CODE128[48]);
    expect(chunk(48, 6)).toBe(CODE128[55]);
    expect(chunk(54, 7)).toBe(CODE128[106]);
  });

  it("holds up to 20 plain characters, and asks for a QR code for anything else", () => {
    expect(barcodeProblem("SAVE-20 NOW")).toBeNull();
    expect(barcodeProblem("A".repeat(21))).toMatch(/up to 20/);
    expect(barcodeProblem("CAFÉ")).toMatch(/QR code/);
    expect(code128Widths("CAFÉ")).toBeNull();
    expect(code128Widths("")).toBeNull();
  });
});
```

Create `features/pages/ScanCode.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/scan.test.ts features/pages/ScanCode.test.tsx`
Expected: FAIL. `./scan` and `./ScanCode` don't exist.

- [ ] **Step 3: Implement.** Create `lib/pages/scan.ts`:

```ts
import qrcode from "qrcode-generator";

import { detectMode, toUtf8BinaryString } from "@/lib/qr/utf8";

// The coupon code drawn for a till's scanner (spec item 26): a QR code, or a Code 128 barcode.

/** The QR code's dark modules, encoded the way the app's own QR codes are (UTF-8). */
export function qrModules(value: string): boolean[][] {
  const encoded = toUtf8BinaryString(value);
  const code = qrcode(0, "M");
  code.addData(encoded, detectMode(encoded));
  code.make();
  const n = code.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => code.isDark(r, c)));
}

/** Code 128's bar-and-space widths by value: 0–102 data, 103–105 Start A/B/C, 106 Stop. */
export const CODE128 = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const START_B = 104;
const STOP = 106;
const MAX = 20;

/** Why a code can't be a barcode, or null when it can. */
export function barcodeProblem(value: string): string | null {
  return /^[\x20-\x7E]{1,20}$/.test(value)
    ? null
    : `A barcode holds up to ${MAX} letters, numbers and symbols, without accents. Use a QR code for this one.`;
}

/** The barcode's widths in modules, bars and spaces in turn (bar first), or null if it can't be one. */
export function code128Widths(value: string): number[] | null {
  if (barcodeProblem(value)) return null;
  const values = [...value].map((ch) => ch.charCodeAt(0) - 32);
  const check = values.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  return [START_B, ...values, check, STOP].flatMap((v) => [...CODE128[v]!].map(Number));
}
```

Create `features/pages/ScanCode.tsx` (no hooks, so it renders on the server):

```tsx
import { code128Widths, qrModules } from "@/lib/pages/scan";

// Always black on white, whatever the page's theme: scanners need dark bars on light (ruling 7).
const panel = "mx-auto rounded-xl bg-white p-3";
const QUIET = 10;

/** The coupon code as a QR code or a Code 128 barcode, for the till's scanner (spec item 26). */
export function ScanCode({ kind, value }: { kind: "qr" | "barcode"; value: string }) {
  if (kind === "qr") {
    const modules = qrModules(value);
    const n = modules.length;
    const d = modules
      .flatMap((row, r) => row.map((dark, c) => (dark ? `M${c} ${r}h1v1h-1z` : "")))
      .join("");
    return (
      <div className={panel}>
        <svg
          role="img"
          aria-label={`QR code for ${value}`}
          viewBox={`-2 -2 ${n + 4} ${n + 4}`}
          shapeRendering="crispEdges"
          className="size-48"
        >
          <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
          <path d={d} fill="#000" />
        </svg>
      </div>
    );
  }
  const widths = code128Widths(value);
  if (!widths) return null;
  const total = widths.reduce((sum, w) => sum + w, 0) + QUIET * 2;
  let x = QUIET;
  const bars = widths.map((w, i) => {
    const bar = i % 2 === 0 ? <rect data-bar key={i} x={x} y={0} width={w} height={60} fill="#000" /> : null;
    x += w;
    return bar;
  });
  return (
    <div className={`${panel} w-full max-w-sm`}>
      <svg
        role="img"
        aria-label={`Barcode for ${value}`}
        viewBox={`0 0 ${total} 60`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="h-24 w-full"
      >
        <rect width={total} height={60} fill="#fff" />
        {bars}
      </svg>
    </div>
  );
}
```

- Check that `detectMode` and `toUtf8BinaryString` are exported from `lib/qr/utf8.ts`; `lib/qr/test-utils.ts` imports them.
- The `CODE128` table is one line per ten values; keep prettier from reflowing it with a `// prettier-ignore` above it.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages/scan.test.ts features/pages/ScanCode.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages/scan.ts lib/pages/scan.test.ts features/pages/ScanCode.tsx features/pages/ScanCode.test.tsx
git commit -m "Coupon codes as a QR code or a Code 128 barcode, black on white"
```

---

### Task 5: The Coupon: code to scan, countdown, badge, and editing them

**Files:**
- Create:
  - `lib/pages/countdown.ts`
  - `lib/pages/countdown.test.ts`
  - `features/pages/useMinute.ts`
  - `features/pages/Countdowns.tsx`
- Modify:
  - `features/pages/OpenStatus.tsx` (uses `useMinute`)
  - `lib/pages/types.ts` (`CouponPage`)
  - `lib/pages/sanitize.ts`
  - `lib/pages/validate.ts`
  - `features/pages/PageView.tsx` (`CouponView`; drop `formatDate`)
  - `features/pages/editor/editors/CouponEditor.tsx`
- Test:
  - `lib/pages/pages.test.ts`
  - `features/pages/PageView.test.tsx`
  - `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Consumes: Task 4's `ScanCode` and `barcodeProblem`.
- Produces:
  - `CouponPage.scan: "text" | "qr" | "barcode"` (default `"text"`) and `CouponPage.badge: string` (12);
  - `localDate(at): string`, `formatDay(value): string` and `couponDeadlineText(validUntil, today): string`;
  - `useMinute(): number | null` (ms, floored to the minute; null on the server);
  - `<CouponDeadline validUntil />`.

- [ ] **Step 1: Write the failing tests.** Create `lib/pages/countdown.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { couponDeadlineText, localDate } from "./countdown";

describe("a coupon's countdown", () => {
  it("counts down the last week, then says it ended", () => {
    expect(couponDeadlineText("2030-01-20", "2030-01-01")).toBe("Valid until January 20, 2030");
    expect(couponDeadlineText("2030-01-08", "2030-01-01")).toBe("Ends in 7 days");
    expect(couponDeadlineText("2030-01-04", "2030-01-01")).toBe("Ends in 3 days");
    expect(couponDeadlineText("2030-01-02", "2030-01-01")).toBe("Ends tomorrow");
    expect(couponDeadlineText("2030-01-01", "2030-01-01")).toBe("Ends today");
    expect(couponDeadlineText("2029-12-31", "2030-01-01")).toBe("This offer has ended");
    expect(couponDeadlineText("", "2030-01-01")).toBe("");
    expect(couponDeadlineText("soon", "2030-01-01")).toBe("");
  });

  it("reads today in the visitor's own time zone", () => {
    expect(localDate(new Date(2030, 0, 1, 23, 59))).toBe("2030-01-01");
    expect(localDate(new Date(2030, 0, 2, 0, 0))).toBe("2030-01-02");
  });
});
```

In `lib/pages/pages.test.ts`:

```ts
describe("Coupon scan and badge", () => {
  it("reads an old coupon as text only with no badge", () => {
    expect(sanitizePage("coupon", { offer: "20% OFF", code: "X" })).toMatchObject({
      scan: "text",
      badge: "",
    });
    expect(sanitizePage("coupon", { offer: "X", scan: "laser" }).scan).toBe("text");
  });

  it("needs a code to scan, and one a barcode can hold", () => {
    const coupon = { ...PAGE_DEFAULTS.coupon(), offer: "20% OFF" };
    expect(validatePage("coupon", { ...coupon, scan: "qr", code: "" })).toEqual({
      code: "Add the code to scan",
    });
    expect(validatePage("coupon", { ...coupon, scan: "qr", code: "CAFÉ" })).toEqual({});
    expect(validatePage("coupon", { ...coupon, scan: "barcode", code: "CAFÉ" }).code).toMatch(
      /QR code/,
    );
  });
});
```

In `features/pages/PageView.test.tsx`:

```tsx
describe("Coupon extras", () => {
  afterEach(() => vi.useRealTimers());

  it("shows the badge, the code to scan, and the countdown", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2030, 0, 1, 12));
    view(
      "coupon",
      {
        ...PAGE_DEFAULTS.coupon(),
        offer: "20% OFF",
        badge: "NEW",
        code: "SAVE20",
        scan: "qr",
        validUntil: "2030-01-04",
      },
      false,
    );
    expect(screen.getByText("NEW")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR code for SAVE20" })).toBeInTheDocument();
    expect(screen.getByText("Ends in 3 days")).toBeInTheDocument();
  });

  it("keeps an old coupon's code as text only", () => {
    view("coupon", { ...PAGE_DEFAULTS.coupon(), offer: "20% OFF", code: "SAVE20" }, false);
    expect(screen.queryByRole("img", { name: /SAVE20/ })).toBeNull();
    expect(screen.getByText("SAVE20")).toBeInTheDocument();
  });
});
```

In `features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("Coupon editor extras", () => {
  function Coupon() {
    const [page, setPage] = useState(PAGE_DEFAULTS.coupon());
    return (
      <>
        <PageEditor type="coupon" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("adds a badge and chooses how the code shows", async () => {
    const user = userEvent.setup();
    render(<Coupon />);
    await user.type(screen.getByRole("textbox", { name: /^Badge/ }), "NEW");
    await user.click(screen.getByRole("radio", { name: "Barcode" }));
    expect(saved()).toMatchObject({ badge: "NEW", scan: "barcode" });
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/countdown.test.ts lib/pages/pages.test.ts features/pages/PageView.test.tsx features/pages/editor/PageEditor.test.tsx`
Expected: FAIL. There's no countdown, scan, badge or editor control yet.

- [ ] **Step 3: Implement.**

Create `lib/pages/countdown.ts`:

```ts
// Countdowns for coupons and events (spec items 27 and 34). Pure: the caller passes the time.

/** A YYYY-MM-DD date in the device's own time zone. */
export function localDate(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (date: string) => {
  const [y = 2000, m = 1, d = 1] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** "January 20, 2030" from "2030-01-20". */
export function formatDay(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** "Ends in 3 days" in the last week, "This offer has ended" after it; "" without a date. */
export function couponDeadlineText(validUntil: string, today: string): string {
  if (!DATE.test(validUntil) || !DATE.test(today)) return "";
  const days = dayNumber(validUntil) - dayNumber(today);
  if (days < 0) return "This offer has ended";
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days <= 7) return `Ends in ${days} days`;
  return `Valid until ${formatDay(validUntil)}`;
}
```

Create `features/pages/useMinute.ts` from `OpenStatus`'s clock:

```ts
"use client";

import { useSyncExternalStore } from "react";

const subscribe = (tick: () => void) => {
  const id = window.setInterval(tick, 30_000);
  return () => window.clearInterval(id);
};
// The minute, so the snapshot only changes when a countdown's text could.
const minute = () => Math.floor(Date.now() / 60_000);

/** Now, floored to the minute, in the browser; null while rendering on the server. */
export function useMinute(): number | null {
  const now = useSyncExternalStore(subscribe, minute, () => null);
  return now === null ? null : now * 60_000;
}
```

`OpenStatus` then reads `const now = useMinute();` and passes `new Date(now)`. Drop its own `subscribe` and `minute`.

Create `features/pages/Countdowns.tsx`:

```tsx
"use client";

import { couponDeadlineText, formatDay, localDate } from "@/lib/pages/countdown";

import { useMinute } from "./useMinute";

/** A coupon's end date, counting down its last week on the visitor's own date (spec item 27). */
export function CouponDeadline({ validUntil }: { validUntil: string }) {
  const now = useMinute();
  // On the server (and until the page loads), the plain date.
  const text =
    now === null
      ? validUntil && `Valid until ${formatDay(validUntil)}`
      : couponDeadlineText(validUntil, localDate(new Date(now)));
  if (!text) return null;
  const ended = text === "This offer has ended";
  const soon = !ended && !text.startsWith("Valid");
  return (
    <p className={ended ? "font-semibold text-danger" : soon ? "font-semibold text-fg" : "text-sm text-fg-muted"}>
      {text}
    </p>
  );
}
```

`lib/pages/types.ts` `CouponPage` gains:

```ts
  /** How the code shows for a till's scanner (spec item 26). */
  scan: "text" | "qr" | "barcode";
  /** A short stamp on the coupon's corner, like NEW (spec item 28, ruling 1). */
  badge: string;
```

The defaults add `scan: "text", badge: ""`.

`lib/pages/sanitize.ts` coupon schema gains `scan: { kind: "enum", values: ["text", "qr", "barcode"] }` and `badge: str(12)`.

`lib/pages/validate.ts` coupon gains:

```ts
    if (p.scan !== "text") {
      if (!p.code.trim()) errors.code = "Add the code to scan";
      else if (p.scan === "barcode") {
        const problem = barcodeProblem(p.code.trim());
        if (problem) errors.code = problem;
      }
    }
```

`features/pages/PageView.tsx` `CouponView`:
- Delete `formatDate` and `expired`.
- The coupon card becomes `<PageCard className={cn("relative flex flex-col items-center gap-4 text-center", page.badge.trim() && "pt-9")}>`, opening with:

```tsx
        {page.badge.trim() && (
          <span className="absolute -top-4 right-4 rotate-3 rounded-full bg-(--page-accent) px-4 py-1.5 font-page-heading text-xl font-bold text-(--page-accent-fg) shadow-card">
            {page.badge.trim()}
          </span>
        )}
```

- Before `CopyCode`: `{page.scan !== "text" && page.code.trim() && <ScanCode kind={page.scan} value={page.code.trim()} />}`.
- The validity line becomes `<CouponDeadline validUntil={page.validUntil} />`.

`features/pages/editor/editors/CouponEditor.tsx`, in the Offer card:
- After the Offer and Coupon code grid:

```tsx
        <Labeled label="Show the code as">
          <SegmentedControl
            aria-label="Show the code as"
            size="touch"
            value={page.scan}
            onChange={(scan) => set({ scan })}
            options={[
              { value: "text", label: "Text" },
              { value: "qr", label: "QR code" },
              { value: "barcode", label: "Barcode" },
            ]}
          />
        </Labeled>
        {page.scan !== "text" && (
          <p className="text-sm text-fg-muted">
            Shown with the code, for scanning at the till. Turn your screen brightness up.
          </p>
        )}
```

- After Headline: `<TextField path="badge" errors={errors} label="Badge" optional placeholder="NEW" hint="A short stamp on the coupon’s corner" value={page.badge} onChange={(badge) => set({ badge })} />`.
- Import `Labeled` from `../Labeled` and `SegmentedControl` from `@/components/ui/SegmentedControl`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including the Release 2b `OpenStatus` test.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages features/pages
git commit -m "Coupons: a QR code or barcode to scan, a countdown in the last week, and a corner badge"
```

---

### Task 6: Event data and page: online, directions, agenda, hosts, countdown

**Files:**
- Modify:
  - `lib/pages/types.ts` (`EventPage`, `AgendaItem`, `Host`, `LIMITS.agenda/hosts`)
  - `lib/pages/sanitize.ts`
  - `lib/pages/validate.ts`
  - `lib/pages/countdown.ts`
  - `features/pages/Countdowns.tsx`
  - `features/pages/PageView.tsx` (`EventView`)
- Test:
  - `lib/pages/countdown.test.ts`
  - `lib/pages/pages.test.ts`
  - `features/pages/PageView.test.tsx`

**Interfaces:**
- Consumes:
  - `eventTimes(event)` from `lib/pages/files.ts` (`{ start, end }`, with no end treated as an hour);
  - `formatTime` from `lib/pages/hours.ts`;
  - Task 5's `useMinute`.
- Produces:
  - `EventPage` gains `online: boolean`, `joinUrl: string`, `agenda: AgendaItem[]` and `hosts: Host[]`;
  - `AgendaItem = { time: string; title: string; note: string }` ("" for no time);
  - `Host = { photo: Media | null; name: string; role: string }`;
  - `eventCountdownText(times, now)`, `joinOpen(times, now)` and `JOIN_EARLY`;
  - `<EventCountdown event />` and `<JoinButton event preview />`.

- [ ] **Step 1: Write the failing tests.** In `lib/pages/countdown.test.ts`, add `eventCountdownText` and `joinOpen` to the import:

```ts
describe("an event's countdown", () => {
  const times = { start: new Date("2030-01-10T18:00:00Z"), end: new Date("2030-01-10T21:00:00Z") };
  const at = (iso: string) => new Date(iso);

  it("counts down in days and hours, then hours and minutes, then minutes", () => {
    expect(eventCountdownText(times, at("2030-01-07T14:00:00Z"))).toBe("Starts in 3 days 4 hours");
    expect(eventCountdownText(times, at("2030-01-09T18:00:00Z"))).toBe("Starts in 1 day");
    expect(eventCountdownText(times, at("2030-01-10T13:50:00Z"))).toBe("Starts in 4 hours 10 minutes");
    expect(eventCountdownText(times, at("2030-01-10T17:00:00Z"))).toBe("Starts in 1 hour");
    expect(eventCountdownText(times, at("2030-01-10T17:35:00Z"))).toBe("Starts in 25 minutes");
    expect(eventCountdownText(times, at("2030-01-10T17:59:30Z"))).toBe("Starts in less than a minute");
  });

  it("says happening now from the start, and ended from the end", () => {
    expect(eventCountdownText(times, at("2030-01-10T18:00:00Z"))).toBe("Happening now");
    expect(eventCountdownText(times, at("2030-01-10T20:59:00Z"))).toBe("Happening now");
    expect(eventCountdownText(times, at("2030-01-10T21:00:00Z"))).toBe("This event has ended");
    expect(eventCountdownText(null, at("2030-01-10T21:00:00Z"))).toBe("");
  });

  it("opens the join link 15 minutes before the start, until the end", () => {
    expect(joinOpen(times, at("2030-01-10T17:44:00Z"))).toBe(false);
    expect(joinOpen(times, at("2030-01-10T17:45:00Z"))).toBe(true);
    expect(joinOpen(times, at("2030-01-10T20:59:00Z"))).toBe(true);
    expect(joinOpen(times, at("2030-01-10T21:00:00Z"))).toBe(false);
    expect(joinOpen(null, at("2030-01-10T18:00:00Z"))).toBe(false);
  });
});
```

In `lib/pages/pages.test.ts`:

```ts
describe("Event online, agenda and hosts", () => {
  const event = {
    ...PAGE_DEFAULTS.event(),
    title: "Launch",
    start: "2030-01-10T13:00",
    timeZone: "America/New_York",
  };

  it("reads an old event as in person, with no agenda or hosts", () => {
    expect(sanitizePage("event", { title: "Old" })).toMatchObject({
      online: false,
      joinUrl: "",
      agenda: [],
      hosts: [],
    });
  });

  it("needs a join link for an online event, a title per agenda row, and a name per host", () => {
    expect(validatePage("event", { ...event, online: true })).toEqual({
      joinUrl: "Add the link to join",
    });
    expect(validatePage("event", { ...event, online: true, joinUrl: "not a link" })).toEqual({
      joinUrl: "Enter a web address, like example.com",
    });
    // A join link left over from when it was online isn't checked once it's off.
    expect(validatePage("event", { ...event, online: false, joinUrl: "not a link" })).toEqual({});
    expect(
      validatePage("event", {
        ...event,
        agenda: [
          { time: "13:00", title: "", note: "" },
          { time: "25:00", title: "Late", note: "" },
        ],
        hosts: [{ photo: null, name: "", role: "Speaker" }],
      }),
    ).toEqual({
      "agenda.0.title": "Add what’s happening",
      "agenda.1.time": "Pick a time",
      "hosts.0.name": "Add their name",
    });
  });
});
```

In `features/pages/PageView.test.tsx`:

```tsx
describe("Event extras", () => {
  afterEach(() => vi.useRealTimers());
  // 13:00 in New York is 18:00 UTC in January.
  const event = (patch: object = {}) => ({
    ...PAGE_DEFAULTS.event(),
    title: "Launch",
    start: "2030-01-10T13:00",
    end: "2030-01-10T16:00",
    timeZone: "America/New_York",
    location: "1 Main St",
    online: true,
    joinUrl: "https://meet.example.com/launch",
    ...patch,
  });

  it("counts down, and turns the Join button on 15 minutes before the start", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-01-10T17:35:00Z"));
    const { unmount } = view("event", event(), false);
    expect(screen.getByText("Starts in 25 minutes")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Join online/ })).toBeNull();
    expect(screen.getByText("The link opens 15 minutes before the start")).toBeInTheDocument();
    unmount();
    vi.setSystemTime(new Date("2030-01-10T17:50:00Z"));
    view("event", event(), false);
    expect(screen.getByRole("link", { name: /Join online/ })).toHaveAttribute(
      "href",
      "https://meet.example.com/launch",
    );
  });

  it("shows the online event, Directions to the place, the agenda and the hosts", () => {
    view(
      "event",
      event({
        agenda: [{ time: "13:00", title: "Doors open", note: "Coffee" }],
        hosts: [{ photo: null, name: "Ana Rivera", role: "Host" }],
      }),
      false,
    );
    expect(screen.getByText("Online event")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Directions" })).toHaveAttribute(
      "href",
      expect.stringContaining("maps"),
    );
    const agenda = within(screen.getByRole("region", { name: "Agenda" }));
    expect(agenda.getByText("1:00 PM")).toBeInTheDocument();
    expect(agenda.getByText("Doors open")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Hosts" })).getByText("Ana Rivera")).toBeInTheDocument();
  });

  it("keeps the Join button inert in the editor's preview", () => {
    view("event", event(), true);
    expect(screen.queryByRole("link", { name: /Join online/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages features/pages/PageView.test.tsx`
Expected: FAIL. There's no event countdown, join window, online/agenda/hosts fields, or event parts yet.

- [ ] **Step 3: Implement.**

`lib/pages/countdown.ts`:

```ts
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Starts in 3 days 4 hours", "Happening now" or "This event has ended" (spec item 34). */
export function eventCountdownText(times: { start: Date; end: Date } | null, now: Date): string {
  if (!times) return "";
  if (now >= times.end) return "This event has ended";
  if (now >= times.start) return "Happening now";
  const minutes = Math.floor((times.start.getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return "Starts in less than a minute";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `Starts in ${plural(days, "day")}${hours ? ` ${plural(hours, "hour")}` : ""}`;
  if (hours) return `Starts in ${plural(hours, "hour")}${mins ? ` ${plural(mins, "minute")}` : ""}`;
  return `Starts in ${plural(mins, "minute")}`;
}

/** How early the join link opens (spec item 30). */
export const JOIN_EARLY = 15 * 60_000;

export const joinOpen = (times: { start: Date; end: Date } | null, now: Date) =>
  times !== null && now.getTime() >= times.start.getTime() - JOIN_EARLY && now < times.end;
```

`features/pages/Countdowns.tsx`:

```tsx
/** "Starts in 3 days 4 hours", updating each minute; nothing until the page loads (spec item 34). */
export function EventCountdown({ event }: { event: EventPage }) {
  const now = useMinute();
  if (now === null) return null;
  const text = eventCountdownText(eventTimes(event), new Date(now));
  if (!text) return null;
  const live = text === "Happening now";
  return (
    <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
      <span
        aria-hidden
        className={live ? "size-2.5 rounded-full bg-(--page-accent)" : "size-2.5 rounded-full bg-fg-muted"}
      />
      {text}
    </p>
  );
}

/** The online event's Join button: a link from 15 minutes before the start until the end. */
export function JoinButton({ event, preview }: { event: EventPage; preview?: boolean }) {
  const now = useMinute();
  const times = eventTimes(event);
  const href = safeHref(event.joinUrl);
  if (!event.online || !href) return null;
  if (now !== null && times && now >= times.end.getTime()) return null;
  // Inert in the preview, like every button there; outside its window, a note instead of a link.
  if (preview) return <PageLink href={href} preview><Video aria-hidden /> Join online</PageLink>;
  if (now !== null && joinOpen(times, new Date(now))) {
    return <PageLink href={href}><Video aria-hidden /> Join online</PageLink>;
  }
  return (
    <p className="flex min-h-12 items-center justify-center gap-2 rounded-(--pg-btn-radius) border-2 border-dashed border-border px-4 text-center text-sm text-fg-muted">
      <Video aria-hidden className="size-5 shrink-0" /> The link opens 15 minutes before the start
    </p>
  );
}
```

Imports:
- `eventTimes` from `@/lib/pages/files`;
- `eventCountdownText` and `joinOpen` from `@/lib/pages/countdown`;
- `safeHref` from `@/lib/pages/urls`;
- `type EventPage`;
- `Video` from lucide;
- `PageLink` from `./parts`.

The plain note has no link, so `queryByRole("link", { name: /Join online/ })` finds nothing before the window.

`lib/pages/types.ts`:

```ts
export interface AgendaItem {
  /** HH:mm, or "" for no time. */
  time: string;
  title: string;
  note: string;
}

export interface Host {
  photo: Media | null;
  name: string;
  role: string;
}
```

- `EventPage` gains:

  ```ts
  /** Adds the Join button (spec item 30). */
  online: boolean;
  joinUrl: string;
  agenda: AgendaItem[];
  hosts: Host[];
  ```

- `LIMITS` gains `agenda: 30, hosts: 12`.
- The defaults add `online: false, joinUrl: "", agenda: [], hosts: []`.

`lib/pages/sanitize.ts` event schema gains:

```ts
    online: bool,
    joinUrl: str(2048),
    agenda: {
      kind: "list",
      max: LIMITS.agenda,
      item: { time: str(5), title: str(LIMITS.short), note: str(LIMITS.medium) },
    },
    hosts: { kind: "list", max: LIMITS.hosts, item: { photo: media, name: str(80), role: str(80) } },
```

`lib/pages/validate.ts` event gains:

```ts
    if (p.online) {
      if (!p.joinUrl.trim()) errors.joinUrl = "Add the link to join";
      else checkUrl(errors, "joinUrl", p.joinUrl);
    }
    p.agenda.forEach((a, i) => {
      if ((a.time || a.note.trim()) && !a.title.trim()) errors[`agenda.${i}.title`] = "Add what’s happening";
      if (a.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)) errors[`agenda.${i}.time`] = "Pick a time";
    });
    p.hosts.forEach((h, i) => {
      if ((h.role.trim() || h.photo) && !h.name.trim()) errors[`hosts.${i}.name`] = "Add their name";
    });
```

`features/pages/PageView.tsx` `EventView`:
1. **The countdown:** at the top of the first card, `<EventCountdown event={page} />`.
2. **Online:** in the list of facts, when `page.online`, add a row `<li className="flex gap-3"><Video aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--page-accent)]" /><span className="font-medium text-fg">Online event</span></li>`.
3. **The location row:** the address becomes plain text, with a Directions link under it (ruling 11):

```tsx
            <li className="flex gap-3">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--page-accent)]" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-medium text-fg [overflow-wrap:anywhere]">{page.location}</span>
                <a
                  href={preview ? undefined : mapsHref(page.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-[var(--page-accent)] underline-offset-4 hover:underline sm:min-h-0"
                >
                  Directions
                </a>
              </span>
            </li>
```

   In the preview the link has no `href`, so it isn't a link, as elsewhere.
4. **The buttons:** `<JoinButton event={page} preview={preview} />` comes first, before the ticket button.
5. **The agenda:** after About this event, when any row has a title:

```tsx
        <PageCard>
          <section aria-label="Agenda">
            <h2 className="mb-3 font-page-heading text-lg font-bold text-fg">Agenda</h2>
            <ol className="divide-y divide-border">
              {agenda.map((a, i) => (
                <li key={i} className="grid grid-cols-[5rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="font-semibold text-fg tabular-nums">{a.time && formatTime(a.time)}</span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block font-medium text-fg">{a.title}</span>
                    {a.note.trim() && <span className="block text-sm text-fg-muted">{a.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </PageCard>
```

   `agenda` is `page.agenda.filter((a) => a.title.trim())`.
6. **The hosts:** when any host has a name:

```tsx
        <PageCard>
          <section aria-label="Hosts">
            <h2 className="mb-3 font-page-heading text-lg font-bold text-fg">Hosts</h2>
            <ul className="grid grid-cols-1 gap-4 min-[22rem]:grid-cols-2">
              {hosts.map((h, i) => (
                <li key={i} className="flex min-w-0 items-center gap-3">
                  {h.photo ? (
                    <MediaImage media={h.photo} alt="" className="size-14 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-2 font-semibold text-fg-muted">
                      {h.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block font-semibold text-fg">{h.name}</span>
                    {h.role.trim() && <span className="block text-sm text-fg-muted">{h.role}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </PageCard>
```

   `hosts` is `page.hosts.filter((h) => h.name.trim())`.

Imports:
- `EventCountdown`, `JoinButton` and `CouponDeadline` from `./Countdowns`;
- `formatTime` from `@/lib/pages/hours` (already imported);
- `Video` from lucide.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages features/pages
git commit -m "Events: online with a Join button that opens 15 minutes early, Directions, an agenda, hosts and a live countdown"
```

---

### Task 7: The Event editor

**Files:**
- Modify: `features/pages/editor/editors/EventEditor.tsx`
- Test: `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Consumes: Task 6's fields, `SortableList`, `MediaField`, `ToggleField` and `rowName`.

- [ ] **Step 1: Write the failing tests.** In `features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("Event editor extras", () => {
  function Event() {
    const [page, setPage] = useState(PAGE_DEFAULTS.event());
    return (
      <>
        <PageEditor type="event" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("turns on Online event for a join link, and adds agenda rows and hosts", async () => {
    const user = userEvent.setup();
    render(<Event />);
    expect(screen.queryByRole("textbox", { name: /^Join link/ })).toBeNull();
    await user.click(screen.getByRole("switch", { name: /^Online event/ }));
    await user.type(screen.getByRole("textbox", { name: /^Join link/ }), "meet.example.com/x");
    await user.click(screen.getByRole("button", { name: "Add agenda item" }));
    await user.type(screen.getByRole("textbox", { name: /^What’s happening/ }), "Doors open");
    await user.click(screen.getByRole("button", { name: "Add host" }));
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ana");
    expect(saved()).toMatchObject({
      online: true,
      joinUrl: "meet.example.com/x",
      agenda: [{ title: "Doors open" }],
      hosts: [{ name: "Ana" }],
    });
  });
});
```

In `CARDS.event`, list `["Header", "When", "Where", "Details", "Agenda", "Hosts and speakers", "Tickets"]`.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "Event editor extras|cards come"`
Expected: FAIL. There's no Online event switch, agenda or hosts.

- [ ] **Step 3: Implement.** In `features/pages/editor/editors/EventEditor.tsx`:
1. **The Where card:** before Location:

```tsx
        <ToggleField
          label="Online event"
          description="Adds a Join button that works from 15 minutes before the start"
          checked={page.online}
          onChange={(online) => set({ online })}
        />
        {page.online && (
          <TextField
            label="Join link"
            type="url"
            inputMode="url"
            value={page.joinUrl}
            onChange={(joinUrl) => set({ joinUrl })}
            path="joinUrl"
            errors={errors}
            placeholder="zoom.us/j/…"
          />
        )}
```

   Location's hint becomes "Leave empty for an online-only event" when `page.online`.
2. **An "Agenda" card** after Details:

```tsx
      <FormCard title="Agenda">
        <SortableList
          label="Agenda"
          showLabel={false}
          items={page.agenda}
          onChange={(agenda) => set({ agenda })}
          max={LIMITS.agenda}
          addLabel="Add agenda item"
          addAt="end"
          newRowFocus="input[data-field$='.title']"
          path="agenda"
          errors={errors}
          itemLabel={(item, i) => rowName("agenda item", item.title, i)}
          newItem={() => ({ time: "", title: "", note: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <TextField
                  path={`agenda.${i}.time`}
                  errors={errors}
                  label="Time"
                  optional
                  type="time"
                  value={item.time}
                  onChange={(time) => update({ time })}
                />
                <TextField
                  path={`agenda.${i}.title`}
                  errors={errors}
                  label="What’s happening"
                  placeholder="Doors open"
                  value={item.title}
                  onChange={(title) => update({ title })}
                />
              </div>
              <TextField
                path={`agenda.${i}.note`}
                errors={errors}
                label="Note"
                optional
                value={item.note}
                onChange={(note) => update({ note })}
              />
            </div>
          )}
        />
      </FormCard>
```

3. **A "Hosts and speakers" card** after it:

```tsx
      <FormCard title="Hosts and speakers">
        <SortableList
          label="Hosts and speakers"
          showLabel={false}
          items={page.hosts}
          onChange={(hosts) => set({ hosts })}
          max={LIMITS.hosts}
          addLabel="Add host"
          addAt="end"
          newRowFocus="input[data-field$='.name']"
          path="hosts"
          errors={errors}
          itemLabel={(item, i) => rowName("host", item.name, i)}
          newItem={() => ({ photo: null, name: "", role: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <MediaField
                label="Photo"
                kind="image"
                round
                maxSide={400}
                value={item.photo}
                onChange={(photo) => update({ photo })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  path={`hosts.${i}.name`}
                  errors={errors}
                  label="Name"
                  value={item.name}
                  onChange={(name) => update({ name })}
                />
                <TextField
                  path={`hosts.${i}.role`}
                  errors={errors}
                  label="Role"
                  optional
                  placeholder="Keynote speaker"
                  value={item.role}
                  onChange={(role) => update({ role })}
                />
              </div>
            </div>
          )}
        />
      </FormCard>
```

Imports: `LIMITS`, `rowName`, `SortableList` (from `../sortable/SortableList`) and `MediaField`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including the every-box-has-a-limit test. The new paths are `joinUrl`, `agenda.N.time/title/note` and `hosts.N.name/role`; time boxes are excluded as in Release 1.

- [ ] **Step 5: Commit.**

```bash
git add features/pages/editor
git commit -m "The Event editor: Online event with a join link, an agenda, and hosts and speakers"
```

---

### Task 8: Browser tests

**Files:**
- Modify: `e2e/accounts/fixtures.ts`
- Create: `e2e/accounts/menu-coupon-event.spec.ts`

- [ ] **Step 1: Add the fixture pages to `PHONE_PAGES`,** so the phone sweep and the axe sweep (`LOOK_PAGES`, each on its type's theme) cover them. Photos are placeholder paths, as in Release 2b.

```ts
const photo = (name: string) => ({
  path: `00000000-0000-4000-8000-000000000000/${name}.jpg`,
  name: `${name}.jpg`,
  type: "image/jpeg",
  size: 1000,
});
```

```ts
  {
    // Every Menu extra: 3 sections with descriptions, photos, labels, markers, options, an old tag.
    type: "menu",
    slug: "PHONE-MENU-PLUS",
    content: {
      name: "Phone Bistro",
      currency: "$",
      sections: ["Starters", "Mains", "Desserts"].map((name, s) => ({
        name,
        description: `${name} are made to order.`,
        items: Array.from({ length: 7 }, (_, i) => ({
          name: i === 0 ? "A very long dish name that has to wrap on a small phone screen" : `${name} ${i + 1}`,
          description: "Fresh, local and seasonal.",
          price: `${8 + i}`,
          photo: i < 2 ? photo(`dish-${s}-${i}`) : null,
          labels: i === 1 ? ["vegan", "gluten-free", "spicy", "nuts"] : [],
          popular: i === 2,
          soldOut: i === 3,
          on: i !== 4,
          options:
            i === 5
              ? [
                  { label: "Small", price: "8" },
                  { label: "Large family size to share", price: "14" },
                ]
              : [],
          // An old dish: its tags become labels.
          ...(i === 6 && { labels: undefined, tags: "Vegan, GF, house special" }),
        })),
      })),
    },
  },
  {
    type: "coupon",
    slug: "PHONE-COUPON-QR",
    content: {
      business: "Phone Cafe",
      offer: "20% OFF",
      badge: "NEW",
      code: "SAVE20",
      scan: "qr",
      validUntil: "2099-12-31",
    },
  },
  {
    type: "coupon",
    slug: "PHONE-COUPON-BAR",
    content: { business: "Phone Cafe", offer: "2 FOR 1", code: "BAR128", scan: "barcode" },
  },
  {
    type: "event",
    slug: "PHONE-EVENT-PLUS",
    content: {
      title: "Phone launch",
      start: "2099-12-05T18:00",
      end: "2099-12-05T21:00",
      timeZone: "America/New_York",
      location: "100 Main Street, Springfield",
      online: true,
      joinUrl: "https://meet.example.com/launch",
      agenda: Array.from({ length: 8 }, (_, i) => ({
        time: `${18 + Math.floor(i / 3)}:${["00", "20", "40"][i % 3]}`,
        title: `Agenda item ${i + 1}`,
        note: "With time for questions.",
      })),
      hosts: Array.from({ length: 4 }, (_, i) => ({
        photo: i < 2 ? photo(`host-${i}`) : null,
        name: `Host number ${i + 1}`,
        role: "Speaker",
      })),
    },
  },
```

For the old dish, set `labels` to `undefined`: `JSON.stringify` drops it, so the stored dish has no `labels` key, and the upgrade runs.

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/menu-coupon-event.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

test.describe("Menu, Coupon and Event extras", () => {
  test.use({ storageState: MAKER.state });

  test("the menu shows labels, markers and options, hides a hidden dish, and upgrades old tags", async ({
    page,
  }) => {
    await page.goto("p/PHONE-MENU-PLUS");
    await expect(page.getByRole("navigation", { name: "Menu sections" }).getByRole("link")).toHaveCount(3);
    await expect(page.getByText("Starters are made to order.")).toBeVisible();
    await expect(page.getByText("Sold out").first()).toBeVisible();
    await expect(page.getByText("Popular").first()).toBeVisible();
    await expect(page.getByText("Starters 5")).toHaveCount(0);
    await expect(page.getByText("Large family size to share $14").first()).toBeVisible();
    const old = page.getByText("Starters 7").locator("xpath=ancestor::li[1]");
    await expect(old.getByText("Vegan")).toBeVisible();
    await expect(old.getByText("Gluten-free")).toBeVisible();
    await expect(old.getByText("house special")).toBeVisible();
  });

  test("an old menu's vegetarian tag is now a label", async ({ page }) => {
    await page.goto("p/PHONE-MENU");
    await expect(page.getByText("Vegetarian").first()).toBeVisible();
  });

  test("a dish photo opens the viewer with the dish's name", async ({ page }) => {
    await page.goto("p/PHONE-MENU-PLUS");
    await page.getByRole("button", { name: /^Photo of Starters 2/ }).click();
    const dialog = page.getByRole("dialog", { name: "Photo 2 of 6" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Starters 2")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a coupon shows its badge, its QR code, and counts down its last days", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2099-12-29T12:00:00"));
    await page.goto("p/PHONE-COUPON-QR");
    await expect(page.getByText("NEW", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "QR code for SAVE20" })).toBeVisible();
    await expect(page.getByText("Ends in 2 days")).toBeVisible();
    await page.goto("p/PHONE-COUPON-BAR");
    await expect(page.getByRole("img", { name: "Barcode for BAR128" })).toBeVisible();
  });

  test("an online event counts down and opens its Join link 15 minutes early", async ({ page }) => {
    // 18:00 in New York is 23:00 UTC in December.
    await page.clock.setFixedTime(new Date("2099-12-05T22:40:00Z"));
    await page.goto("p/PHONE-EVENT-PLUS");
    await expect(page.getByText("Starts in 20 minutes")).toBeVisible();
    await expect(page.getByText("The link opens 15 minutes before the start")).toBeVisible();
    await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Agenda" }).getByText("Agenda item 8")).toBeVisible();
    await expect(page.getByRole("region", { name: "Hosts" }).getByText("Host number 4")).toBeVisible();
    await page.clock.setFixedTime(new Date("2099-12-05T22:50:00Z"));
    await page.reload();
    await expect(page.getByRole("link", { name: /Join online/ })).toHaveAttribute(
      "href",
      "https://meet.example.com/launch",
    );
  });

  test("the editors add a dish label, a scan code and an agenda row", async ({ page }) => {
    await page.goto("codes/new?type=menu");
    await page.getByRole("button", { name: "More options for item 1" }).click();
    await page.getByRole("checkbox", { name: "Vegan" }).check();
    await page.goto("codes/new?type=coupon");
    await page.getByRole("textbox", { name: /^Coupon code/ }).fill("SAVE20");
    await page.getByRole("radio", { name: "QR code" }).click();
    const preview = page.getByRole("complementary", { name: "Preview" });
    await expect(preview.getByRole("img", { name: "QR code for SAVE20" })).toBeVisible();
    await page.goto("codes/new?type=event");
    await page.getByRole("button", { name: "Add agenda item" }).click();
    await expect(page.locator("[data-field='agenda.0.title']")).toBeFocused();
  });
});
```

Moving from the menu editor to the coupon editor may raise the unsaved-changes guard. If it does, start each editor in its own test.

- [ ] **Step 3: Run the signed-in suite.**

Run: `npm run test:e2e:accounts`
Expected: all PASS, including the phone sweep and the look sweep for the new pages. If a phone profile shows sideways scroll or axe flags a color, fix the code, not the test.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts
git commit -m "Browser tests: menu labels, markers, options and dish photos; coupon badge, QR, barcode and countdown; event countdown, Join, agenda and hosts"
```

---

### Task 9: Ship Release 3

There's no migration in this release; it's all page content.

- [ ] **Step 1: Update the API docs.** In `app/(docs)/developers/page.tsx`, after the Contact and Business paragraph, add:

> Menu dishes take `photo`, `labels` (any of `vegan`, `vegetarian`, `gluten-free`, `dairy-free`, `spicy`, `nuts`, `halal`, `kosher`), `on` (false hides it), `soldOut`, `popular`, and `options` (up to 4, each a `label` and `price`, shown instead of the price). `tags` holds other notes; an older dish's tags that name a label become that label. Sections take a `description`. Coupons take `scan` (`text`, `qr` or `barcode`; a barcode holds up to 20 plain characters) and a `badge` (up to 12 characters). Events take `online` with a `joinUrl`, an `agenda` (up to 30, each a `time` as `HH:mm`, a `title` and a `note`), and `hosts` (up to 12, each a `photo`, `name` and `role`).

Commit it.

- [ ] **Step 2: Run the full local check.**

Run: `npm run format:check && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS. `format:check` may list only git-ignored files under `.superpowers/`.

- [ ] **Step 3: Run the final whole-branch review.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings. Do one fix pass.

- [ ] **Step 4: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r3
gh pr create --base main --head feat/page-enhancements-r3 --title "Page enhancements 3: Menu photos, labels and options; Coupon scan codes and countdown; Event online, agenda, hosts and countdown" --body "<summary of items 21–28, 30–32 and 34, no migration, and the test counts from Step 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 5: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Find client chunks containing "Add price option", "Show the code as" and "Add agenda item".
3. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
4. Create nothing and change no data in David's account.
