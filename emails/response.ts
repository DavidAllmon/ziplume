import { answerText, type FeedbackAnswer } from "@/lib/pages/feedback";

import { escapeHtml, type EmailContent } from "./invite";
import { emailLayout, paragraph } from "./layout";

export type ResponseKind = "feedback" | "share" | "rsvp";

export interface ResponseEmailInput {
  kind: ResponseKind;
  /** The code's name, as its maker typed it. */
  codeName: string;
  /** What the visitor sent, as the database stored it. */
  details: Record<string, unknown>;
  /** ISO time it arrived. */
  receivedAt: string;
  /** The code's page in the app. */
  codeUrl: string;
  /** The page that turns these emails off. */
  offUrl: string;
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const str = (value: unknown) => (typeof value === "string" ? value : "");

const SUBJECT: Record<ResponseKind, (name: string) => string> = {
  feedback: (name) => `New feedback on “${name}”`,
  share: (name) => `New shared details on “${name}”`,
  rsvp: (name) => `New RSVP for “${name}”`,
};

const INTRO: Record<ResponseKind, string> = {
  feedback: "Someone left feedback on your page.",
  share: "Someone shared their details from your page.",
  rsvp: "Someone RSVPed to your event.",
};

/** What the visitor sent, as label and value pairs of plain text; empty parts are left out. */
export function responseLines(
  kind: ResponseKind,
  details: Record<string, unknown>,
): [string, string][] {
  const lines: [string, string][] = [];
  const add = (label: string, value: string) => {
    if (value.trim()) lines.push([label, value.trim()]);
  };
  if (kind === "feedback") {
    const answers = Array.isArray(details.answers) ? (details.answers as FeedbackAnswer[]) : [];
    if (answers.length) {
      for (const answer of answers) add(str(answer.question) || "Rating", answerText(answer));
    } else if (typeof details.rating === "number") {
      add("Rating", answerText({ question: "", style: "stars", value: details.rating }));
    }
    add("Comment", str(details.comment));
    add("Contact", str(details.contact));
    return lines;
  }
  add("Name", str(details.name));
  if (kind === "share") add("Phone", str(details.phone));
  add("Email", str(details.email));
  if (kind === "rsvp" && typeof details.guests === "number") add("Guests", String(details.guests));
  add("Note", str(details.note));
  return lines;
}

/** The email that tells a code's maker what a visitor just sent (spec item 38). */
export function responseEmail(input: ResponseEmailInput): EmailContent {
  const e = escapeHtml;
  const name = oneLine(input.codeName).slice(0, 80) || "your code";
  const subject = SUBJECT[input.kind](name).slice(0, 200);
  const lines = responseLines(input.kind, input.details);
  const when = `${new Date(input.receivedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
  const rows = lines
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;vertical-align:top;font-size:14px;color:#45506a;white-space:nowrap;">${e(label)}</td><td style="padding:6px 0;vertical-align:top;font-size:14px;color:#0a1330;white-space:pre-line;word-break:break-word;">${e(value)}</td></tr>`,
    )
    .join("");
  const html = emailLayout({
    title: e(subject),
    body:
      paragraph(`${INTRO[input.kind]} It arrived ${e(when)}.`) +
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>`,
    button: { label: "See all responses", href: e(input.codeUrl) },
    note: `You get these emails because you turned on “Email me new responses” for this code. <a href="${e(input.offUrl)}" style="color:#0b6e8c;">Turn them off</a>.`,
    siteUrl: new URL(input.codeUrl).origin,
  });
  const text = [
    `${INTRO[input.kind]} It arrived ${when}.`,
    "",
    ...lines.map(([label, value]) => `${label}: ${value}`),
    "",
    `See all responses: ${input.codeUrl}`,
    "",
    `You get these emails because you turned on “Email me new responses” for this code. Turn them off: ${input.offUrl}`,
    "",
    "Ziplume · Make it. Link it. Share it.",
  ].join("\n");
  return { subject, html, text };
}
