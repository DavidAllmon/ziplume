import { escapeVCard } from "@/lib/qr/escape";
import { normalizePhone } from "@/lib/qr/normalize";
import { isTimeZone, zonedTimeToUtc } from "@/lib/time/zone";

import type { EventPage, VcardPage } from "./types";
import { mailHref, mediaUrl, safeHref, socialHref } from "./urls";

// Downloadable files for hosted pages: an iCalendar event and a vCard contact.

/** Folds long iCalendar/vCard lines at 75 octets, as RFC 5545 and RFC 6350 require. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const len = new TextEncoder().encode(char).length;
    if (size + len > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += len;
  }
  out.push(current);
  return out.join("\r\n ");
}

const icsText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const utcStamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const compactDate = (date: string) => date.replace(/-/g, "");

/** The next calendar day after a YYYY-MM-DD date. */
const nextDay = (date: string) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** First and last calendar day of an all-day event. */
function allDayRange(event: EventPage): { first: string; last: string } {
  const first = event.start.slice(0, 10);
  const end = event.end.slice(0, 10);
  return { first, last: end && end >= first ? end : first };
}

/** Start and end as instants; a timed event without an end lasts an hour. */
export function eventTimes(event: EventPage): { start: Date; end: Date } | null {
  // A zone this browser (or server) doesn't know has no times, rather than throwing.
  if (!event.start || !isTimeZone(event.timeZone)) return null;
  if (event.allDay) {
    const { first, last } = allDayRange(event);
    const start = zonedTimeToUtc(first, event.timeZone);
    const end = zonedTimeToUtc(nextDay(last), event.timeZone);
    return Number.isNaN(start.getTime()) ? null : { start, end };
  }
  const start = zonedTimeToUtc(event.start, event.timeZone);
  if (Number.isNaN(start.getTime())) return null;
  const end = event.end ? zonedTimeToUtc(event.end, event.timeZone) : null;
  return {
    start,
    end:
      end && !Number.isNaN(end.getTime()) && end > start
        ? end
        : new Date(start.getTime() + 3_600_000),
  };
}

export function eventIcs(
  event: EventPage,
  uid: string,
  pageUrl: string,
  now = new Date(),
): string | null {
  const times = eventTimes(event);
  if (!times) return null;
  const range = allDayRange(event);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ziplume//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@quickqreate`,
    `DTSTAMP:${utcStamp(now)}`,
    ...(event.allDay
      ? [
          `DTSTART;VALUE=DATE:${compactDate(range.first)}`,
          `DTEND;VALUE=DATE:${compactDate(nextDay(range.last))}`,
        ]
      : [`DTSTART:${utcStamp(times.start)}`, `DTEND:${utcStamp(times.end)}`]),
    `SUMMARY:${icsText(event.title)}`,
  ];
  if (event.location.trim()) lines.push(`LOCATION:${icsText(event.location.trim())}`);
  const description = [event.description.trim(), pageUrl].filter(Boolean).join("\n\n");
  lines.push(`DESCRIPTION:${icsText(description)}`, `URL:${pageUrl}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** A Google Calendar "add event" link for the same event. */
export function googleCalendarUrl(event: EventPage, pageUrl: string): string | null {
  const times = eventTimes(event);
  if (!times) return null;
  const range = allDayRange(event);
  const dates = event.allDay
    ? `${compactDate(range.first)}/${compactDate(nextDay(range.last))}`
    : `${utcStamp(times.start)}/${utcStamp(times.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: [event.description.trim(), pageUrl].filter(Boolean).join("\n\n"),
    location: event.location.trim(),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** vCard 3.0 for a contact page, including photo and social profiles. */
export function contactVcard(card: VcardPage): string {
  const first = card.firstName.trim();
  const last = card.lastName.trim();
  const fullName = [first, last].filter(Boolean).join(" ") || card.company.trim() || "Contact";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
    `FN:${escapeVCard(fullName)}`,
  ];
  const company = card.company.trim();
  const department = card.department.trim();
  if (company || department) {
    lines.push(`ORG:${escapeVCard(company)}${department ? `;${escapeVCard(department)}` : ""}`);
  }
  if (card.jobTitle.trim()) lines.push(`TITLE:${escapeVCard(card.jobTitle.trim())}`);
  for (const phone of card.phones) {
    const number = normalizePhone(phone.number);
    if (!number) continue;
    const type = /work|office/i.test(phone.label)
      ? "WORK"
      : /home/i.test(phone.label)
        ? "HOME"
        : "CELL";
    lines.push(`TEL;TYPE=${type}:${number}`);
  }
  for (const email of card.emails) {
    if (!mailHref(email.address)) continue;
    const type = /home|personal/i.test(email.label) ? "HOME" : "WORK";
    lines.push(`EMAIL;TYPE=INTERNET,${type}:${email.address.trim()}`);
  }
  for (const site of card.websites) {
    const href = safeHref(site.url);
    if (href) lines.push(`URL:${href}`);
  }
  if (card.address.trim()) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(card.address.trim())};;;;`);
  // Contact cards have no pronouns field phones read, so they lead the note.
  const pronouns = card.pronouns.trim();
  const note = [pronouns && `Pronouns: ${pronouns}`, card.bio.trim()].filter(Boolean).join("\n");
  if (note) lines.push(`NOTE:${escapeVCard(note)}`);
  if (card.photo) lines.push(`PHOTO;VALUE=URI:${mediaUrl(card.photo.path)}`);
  for (const social of card.socials) {
    const href = socialHref(social.network, social.url);
    if (href) lines.push(`X-SOCIALPROFILE;TYPE=${social.network}:${href}`);
  }
  lines.push("END:VCARD");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
