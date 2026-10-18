import type { PageTypeId } from "@/lib/qr/types";
import { isTimeZone, zonedTimeToUtc } from "@/lib/time/zone";

import { overLimit } from "./sanitize";
import { rsvpCapacity } from "./responses";
import { barcodeProblem } from "./scan";
import type { LinkItem, PageContentMap, SocialItem } from "./types";
import { linkHref } from "./links";
import {
  listenService,
  mailHref,
  safeHref,
  socialHref,
  startSeconds,
  telHref,
  videoEmbed,
  whatsappHref,
} from "./urls";

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
      else if (ph.whatsapp && ph.number.trim() && !whatsappHref(ph.number))
        errors[`phones.${i}.number`] = "Add the country code, like +1 or +44";
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
    const named = p.sections
      .flatMap((s, si) => s.items.map((item, ii) => ({ item, at: `sections.${si}.items.${ii}` })))
      .filter(({ item }) => item.name.trim());
    if (!named.length) errors["sections.0.items.0.name"] = "Add at least one dish or drink";
    else if (!named.some(({ item }) => item.on)) {
      // A hidden dish is parked, like a link that's off: the page needs one that shows.
      errors[`${named[0]!.at}.name`] = "Show at least one dish or drink";
    }
    p.sections.forEach((s, si) =>
      s.items.forEach((item, ii) =>
        // A hidden dish is parked: its unfinished options don't block saving.
        (item.on ? item.options : []).forEach((o, oi) => {
          const at = `sections.${si}.items.${ii}.options.${oi}`;
          if (o.price.trim() && !o.label.trim())
            errors[`${at}.label`] = "Name this option, like Small";
          if (o.label.trim() && !o.price.trim()) errors[`${at}.price`] = "Add its price";
        }),
      ),
    );
    return errors;
  },
  coupon: (p) => {
    const errors: PageErrors = {};
    if (!p.offer.trim() && !p.headline.trim()) errors.offer = "Add the offer, like 20% off";
    if (p.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(p.validUntil))
      errors.validUntil = "Pick a date";
    if (p.buttonLabel.trim() && !p.buttonUrl.trim()) errors.buttonUrl = "Add the button’s link";
    if (p.scan !== "text") {
      if (!p.code.trim()) errors.code = "Add the code to scan";
      else if (p.scan === "barcode") {
        const problem = barcodeProblem(p.code.trim());
        if (problem) errors.code = problem;
      }
    }
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
    // A join link left from when it was online isn't checked once it's off: the box is hidden.
    if (p.online) {
      if (!p.joinUrl.trim()) errors.joinUrl = "Add the link to join";
      else checkUrl(errors, "joinUrl", p.joinUrl);
    }
    // Like the join link, the places are only checked while the form is on.
    if (p.rsvp && p.rsvpCapacity.trim() && rsvpCapacity(p.rsvpCapacity) === null) {
      errors.rsvpCapacity = "Enter a number of places, like 50";
    }
    p.agenda.forEach((a, i) => {
      if ((a.time || a.note.trim()) && !a.title.trim()) {
        errors[`agenda.${i}.title`] = "Add what’s happening";
      }
      if (a.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)) {
        errors[`agenda.${i}.time`] = "Pick a time";
      }
    });
    p.hosts.forEach((h, i) => {
      if ((h.role.trim() || h.photo) && !h.name.trim())
        errors[`hosts.${i}.name`] = "Add their name";
    });
    return errors;
  },
  feedback: (p) => {
    const errors: PageErrors = {};
    if (!p.business.trim()) errors.business = "Add the business name";
    if (!p.questions.some((q) => q.text.trim())) {
      errors[p.questions.length ? "questions.0.text" : "questions"] = "Add a question";
    }
    checkUrl(errors, "reviewUrl", p.reviewUrl);
    return errors;
  },
  pdf: (p) => {
    const errors: PageErrors = {};
    if (!p.files.some((f) => f.file)) {
      errors[p.files.length ? "files.0.file" : "files"] = "Upload a PDF";
    }
    p.files.forEach((f, i) => {
      if (!f.file && f.title.trim()) errors[`files.${i}.file`] = "Upload a PDF, or remove this row";
    });
    return errors;
  },
  images: (p) => {
    const errors: PageErrors = {};
    if (!p.images.length) errors.images = "Add at least one image";
    p.images.forEach((item, i) => checkUrl(errors, `images.${i}.link`, item.link));
    return errors;
  },
  video: (p) => {
    const errors: PageErrors = {};
    if (!p.videos.some((v) => v.url.trim())) {
      errors[p.videos.length ? "videos.0.url" : "videos"] = "Paste a video link";
    }
    p.videos.forEach((v, i) => {
      if (v.url.trim() && !videoEmbed(v.url) && !safeHref(v.url)) {
        errors[`videos.${i}.url`] = URL_MESSAGE;
      }
      if (v.start.trim() && startSeconds(v.start) === null) {
        errors[`videos.${i}.start`] = "Use minutes and seconds, like 1:23";
      }
    });
    return errors;
  },
  audio: (p) => {
    const errors: PageErrors = {};
    const anyTrack = p.tracks.some((t) => t.file || t.link.trim());
    if (!p.file && !p.link.trim() && !anyTrack) errors.file = "Upload an audio file or add a link";
    checkUrl(errors, "link", p.link);
    p.listen.forEach((l, i) => {
      if (!l.url.trim()) return;
      if (!safeHref(l.url)) errors[`listen.${i}.url`] = URL_MESSAGE;
      else if (!listenService(l.url)) {
        errors[`listen.${i}.url`] =
          "Use a link from Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud or Bandcamp";
      }
    });
    p.tracks.forEach((t, i) => {
      if (t.title.trim() && !t.file && !t.link.trim()) {
        errors[`tracks.${i}.file`] = "Upload the track or add its link";
      }
      checkUrl(errors, `tracks.${i}.link`, t.link);
    });
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
