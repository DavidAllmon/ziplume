import type { PageTypeId } from "@/lib/qr/types";

import { SOCIAL_ICONS } from "./social-icons.data";

// Content for hosted pages: what the owner edits and what scanners see at /p/<slug>.
// Stored as JSON in qr_codes.content, so every reader runs it through sanitizePage first.

/** A file in the page-media storage bucket. `path` is relative to the bucket. */
export interface Media {
  path: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
}

export interface LinkItem {
  label: string;
  url: string;
}

export const SOCIAL_NETWORKS = [
  ...SOCIAL_ICONS.map((icon) => icon.id),
  "linkedin",
  "website",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export interface SocialItem {
  network: SocialNetwork;
  url: string;
}

export interface PhoneItem {
  label: string;
  number: string;
}

export interface EmailItem {
  label: string;
  address: string;
}

export interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  tags: string;
}

export interface MenuSection {
  name: string;
  items: MenuItem[];
}

interface Themed {
  /** Accent color for buttons and the header. */
  color: string;
}

export interface LinksPage extends Themed {
  title: string;
  bio: string;
  avatar: Media | null;
  links: LinkItem[];
  socials: SocialItem[];
}

export interface VcardPage extends Themed {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  bio: string;
  photo: Media | null;
  phones: PhoneItem[];
  emails: EmailItem[];
  website: string;
  address: string;
  socials: SocialItem[];
}

export interface BusinessPage extends Themed {
  name: string;
  tagline: string;
  about: string;
  logo: Media | null;
  cover: Media | null;
  phone: string;
  email: string;
  website: string;
  address: string;
  /** Monday first. */
  hours: DayHours[];
  showHours: boolean;
  buttons: LinkItem[];
  socials: SocialItem[];
}

export interface MenuPage extends Themed {
  name: string;
  description: string;
  logo: Media | null;
  currency: string;
  sections: MenuSection[];
  note: string;
}

export interface CouponPage extends Themed {
  business: string;
  headline: string;
  offer: string;
  description: string;
  code: string;
  validUntil: string;
  terms: string;
  buttonLabel: string;
  buttonUrl: string;
  image: Media | null;
}

export interface EventPage extends Themed {
  title: string;
  /** Local date and time, YYYY-MM-DDTHH:mm, in timeZone. */
  start: string;
  end: string;
  timeZone: string;
  allDay: boolean;
  location: string;
  description: string;
  organizer: string;
  ticketUrl: string;
  ticketLabel: string;
  image: Media | null;
}

export interface FeedbackPage extends Themed {
  business: string;
  logo: Media | null;
  question: string;
  allowComment: boolean;
  askContact: boolean;
  thanks: string;
}

export interface PdfPage extends Themed {
  title: string;
  description: string;
  file: Media | null;
  /** Skip the page and open the file straight away. */
  direct: boolean;
}

export interface ImagesPage extends Themed {
  title: string;
  description: string;
  images: Media[];
}

export interface VideoPage extends Themed {
  title: string;
  description: string;
  source: "link" | "upload";
  url: string;
  file: Media | null;
}

export interface AudioPage extends Themed {
  title: string;
  artist: string;
  description: string;
  cover: Media | null;
  file: Media | null;
  link: string;
}

export interface AppPage extends Themed {
  name: string;
  description: string;
  icon: Media | null;
  iosUrl: string;
  androidUrl: string;
  webUrl: string;
}

export interface PageContentMap {
  links: LinksPage;
  vcard: VcardPage;
  business: BusinessPage;
  menu: MenuPage;
  coupon: CouponPage;
  event: EventPage;
  feedback: FeedbackPage;
  pdf: PdfPage;
  images: ImagesPage;
  video: VideoPage;
  audio: AudioPage;
  app: AppPage;
}

export type PageContent = PageContentMap[PageTypeId];

export const LIMITS = {
  links: 30,
  socials: 16,
  phones: 4,
  emails: 4,
  buttons: 6,
  sections: 20,
  items: 60,
  images: 24,
  short: 120,
  medium: 300,
  long: 2000,
} as const;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const day = (open: boolean): DayHours => ({ open, from: "09:00", to: "17:00" });

export const DEFAULT_PAGE_COLOR = "#4F46E5";

export const PAGE_DEFAULTS: { [K in PageTypeId]: () => PageContentMap[K] } = {
  links: () => ({
    color: DEFAULT_PAGE_COLOR,
    title: "",
    bio: "",
    avatar: null,
    links: [{ label: "", url: "" }],
    socials: [],
  }),
  vcard: () => ({
    color: DEFAULT_PAGE_COLOR,
    firstName: "",
    lastName: "",
    jobTitle: "",
    company: "",
    bio: "",
    photo: null,
    phones: [{ label: "Mobile", number: "" }],
    emails: [{ label: "Work", address: "" }],
    website: "",
    address: "",
    socials: [],
  }),
  business: () => ({
    color: DEFAULT_PAGE_COLOR,
    name: "",
    tagline: "",
    about: "",
    logo: null,
    cover: null,
    phone: "",
    email: "",
    website: "",
    address: "",
    hours: [day(true), day(true), day(true), day(true), day(true), day(false), day(false)],
    showHours: true,
    buttons: [],
    socials: [],
  }),
  menu: () => ({
    color: "#B45309",
    name: "",
    description: "",
    logo: null,
    currency: "$",
    sections: [{ name: "Starters", items: [{ name: "", description: "", price: "", tags: "" }] }],
    note: "",
  }),
  coupon: () => ({
    color: "#BE123C",
    business: "",
    headline: "",
    offer: "",
    description: "",
    code: "",
    validUntil: "",
    terms: "",
    buttonLabel: "",
    buttonUrl: "",
    image: null,
  }),
  event: () => ({
    color: "#7C3AED",
    title: "",
    start: "",
    end: "",
    timeZone: "",
    allDay: false,
    location: "",
    description: "",
    organizer: "",
    ticketUrl: "",
    ticketLabel: "Get tickets",
    image: null,
  }),
  feedback: () => ({
    color: "#0F766E",
    business: "",
    logo: null,
    question: "How was your visit?",
    allowComment: true,
    askContact: false,
    thanks: "Thank you! Your feedback helps us improve.",
  }),
  pdf: () => ({ color: DEFAULT_PAGE_COLOR, title: "", description: "", file: null, direct: false }),
  images: () => ({ color: DEFAULT_PAGE_COLOR, title: "", description: "", images: [] }),
  video: () => ({
    color: "#DC2626",
    title: "",
    description: "",
    source: "link",
    url: "",
    file: null,
  }),
  audio: () => ({
    color: "#0E7490",
    title: "",
    artist: "",
    description: "",
    cover: null,
    file: null,
    link: "",
  }),
  app: () => ({
    color: DEFAULT_PAGE_COLOR,
    name: "",
    description: "",
    icon: null,
    iosUrl: "",
    androidUrl: "",
    webUrl: "",
  }),
};

export interface PageTypeInfo {
  label: string;
  /** One line for the type picker and dashboard. */
  description: string;
  emptyHint: string;
}

export const PAGE_TYPES: Record<PageTypeId, PageTypeInfo> = {
  links: {
    label: "Link list",
    description: "All your links and social profiles on one page",
    emptyHint: "Add a title and a link",
  },
  vcard: {
    label: "Contact page",
    description: "A digital business card with a Save contact button",
    emptyHint: "Add your name",
  },
  business: {
    label: "Business",
    description: "Hours, address, contact buttons and links",
    emptyHint: "Add your business name",
  },
  menu: {
    label: "Menu",
    description: "A restaurant or café menu with prices",
    emptyHint: "Add a name and a dish",
  },
  coupon: {
    label: "Coupon",
    description: "A discount with a code customers can copy",
    emptyHint: "Add an offer",
  },
  event: {
    label: "Event",
    description: "Date, place and an Add to calendar button",
    emptyHint: "Add a title and start time",
  },
  feedback: {
    label: "Feedback",
    description: "Star ratings and comments, collected for you",
    emptyHint: "Add your business name",
  },
  pdf: {
    label: "PDF",
    description: "Share a document, like a brochure or price list",
    emptyHint: "Upload a PDF",
  },
  images: { label: "Images", description: "A photo gallery", emptyHint: "Add some images" },
  video: {
    label: "Video",
    description: "A video from YouTube, Vimeo or an upload",
    emptyHint: "Add a video",
  },
  audio: {
    label: "Audio",
    description: "A song, podcast or voice message",
    emptyHint: "Add an audio file or link",
  },
  app: {
    label: "App",
    description: "Sends phones to the right app store",
    emptyHint: "Add a store link",
  },
};
