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
  /** Maker's feedback page (MAKER-FEEDBACK): stars, thumbs and 0 to 10. */
  makerFeedbackId: string;
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

/** A placeholder photo: the parts that show it are tested, not the picture. */
const photo = (name: string) => ({
  path: `00000000-0000-4000-8000-000000000000/${name}.jpg`,
  name: `${name}.jpg`,
  type: "image/jpeg",
  size: 1000,
  // Every upload records its size, so pages hold the space before the picture loads.
  width: 1200,
  height: 900,
});

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
    // Every Contact page extra: pronouns, department, quick buttons, several websites.
    type: "vcard",
    slug: "PHONE-CONTACT-PLUS",
    content: {
      firstName: "Ana",
      lastName: "Rivera",
      pronouns: "she/her",
      jobTitle: "Designer",
      department: "Brand",
      company: "Acme",
      phones: [{ label: "Mobile", number: "+1 555 010 2030", whatsapp: true }],
      emails: [{ label: "Work", address: "ana@example.com" }],
      websites: [
        { label: "Portfolio", url: "example.com/ana" },
        { label: "Studio", url: "example.com/studio" },
      ],
      address: "1 Main St, Springfield",
      socials: [],
    },
  },
  {
    // Every Business extra: split hours, a closure, a gallery, a ready-made button, services.
    type: "business",
    slug: "PHONE-BIZ-PLUS",
    content: {
      name: "Mario's Pizzeria & Bakery",
      tagline: "Since 1999",
      about: "Wood-fired pizza and fresh bread.",
      timeZone: "America/New_York",
      showHours: true,
      hours: [
        { open: true, from: "09:00", to: "12:00", from2: "13:00", to2: "17:00" },
        ...Array.from({ length: 4 }, () => ({ open: true, from: "09:00", to: "17:00" })),
        { open: false, from: "09:00", to: "17:00" },
        { open: false, from: "09:00", to: "17:00" },
      ],
      closures: [{ date: "2099-12-25", note: "Christmas" }],
      // Placeholder files: the row and the viewer are what's tested, not the photos.
      gallery: Array.from({ length: 6 }, (_, i) => ({
        path: `00000000-0000-4000-8000-000000000000/photo-${i + 1}.jpg`,
        name: `photo-${i + 1}.jpg`,
        type: "image/jpeg",
        size: 1000,
      })),
      buttons: [
        { label: "Leave a Google review", url: "https://g.page/r/abc", on: true, icon: "review" },
      ],
      services: Array.from({ length: 12 }, (_, i) => ({
        name: `Catering package ${i + 1}`,
        price: "$120",
        description: "Feeds ten",
      })),
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
          name:
            i === 0
              ? "A very long dish name that has to wrap on a small phone screen"
              : `${name} ${i + 1}`,
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
    type: "feedback",
    slug: "PHONE-FEEDBACK-PLUS",
    content: {
      business: "Phone Bistro",
      questions: [
        { text: "How was the food, the service and the atmosphere this evening?", style: "faces" },
        { text: "Would you come back?", style: "thumbs" },
        { text: "How likely are you to recommend us to a friend?", style: "scale" },
      ],
      allowComment: true,
      askContact: true,
      thanks: "Thank you!",
      reviewUrl: "https://g.page/r/abc/review",
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
  {
    type: "images",
    slug: "PHONE-IMAGES-GRID3",
    content: {
      title: "Phone grid",
      layout: "grid3",
      images: Array.from({ length: 7 }, (_, i) => ({
        image: photo(`grid-${i}`),
        caption: i === 0 ? "A long caption that describes the first picture in detail" : "",
        link: i === 0 ? "https://example.com/first" : "",
      })),
    },
  },
  {
    type: "images",
    slug: "PHONE-IMAGES-SINGLE",
    content: {
      title: "Phone column",
      layout: "single",
      images: Array.from({ length: 3 }, (_, i) => ({
        image: photo(`col-${i}`),
        caption: i === 0 ? "Acaptionwithonelongunbrokenwordthatmustwrapratherthanwidenthepage" : "",
        link: "",
      })),
    },
  },
  {
    type: "images",
    slug: "PHONE-IMAGES-CAROUSEL",
    content: {
      title: "Phone carousel",
      layout: "carousel",
      images: Array.from({ length: 4 }, (_, i) => ({
        image: photo(`slide-${i}`),
        caption:
          i === 0 ? "Slide1withaverylongunbrokencaptionthatkeepsgoingandgoing" : `Slide ${i + 1}`,
        link: "",
      })),
    },
  },
  {
    type: "video",
    slug: "PHONE-VIDEO-PLUS",
    content: {
      title: "Phone clips",
      description: "Three ways to watch.",
      videos: [
        {
          title: "On TikTok",
          url: "https://www.tiktok.com/@cafe/video/7234567890123456789",
          start: "",
        },
        {
          title: "On Loom",
          url: "https://www.loom.com/share/0123456789abcdef0123456789abcdef",
          start: "0:10",
        },
        // One long unbroken word, like a handle: it must wrap, not widen the page.
        {
          title: "@thelittlebakeryonmainstreetinspringfieldusa",
          url: "https://example.com/video",
          start: "",
        },
      ],
    },
  },
  {
    type: "app",
    slug: "PHONE-APP-PLUS",
    content: {
      name: "Phone app plus",
      iosUrl: "https://apps.apple.com/app/id1",
      androidUrl: "https://play.google.com/store/apps/details?id=com.example",
      storeRedirect: false,
      screenshots: Array.from({ length: 5 }, (_, i) => photo(`shot-${i}`)),
      features: [
        { text: "Works offline" },
        { text: "Syncs across every device you own, even very old ones" },
      ],
    },
  },
  {
    type: "pdf",
    slug: "PHONE-PDF-LIST",
    content: {
      title: "Phone menus",
      files: [
        {
          file: {
            path: "00000000-0000-4000-8000-000000000000/food.pdf",
            name: "food.pdf",
            type: "application/pdf",
            size: 120000,
          },
          title: "Food menu with a long name that wraps on phones",
          preview: photo("food-page"),
        },
        {
          file: {
            path: "00000000-0000-4000-8000-000000000000/wine.pdf",
            name: "wine.pdf",
            type: "application/pdf",
            size: 80000,
          },
          title: "",
          preview: null,
        },
      ],
    },
  },
  {
    type: "audio",
    slug: "PHONE-AUDIO-PLUS",
    content: {
      title: "Phone album",
      artist: "Ziplume",
      link: "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
      listen: [
        "https://music.apple.com/us/album/x/1",
        "https://music.youtube.com/playlist?list=x",
        "https://music.amazon.com/albums/x",
        "https://www.deezer.com/album/1",
        "https://listen.tidal.com/album/1",
        "https://soundcloud.com/artist/sets/x",
        "https://artist.bandcamp.com/album/x",
        "https://podcasts.apple.com/us/podcast/x/id1",
      ].map((url) => ({ url })),
      tracks: [
        {
          title: "Intro",
          file: {
            path: "00000000-0000-4000-8000-000000000000/intro.mp3",
            name: "intro.mp3",
            type: "audio/mpeg",
            size: 1000,
          },
          link: "",
        },
        {
          title: "Live at the hall, a very long track title",
          file: null,
          link: "https://example.com/live",
        },
      ],
    },
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
