import { readFileSync } from "node:fs";

// Test-only accounts for the disposable local Supabase; never used anywhere else.
export const AUTH_DIR = "e2e/accounts/.auth";
export const SEED_FILE = `${AUTH_DIR}/seed.json`;

export const OWNER = {
  email: "owner@example.com",
  password: "owner-e2e-pass-2026",
  name: "Olivia Owner",
  state: `${AUTH_DIR}/owner.json`,
};

export const VIEWER = {
  email: "viewer@example.com",
  password: "viewer-e2e-pass-2026",
  name: "Victor Viewer",
  state: `${AUTH_DIR}/viewer.json`,
};

/** Creates codes in the Create tests, so the owner's seeded list stays as the other tests expect. */
export const MAKER = {
  email: "maker@example.com",
  password: "maker-e2e-pass-2026",
  name: "Max Maker",
  state: `${AUTH_DIR}/maker.json`,
};

/** Teams whose tests remove or leave: kept apart so the owner's and viewer's tests never change. */
export const PAT = {
  email: "pat@example.com",
  password: "pat-e2e-pass-2026",
  name: "Pat Owner",
  state: `${AUTH_DIR}/pat.json`,
};
export const QUINN = {
  email: "quinn@example.com",
  password: "quinn-e2e-pass-2026",
  name: "Quinn Editor",
  state: `${AUTH_DIR}/quinn.json`,
};
export const RAY = {
  email: "ray@example.com",
  password: "ray-e2e-pass-2026",
  name: "Ray Owner",
  state: `${AUTH_DIR}/ray.json`,
};
export const SKY = {
  email: "sky@example.com",
  password: "sky-e2e-pass-2026",
  name: "Sky Viewer",
  state: `${AUTH_DIR}/sky.json`,
};

export interface Seed {
  ownerId: string;
  viewerId: string;
  /** The owner's "Spring menu" trackable code. */
  menuId: string;
  /** The owner's "Flyers" folder, holding the Wi-Fi code. */
  folderId: string;
  /** The Maker account, and its empty "Posters" folder. */
  makerId: string;
  makerFolderId: string;
  /** The viewer's own code, "Victor note". */
  viewerCodeId: string;
  /** Ray's team, which Sky leaves in a test. */
  rayId: string;
  skyId: string;
}

/** Ids created by the global setup. Read it inside tests, not at import time. */
export function seed(): Seed {
  return JSON.parse(readFileSync(SEED_FILE, "utf8")) as Seed;
}

/** Owns one hosted page of each type for the phone layout checks. Never signs in. */
export const PAGES = {
  email: "pages@example.com",
  password: "pages-e2e-pass-2026",
  name: "Paige Pages",
};

const links = Array.from({ length: 14 }, (_, i) => ({
  label: `Link number ${i + 1}`,
  url: `https://example.com/${i + 1}`,
}));
const dishes = (course: string) =>
  Array.from({ length: 6 }, (_, i) => ({
    name: `${course} ${i + 1}`,
    description: "Made fresh every morning.",
    price: `${8 + i}`,
    tags: "vegetarian",
  }));

/** One page per hosted type, long enough to scroll on a phone where the type allows it. */
export const PHONE_PAGES: { type: string; slug: string; content: Record<string, unknown> }[] = [
  {
    type: "links",
    slug: "PHONE-LINKS",
    content: { title: "Phone links", bio: "Every link on one page.", links, socials: [] },
  },
  {
    // A title as long as a real business's, and a long address in the line under it.
    type: "links",
    slug: "PHONE-LONG",
    content: {
      title: "Mario's Pizzeria & Bakery 2026",
      bio: "Order at https://www.example.com/order/online/mario-pizzeria-and-bakery/main-street-location",
      links,
      socials: [],
    },
  },
  {
    // Every Link list extra: a header, an icon, a featured link, an email link, brand socials.
    type: "links",
    slug: "PHONE-EXTRAS",
    content: {
      title: "Link extras",
      bio: "",
      links: [
        { label: "Shop", url: "", on: true, kind: "header" },
        { label: "Instagram", url: "instagram.com/ziplume", on: true, featured: true },
        { label: "Email us", url: "hi@example.com", on: true, type: "email" },
        // No button text, so the address itself is the label, and it has nowhere to break.
        { label: "", url: "reservations@mariospizzeriaandbakery.com", on: true, type: "email" },
        {
          label: "Later",
          url: "example.com/later",
          on: true,
          showFrom: "2999-01-01T00:00:00.000Z",
        },
      ],
      socials: [
        { network: "instagram", url: "ziplume" },
        { network: "snapchat", url: "ziplume" },
        { network: "website", url: "example.com" },
      ],
      look: { theme: "paper", socialStyle: "brand", socialSize: "large" },
    },
  },
  {
    type: "vcard",
    slug: "PHONE-VCARD",
    content: {
      firstName: "Pat",
      lastName: "Phone",
      jobTitle: "Tester",
      company: "Ziplume",
      bio: "Checks pages on phones.",
      phones: [{ label: "Mobile", number: "+1 555 010 2026" }],
      emails: [{ label: "Work", address: "pat@example.com" }],
      website: "https://example.com",
      address: "100 Main Street, Springfield",
      socials: [],
    },
  },
  {
    type: "business",
    slug: "PHONE-BIZ",
    content: {
      name: "Phone Cafe",
      tagline: "Open late",
      about: "Coffee and cake.",
      phone: "+1 555 010 2026",
      email: "cafe@example.com",
      website: "https://example.com",
      address: "100 Main Street, Springfield",
      showHours: true,
      buttons: [{ label: "Order ahead", url: "https://example.com/order" }],
      socials: [],
    },
  },
  {
    type: "menu",
    slug: "PHONE-MENU",
    content: {
      name: "Phone Diner",
      description: "All day breakfast.",
      currency: "$",
      sections: [
        { name: "Starters", items: dishes("Starter") },
        { name: "Mains", items: dishes("Main") },
      ],
      note: "Prices include tax.",
    },
  },
  {
    type: "coupon",
    slug: "PHONE-COUPON",
    content: {
      business: "Phone Cafe",
      offer: "20% OFF",
      headline: "On your next visit",
      description: "Show this at the counter.",
      code: "PHONE20",
      validUntil: "2099-12-31",
      terms: "One per visit.",
      buttonLabel: "Visit us",
      buttonUrl: "https://example.com",
    },
  },
  {
    type: "event",
    slug: "PHONE-EVENT",
    content: {
      title: "Phone party",
      start: "2099-12-05T18:00",
      end: "2099-12-05T21:00",
      timeZone: "America/New_York",
      allDay: false,
      location: "100 Main Street, Springfield",
      description: "A test event.",
      organizer: "Ziplume",
      ticketUrl: "https://example.com/tickets",
      ticketLabel: "Get tickets",
    },
  },
  {
    type: "feedback",
    slug: "PHONE-FEEDBACK",
    content: {
      business: "Phone Cafe",
      question: "How was your visit?",
      allowComment: true,
      askContact: true,
      thanks: "Thank you!",
    },
  },
  {
    type: "pdf",
    slug: "PHONE-PDF",
    content: { title: "Phone brochure", description: "A test PDF page.", direct: false },
  },
  {
    type: "images",
    slug: "PHONE-IMAGES",
    content: { title: "Phone gallery", description: "No images yet.", images: [] },
  },
  // No video link, so the page shows its placeholder instead of loading a player.
  {
    type: "video",
    slug: "PHONE-VIDEO",
    content: { title: "Phone video", description: "A test video page.", url: "" },
  },
  {
    type: "audio",
    slug: "PHONE-AUDIO",
    content: {
      title: "Phone tune",
      artist: "Ziplume",
      description: "A test audio page.",
      link: "https://example.com/listen",
    },
  },
  {
    type: "app",
    slug: "PHONE-APP",
    content: {
      name: "Phone app",
      description: "A test app page.",
      iosUrl: "https://apps.apple.com/app/id1",
      androidUrl: "https://play.google.com/store/apps/details?id=com.example",
      webUrl: "https://example.com",
    },
  },
];

/** A paused Link list: visitors get the "paused" notice. */
/** Each type's own theme (spec 6.2). */
const TYPE_THEMES: Record<string, string> = {
  links: "ziplume",
  app: "ziplume",
  vcard: "paper",
  business: "paper",
  feedback: "paper",
  pdf: "paper",
  menu: "sand",
  coupon: "sunset",
  event: "grape",
  images: "midnight",
  video: "midnight",
  audio: "ocean",
};

/** A Link list in each theme, and each type on its own theme (a look with only a theme). */
export const LOOK_PAGES: { type: string; slug: string; content: Record<string, unknown> }[] = [
  ...["ziplume", "paper", "midnight", "ocean", "sunset", "grape", "forest", "blush", "sand"].map(
    (theme) => ({
      type: "links",
      slug: `LOOK-${theme.toUpperCase()}`,
      content: {
        title: `Theme ${theme}`,
        bio: "Every theme stays readable.",
        links: [
          { label: "First link", url: "https://example.com/1" },
          { label: "Second link", url: "https://example.com/2" },
        ],
        socials: [{ network: "instagram", url: "@ziplume" }],
        look: { theme },
      },
    }),
  ),
  ...PHONE_PAGES.map((page) => ({
    ...page,
    slug: page.slug.replace("PHONE-", "TYPE-"),
    content: { ...page.content, look: { theme: TYPE_THEMES[page.type] } },
  })),
];

export const PAUSED_PAGE_SLUG = "PHONE-PAUSED";
