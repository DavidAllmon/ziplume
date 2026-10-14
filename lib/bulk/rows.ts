import { sanitizeContent } from "@/features/generator/state/sanitize";
import { parseCsv } from "@/lib/csv/parse";
import { measure } from "@/lib/qr/capacity";
import { encodeContent, summarizeContent, validateContent } from "@/lib/qr/qr-types";
import {
  PAYMENT_METHODS,
  type ContentValues,
  type ErrorCorrection,
  type QrTypeId,
} from "@/lib/qr/types";

// Bulk creation: one QR code per spreadsheet row. Columns are the generator's fields.

export const MAX_BULK_ROWS = 500;

const COLUMNS: { [K in QrTypeId]: (keyof ContentValues[K] & string)[] } = {
  url: ["url"],
  text: ["text"],
  wifi: ["ssid", "password", "security", "hidden"],
  contact: ["firstName", "lastName", "phone", "email", "company", "title", "website"],
  email: ["to", "subject", "body"],
  phone: ["phone"],
  sms: ["phone", "message"],
  whatsapp: ["phone", "message"],
  location: ["query", "latitude", "longitude"],
  payment: ["method", "account", "amount", "currency", "note"],
};

/** Other common header names for a field. */
const ALIASES: { [K in QrTypeId]?: Record<string, string> } = {
  url: { link: "url", website: "url", destination: "url" },
  text: { content: "text", message: "text" },
  wifi: { network: "ssid", networkname: "ssid", wifiname: "ssid" },
  contact: { first: "firstName", last: "lastName", jobtitle: "title", url: "website" },
  email: { email: "to", address: "to", message: "body" },
  sms: { text: "message" },
  whatsapp: { text: "message" },
  location: {
    address: "query",
    lat: "latitude",
    lng: "longitude",
    lon: "longitude",
    long: "longitude",
  },
  payment: { username: "account", handle: "account", wallet: "account", address: "account" },
};

const EXAMPLES: { [K in QrTypeId]: string[][] } = {
  url: [
    ["Spring flyer", "https://example.com/spring"],
    ["Menu", "https://example.com/menu"],
  ],
  text: [["Welcome note", "Thanks for visiting!"]],
  wifi: [["Guest Wi-Fi", "Cafe Guest", "coffee-time-42", "WPA", "no"]],
  contact: [
    [
      "Sam Lee",
      "Sam",
      "Lee",
      "+1 555 0100",
      "sam@example.com",
      "Example Co",
      "Manager",
      "https://example.com",
    ],
  ],
  email: [["Support email", "help@example.com", "Question", ""]],
  phone: [["Front desk", "+1 555 0100"]],
  sms: [["Text us", "+1 555 0100", "Hi!"]],
  whatsapp: [["Chat on WhatsApp", "+1 555 0100", "Hello"]],
  location: [
    ["Office", "1600 Pennsylvania Ave NW, Washington, DC", "", ""],
    ["Pier", "", "37.8087", "-122.4098"],
  ],
  payment: [["Tip jar", "venmo", "example-user", "5", "", "Thanks!"]],
};

const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");

export function bulkColumns(type: QrTypeId): string[] {
  return ["name", ...COLUMNS[type]];
}

const quote = (cell: string) => (/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);

/** A CSV file with the right columns and an example row or two. */
export function templateCsv(type: QrTypeId): string {
  return [bulkColumns(type), ...EXAMPLES[type]].map((row) => row.map(quote).join(",")).join("\r\n");
}

export interface BulkRow {
  /** Line number in the file, counting the header as line 1. */
  line: number;
  name: string;
  values: Record<string, string | boolean>;
  payload: string;
  error: string | null;
}

export interface BulkResult {
  rows: BulkRow[];
  /** Header names that didn't match a field. */
  ignored: string[];
  /** Rows past the limit that were left out. */
  skipped: number;
  error: string | null;
}

const TRUE = /^(true|yes|y|1|hidden)$/i;

/** Tidies values a spreadsheet might spell differently from the generator. */
function normalizeValues(
  type: QrTypeId,
  raw: Record<string, string>,
): { values: Record<string, unknown>; problem: string | null } {
  const values: Record<string, unknown> = { ...raw };
  let problem: string | null = null;
  if (type === "wifi") {
    const security = (raw.security ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    values.security = security.startsWith("WPA")
      ? "WPA"
      : security === "WEP"
        ? "WEP"
        : ["NOPASS", "NONE", "OPEN"].includes(security) || !raw.password
          ? "nopass"
          : "WPA";
    values.hidden = TRUE.test(raw.hidden ?? "");
  }
  if (type === "location") {
    values.mode = raw.latitude && raw.longitude && !raw.query ? "coordinates" : "address";
  }
  if (type === "payment") {
    const method = (raw.method ?? "").toLowerCase().replace(/[^a-z]/g, "") || "paypal";
    values.method = method;
    if (!(PAYMENT_METHODS as readonly string[]).includes(method)) {
      problem = "Use paypal, venmo, cashapp, bitcoin or ethereum as the method";
    }
  }
  return { values, problem };
}

/** Turns CSV text into codes of one type, checking each row like the generator would. */
export function parseBulk(
  type: QrTypeId,
  text: string,
  errorCorrection: ErrorCorrection = "M",
): BulkResult {
  const table = parseCsv(text);
  const empty = { rows: [], ignored: [], skipped: 0 };
  if (table.length < 2) {
    return { ...empty, error: "Add a header row, then one row per code." };
  }

  const fields = new Map(COLUMNS[type].map((field) => [field.toLowerCase(), field as string]));
  const aliases = ALIASES[type] ?? {};
  const header = table[0]!;
  const mapping = header.map((label) => {
    const key = normalizeHeader(label);
    if (key === "name" || key === "label") return "name";
    return fields.get(key) ?? aliases[key] ?? null;
  });
  if (!mapping.some((field) => field && field !== "name")) {
    return {
      ...empty,
      error: `None of the columns match. The first row should name the columns: ${bulkColumns(type).join(", ")}.`,
    };
  }

  const body = table.slice(1, 1 + MAX_BULK_ROWS);
  const rows = body.map((cells, index): BulkRow => {
    const raw: Record<string, string> = {};
    mapping.forEach((field, column) => {
      // A leading apostrophe is how spreadsheet exports keep "-122.4" or "+1 555" as text.
      if (field) raw[field] = (cells[column] ?? "").trim().replace(/^'(?=[=+\-@])/, "");
    });
    const normalized = normalizeValues(type, raw);
    const values = sanitizeContent(type, normalized.values) as unknown as Record<
      string,
      string | boolean
    >;
    const errors = validateContent(type, values as never) as Record<string, string | undefined>;
    let error = normalized.problem ?? Object.values(errors).find(Boolean) ?? null;
    let payload = "";
    if (!error) {
      payload = encodeContent(type, values as never);
      if (!measure(payload, errorCorrection).fits) {
        error = "Too much content for a QR code";
        payload = "";
      }
    }
    const summary = error ? "" : summarizeContent(type, values as never);
    return {
      line: index + 2,
      name: (raw.name || summary || `Code ${index + 1}`).slice(0, 120),
      values,
      payload,
      error,
    };
  });

  return {
    rows,
    ignored: header.filter((label, i) => label.trim() && !mapping[i]),
    skipped: Math.max(0, table.length - 1 - MAX_BULK_ROWS),
    error: null,
  };
}

/** Trackable links redirect, so they can only open web pages (the database checks this too). */
export const NOT_A_WEB_ADDRESS = "Trackable links need a web address (http or https)";

/** Marks rows whose link isn't a web address, for lists saved as trackable links. */
export function requireWebLinks(rows: BulkRow[]): BulkRow[] {
  return rows.map((row) =>
    row.error || /^https?:\/\//i.test(row.payload) ? row : { ...row, error: NOT_A_WEB_ADDRESS },
  );
}
