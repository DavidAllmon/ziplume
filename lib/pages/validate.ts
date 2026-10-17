import type { PageTypeId } from "@/lib/qr/types";
import { isTimeZone, zonedTimeToUtc } from "@/lib/time/zone";

import { overLimit } from "./sanitize";
import type { LinkItem, PageContentMap, SocialItem } from "./types";
import { linkHref } from "./links";
import { mailHref, safeHref, socialHref, telHref, videoEmbed } from "./urls";

/** Problems keyed by field path, e.g. "title" or "links.2.url". Empty = ready to save. */
export type PageErrors = Record<string, string>;

const URL_MESSAGE = "Enter a web address, like example.com";

const checkUrl = (errors: PageErrors, path: string, value: string) => {
  if (value.trim() && !safeHref(value)) errors[path] = URL_MESSAGE;
};

const checkSocials = (errors: PageErrors, socials: SocialItem[]) => {
  socials.forEach((s, i) => {
    if (s.url.trim() && !socialHref(s.network, s.url)) {
      errors[`socials.${i}.url`] = "Paste the profile link or type @handle";
    }
  });
};

const checkLink = (errors: PageErrors, path: string, l: LinkItem) => {
  if (l.kind === "header" || !l.on) return;
  if (l.label.trim() && !l.url.trim())
    errors[`${path}.url`] = `Add the link for “${l.label.trim()}”`;
  else if (l.url.trim() && !linkHref(l)) {
    errors[`${path}.url`] =
      l.type === "email"
        ? "Enter a valid email"
        : l.type === "phone" || l.type === "sms"
          ? "Enter a valid phone number"
          : URL_MESSAGE;
  }
  const from = l.showFrom ? Date.parse(l.showFrom) : NaN;
  const until = l.showUntil ? Date.parse(l.showUntil) : NaN;
  if (!Number.isNaN(from) && !Number.isNaN(until) && until <= from) {
    errors[`${path}.showUntil`] = "End after the start";
  }
};

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const VALIDATORS: { [K in PageTypeId]: (page: PageContentMap[K]) => PageErrors } = {
  links: (p) => {
    const errors: PageErrors = {};
    if (!p.title.trim()) errors.title = "Add a title";
    const filled = (l: LinkItem) => l.kind !== "header" && Boolean(l.label.trim() || l.url.trim());
    // A link that's off is parked: it isn't checked and doesn't count.
    if (!p.links.some((l) => l.on && filled(l)) && !p.socials.some((s) => s.url.trim())) {
      errors["links.0.url"] = p.links.some(filled)
        ? "Turn on at least one link"
        : "Add at least one link";
    }
    p.links.forEach((l, i) => checkLink(errors, `links.${i}`, l));
    checkSocials(errors, p.socials);
    return errors;
  },
  vcard: (p) => {
    const errors: PageErrors = {};
    if (!p.firstName.trim() && !p.lastName.trim() && !p.company.trim()) {
      errors.firstName = "Add a name or company";
    }
    p.phones.forEach((ph, i) => {
      if (ph.number.trim() && !telHref(ph.number))
        errors[`phones.${i}.number`] = "Enter a valid phone number";
    });
    p.emails.forEach((e, i) => {
      if (e.address.trim() && !mailHref(e.address))
        errors[`emails.${i}.address`] = "Enter a valid email";
    });
    p.websites.forEach((w, i) => checkUrl(errors, `websites.${i}.url`, w.url));
    checkSocials(errors, p.socials);
    return errors;
  },
  business: (p) => {
    const errors: PageErrors = {};
    if (!p.name.trim()) errors.name = "Add the business name";
    if (p.phone.trim() && !telHref(p.phone)) errors.phone = "Enter a valid phone number";
    if (p.email.trim() && !mailHref(p.email)) errors.email = "Enter a valid email";
    checkUrl(errors, "website", p.website);
    p.buttons.forEach((b, i) => checkLink(errors, `buttons.${i}`, b));
    p.hours.forEach((h, i) => {
      if (h.open && h.from >= h.to) errors[`hours.${i}`] = "Closing time must be after opening";
      else if (h.open && (h.from2 || h.to2)) {
        if (!h.from2 || !h.to2 || h.from2 >= h.to2 || h.from2 < h.to) {
          errors[`hours.${i}`] =
            "The second hours must start after the first and end after they start";
        }
      }
    });
    p.closures.forEach((c, i) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date)) errors[`closures.${i}.date`] = "Pick a date";
    });
    if (p.timeZone && !isTimeZone(p.timeZone)) errors.timeZone = "Choose a time zone";
    checkSocials(errors, p.socials);
    return errors;
  },
  menu: (p) => {
    const errors: PageErrors = {};
    if (!p.name.trim()) errors.name = "Add the restaurant name";
    const items = p.sections.flatMap((s) => s.items).filter((item) => item.name.trim());
    if (!items.length) errors["sections.0.items.0.name"] = "Add at least one dish or drink";
    return errors;
  },
  coupon: (p) => {
    const errors: PageErrors = {};
    if (!p.offer.trim() && !p.headline.trim()) errors.offer = "Add the offer, like 20% off";
    if (p.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(p.validUntil))
      errors.validUntil = "Pick a date";
    if (p.buttonLabel.trim() && !p.buttonUrl.trim()) errors.buttonUrl = "Add the button’s link";
    checkUrl(errors, "buttonUrl", p.buttonUrl);
    return errors;
  },
  event: (p) => {
    const errors: PageErrors = {};
    if (!p.title.trim()) errors.title = "Add the event name";
    if (!LOCAL_DATE_TIME.test(p.start)) errors.start = "Pick when the event starts";
    if (p.end && !LOCAL_DATE_TIME.test(p.end)) errors.end = "Pick when the event ends";
    if (!isTimeZone(p.timeZone)) errors.timeZone = "Pick a time zone";
    if (!errors.start && !errors.end && p.end && p.end <= p.start)
      errors.end = "The end must be after the start";
    if (
      !errors.start &&
      !errors.timeZone &&
      Number.isNaN(zonedTimeToUtc(p.start, p.timeZone).getTime())
    ) {
      errors.start = "Pick when the event starts";
    }
    checkUrl(errors, "ticketUrl", p.ticketUrl);
    return errors;
  },
  feedback: (p) => {
    const errors: PageErrors = {};
    if (!p.business.trim()) errors.business = "Add the business name";
    if (!p.question.trim()) errors.question = "Add a question";
    return errors;
  },
  pdf: (p): PageErrors => (p.file ? {} : { file: "Upload a PDF" }),
  images: (p): PageErrors => (p.images.length ? {} : { images: "Add at least one image" }),
  video: (p): PageErrors => {
    if (!p.url.trim()) return { url: "Paste a YouTube or Vimeo link" };
    return videoEmbed(p.url) || safeHref(p.url) ? {} : { url: URL_MESSAGE };
  },
  audio: (p) => {
    const errors: PageErrors = {};
    if (!p.file && !p.link.trim()) errors.file = "Upload an audio file or add a link";
    checkUrl(errors, "link", p.link);
    return errors;
  },
  app: (p) => {
    const errors: PageErrors = {};
    if (!p.name.trim()) errors.name = "Add the app name";
    if (!p.iosUrl.trim() && !p.androidUrl.trim())
      errors.iosUrl = "Add an App Store or Google Play link";
    checkUrl(errors, "iosUrl", p.iosUrl);
    checkUrl(errors, "androidUrl", p.androidUrl);
    checkUrl(errors, "webUrl", p.webUrl);
    return errors;
  },
};

export function validatePage<K extends PageTypeId>(type: K, page: PageContentMap[K]): PageErrors {
  const errors = VALIDATORS[type](page);
  // Text over its limit comes after the type's own problems, so Show me goes to those first.
  for (const [path, message] of Object.entries(overLimit(type, page))) errors[path] ??= message;
  return errors;
}

/** A short description of the page for lists, e.g. its title. */
export function pageSummary<K extends PageTypeId>(type: K, raw: PageContentMap[K]): string {
  const p = raw as unknown as Record<string, unknown>;
  const pick = (...keys: string[]) =>
    keys.map((k) => (typeof p[k] === "string" ? (p[k] as string).trim() : "")).find(Boolean) ?? "";
  switch (type) {
    case "vcard":
      return [pick("firstName"), pick("lastName")].filter(Boolean).join(" ") || pick("company");
    case "coupon":
      return [pick("offer"), pick("business")].filter(Boolean).join(" · ") || pick("headline");
    case "feedback":
      return pick("business");
    case "business":
    case "menu":
    case "app":
      return pick("name");
    case "audio":
      return [pick("title"), pick("artist")].filter(Boolean).join(" · ");
    default:
      return pick("title");
  }
}
