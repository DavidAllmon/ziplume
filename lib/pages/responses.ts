import { shortenBy } from "./sanitize";
import { mailHref, telHref } from "./urls";

/** The longest each thing a visitor sends can be (the database checks the same). */
export const VISITOR_LIMITS = { name: 100, phone: 40, email: 254, note: 500 } as const;
/** The most guests one RSVP can bring, the visitor included. */
export const MAX_GUESTS = 10;

export interface ShareInput {
  name: string;
  phone: string;
  email: string;
  note: string;
}

export interface RsvpInput {
  name: string;
  email: string;
  guests: number;
  note: string;
}

export type FormErrors<T> = Partial<Record<keyof T, string>>;

function checkLengths<T extends object>(errors: FormErrors<T>, input: T) {
  for (const [key, max] of Object.entries(VISITOR_LIMITS)) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > max) {
      errors[key as keyof T] ??= shortenBy(value.length - max);
    }
  }
}

/** What "Share your details" still needs: a name, and a phone or an email that work (spec 15). */
export function shareErrors(input: ShareInput): FormErrors<ShareInput> {
  const errors: FormErrors<ShareInput> = {};
  const phone = input.phone.trim();
  const email = input.email.trim();
  if (!input.name.trim()) errors.name = "Add your name";
  if (!phone && !email) errors.phone = "Add a phone number or an email";
  if (phone && !telHref(phone)) errors.phone = "Check the phone number";
  if (email && !mailHref(email)) errors.email = "Check the email address";
  checkLengths(errors, input);
  return errors;
}

/** How many guests one RSVP can bring: 1 to 10, or fewer when fewer places are left. */
export function guestChoices(left: number | null): number[] {
  const most = Math.max(Math.min(MAX_GUESTS, left ?? MAX_GUESTS), 0);
  return Array.from({ length: most }, (_, i) => i + 1);
}

/** What an RSVP still needs: a name, an email and a number of guests it can bring (spec 33). */
export function rsvpErrors(input: RsvpInput, left: number | null): FormErrors<RsvpInput> {
  const errors: FormErrors<RsvpInput> = {};
  const email = input.email.trim();
  if (!input.name.trim()) errors.name = "Add your name";
  if (!email) errors.email = "Add your email";
  else if (!mailHref(email)) errors.email = "Check the email address";
  if (!guestChoices(left).includes(input.guests)) errors.guests = "Pick how many are coming";
  checkLengths(errors, input);
  return errors;
}

/** An event's places as a whole number, or null for no limit (empty, 0 or not a number). */
export function rsvpCapacity(value: string | undefined): number | null {
  const digits = (value ?? "").trim();
  if (!/^\d{1,5}$/.test(digits)) return null;
  return Number(digits) || null;
}
