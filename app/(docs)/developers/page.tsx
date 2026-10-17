import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { accountsEnabled, SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Developers",
  description: "Create, update and track QR codes from your own code with the free Ziplume API.",
};

const BASE = `${SITE_URL}/api/v1`;

function Code({ children }: { children: string }) {
  return (
    <pre
      tabIndex={0}
      className="overflow-x-auto rounded-control border border-border bg-surface-2 p-4 font-mono text-sm leading-relaxed text-fg focus-ring"
    >
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <h3 className="flex flex-wrap items-center gap-2 font-mono text-base font-semibold text-fg">
        <span className="rounded-md bg-primary-soft px-2 py-0.5 text-sm text-primary-soft-fg">
          {method}
        </span>
        {path}
      </h3>
      {children}
    </section>
  );
}

const TYPES: [string, string][] = [
  ["url", "{ url }"],
  ["text", "{ text }"],
  ["wifi", '{ ssid, password, security: "WPA" | "WEP" | "nopass", hidden }'],
  ["contact", "{ firstName, lastName, phone, email, company, title, website }"],
  ["email", "{ to, subject, body }"],
  ["phone", "{ phone }"],
  ["sms", "{ phone, message }"],
  ["whatsapp", "{ phone, message }"],
  ["location", '{ mode: "address" | "coordinates", query, latitude, longitude }'],
  [
    "payment",
    '{ method: "paypal" | "venmo" | "cashapp" | "bitcoin" | "ethereum", account, amount, currency, note }',
  ],
];

const ERRORS: [number, string, string][] = [
  [400, "invalid_request", "A field is missing or not valid. details says which."],
  [401, "unauthorized", "The key is missing, mistyped or revoked."],
  [404, "not_found", "There's no code with that id in your account."],
  [409, "slug_taken", "Someone already uses that link ending."],
  [429, "rate_limited", "More than 120 requests in a minute with one key."],
  [503, "unavailable", "Something went wrong on our side. Try again shortly."],
];

export default function DevelopersPage() {
  return (
    <>
      <h1>Developers</h1>
      <p>
        The Ziplume API lets your own scripts and apps create codes, change where dynamic codes
        point, and read their scan analytics. Like everything else here, it’s free.
      </p>
      {!accountsEnabled && (
        <p className="rounded-control bg-warning-soft px-4 py-3 text-sm">
          The API is part of the account version of Ziplume and isn’t available on this copy of the
          site.
        </p>
      )}

      <h2>Authentication</h2>
      <p>
        Create a key under <Link href="/settings/api-keys">Settings → API keys</Link>. It’s shown
        once, so store it somewhere safe, like your app’s secret settings. Send it with every
        request:
      </p>
      <Code>{`Authorization: Bearer zl_your_key_here`}</Code>
      <p>
        A key acts as you, on the codes in your own account. Keep keys on servers: anyone with a key
        can change your codes. You can revoke a key at any time.
      </p>

      <h2>Basics</h2>
      <ul>
        <li>
          Base URL: <code>{BASE}</code>
        </li>
        <li>Requests and responses are JSON. Dates are ISO 8601, like 2026-10-13T09:00:00Z.</li>
        <li>Each key can make 120 requests a minute.</li>
        <li>
          Successful responses wrap their result in <code>data</code>. Errors look like this:
        </li>
      </ul>
      <Code>{`{ "error": { "code": "invalid_request", "message": "destination must be an http(s) URL", "details": { … } } }`}</Code>
      <div
        className="overflow-x-auto focus-ring"
        tabIndex={0}
        role="region"
        aria-label="Error codes"
      >
        <table className="w-full text-left text-sm">
          <thead className="text-fg">
            <tr className="border-b border-border">
              <th className="py-2 pr-4 font-semibold">Status</th>
              <th className="py-2 pr-4 font-semibold">code</th>
              <th className="py-2 font-semibold">Meaning</th>
            </tr>
          </thead>
          <tbody className="text-fg-muted">
            {ERRORS.map(([status, code, meaning]) => (
              <tr key={code} className="border-b border-border/60">
                <td className="py-2 pr-4">{status}</td>
                <td className="py-2 pr-4 font-mono">{code}</td>
                <td className="py-2">{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Quick start</h2>
      <p>Create a dynamic code that points at your website, then change it later:</p>
      <Code>{`curl -X POST ${BASE}/codes \\
  -H "Authorization: Bearer $QQ_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "type": "url", "dynamic": true, "name": "Spring flyer", "destination": "https://example.com/spring" }'`}</Code>
      <p>
        The response includes the code’s <code>id</code>, its <code>short_link</code> and the{" "}
        <code>payload</code> to put in a QR code. Get a ready-made image from the image endpoint, or
        use any QR library with the payload.
      </p>
      <Code>{`curl -X PATCH ${BASE}/codes/CODE_ID \\
  -H "Authorization: Bearer $QQ_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "destination": "https://example.com/summer" }'`}</Code>

      <h2>Endpoints</h2>
      <Endpoint method="GET" path="/codes">
        <p>
          Your codes, newest first. Use <code>limit</code> (1–200, default 50) and{" "}
          <code>offset</code> to page through them.
        </p>
      </Endpoint>
      <Endpoint method="POST" path="/codes">
        <p>Creates a code. Fields:</p>
        <ul>
          <li>
            <code>type</code> (required): one of the types below.
          </li>
          <li>
            <code>dynamic</code>: <code>true</code> for an editable, trackable link. Only{" "}
            <code>url</code> codes and hosted pages can be dynamic; hosted pages always are.
          </li>
          <li>
            <code>destination</code>: where a dynamic <code>url</code> code sends people.
          </li>
          <li>
            <code>content</code>: what the code holds, for every other type.
          </li>
          <li>
            <code>name</code>, <code>slug</code> (a custom link ending, 3–40 letters, numbers or
            dashes), <code>status</code> (<code>active</code> or <code>paused</code>),{" "}
            <code>folder_id</code>, <code>active_from</code>, <code>active_until</code> and{" "}
            <code>design</code>: all optional.
          </li>
        </ul>
      </Endpoint>
      <Endpoint method="GET" path="/codes/{id}">
        <p>One code, including its design.</p>
      </Endpoint>
      <Endpoint method="PATCH" path="/codes/{id}">
        <p>
          Changes any of the fields above except <code>type</code> and <code>dynamic</code>. Send
          only what changes; <code>null</code> clears a date or folder.
        </p>
      </Endpoint>
      <Endpoint method="DELETE" path="/codes/{id}">
        <p>
          Deletes the code and its scan history. Dynamic codes stop working. Returns 204 with no
          body.
        </p>
      </Endpoint>
      <Endpoint method="GET" path="/codes/{id}/analytics">
        <p>
          Scans, unique visitors, a daily timeline and breakdowns by country, city, device,
          operating system and browser. Optional: <code>from</code> and <code>to</code> (default:
          the last 30 days) and <code>tz</code> (an IANA time zone such as America/Chicago, default
          UTC) for the daily buckets.
        </p>
      </Endpoint>
      <Endpoint method="GET" path="/codes/{id}/image">
        <p>
          A plain QR image of a saved code in its colors. Options: <code>format</code> (
          <code>svg</code> or <code>png</code>), <code>size</code> (64–2048 pixels), <code>fg</code>{" "}
          and <code>bg</code> (hex colors) and <code>ec</code> (error correction: L, M, Q or H). For
          frames, logos and gradients, download from the app.
        </p>
      </Endpoint>
      <Endpoint method="GET" path="/qr?data=…">
        <p>Turns any text into a QR image, with the same options as above. Nothing is saved.</p>
        <Code>{`curl -H "Authorization: Bearer $QQ_KEY" "${BASE}/qr?data=Hello&format=png&size=600" -o hello.png`}</Code>
      </Endpoint>

      <h2>Code types</h2>
      <p>
        These types put their <code>content</code> straight into the code. Missing fields are empty;
        the rules match the generator’s.
      </p>
      <div
        className="overflow-x-auto focus-ring"
        tabIndex={0}
        role="region"
        aria-label="Code types and their content"
      >
        <table className="w-full text-left text-sm">
          <thead className="text-fg">
            <tr className="border-b border-border">
              <th className="py-2 pr-4 font-semibold">type</th>
              <th className="py-2 font-semibold">content</th>
            </tr>
          </thead>
          <tbody className="text-fg-muted">
            {TYPES.map(([type, fields]) => (
              <tr key={type} className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono">{type}</td>
                <td className="py-2 font-mono">{fields}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Hosted pages (<code>links</code>, <code>vcard</code>, <code>business</code>,{" "}
        <code>menu</code>, <code>coupon</code>, <code>event</code>, <code>feedback</code>,{" "}
        <code>pdf</code>, <code>images</code>, <code>video</code>, <code>audio</code> and{" "}
        <code>app</code>) take the same content as their editor in the app. The easiest way to see
        the shape is to make one in the app and fetch it with <code>GET /codes/{"{id}"}</code>.
        Video pages take a YouTube or Vimeo link in <code>url</code>. Links may also set{" "}
        <code>kind</code> (<code>link</code> or <code>header</code>), <code>type</code> (
        <code>web</code>, <code>email</code>, <code>phone</code> or <code>sms</code>),{" "}
        <code>featured</code> (only the first featured link is drawn), <code>icon</code> (
        <code>auto</code>, <code>none</code> or <code>image</code>) with an uploaded{" "}
        <code>image</code>, and <code>showFrom</code>/<code>showUntil</code> (ISO times). Upload
        images and files in the app first; the API can refer to them but not upload them. A link or
        button with <code>&quot;on&quot;: false</code> stays saved but isn’t shown on the page;
        without it, it’s shown.
      </p>
      <p>
        Contact pages (<code>vcard</code>) take <code>websites</code> (up to 4, each a{" "}
        <code>label</code> and <code>url</code>), a <code>cover</code> image, <code>pronouns</code>,{" "}
        <code>department</code>, a phone’s <code>whatsapp</code> (true or false), and{" "}
        <code>showCall</code>, <code>showText</code>, <code>showEmail</code>,{" "}
        <code>showWhatsapp</code> and <code>showDirections</code> for the quick buttons (shown
        unless false). An older single <code>website</code> is read as the first of the websites.
        Business pages take <code>timeZone</code> (an IANA name like <code>America/New_York</code>,
        for Open now; without one, each visitor’s own time is used), <code>closures</code> (up to
        10, each a <code>date</code> as <code>YYYY-MM-DD</code> and a <code>note</code>), a second
        range on each day of <code>hours</code> (<code>from2</code>/<code>to2</code>), a{" "}
        <code>gallery</code> of up to 6 images, <code>services</code> (up to 30, each a{" "}
        <code>name</code>, <code>price</code> and <code>description</code>), and buttons with{" "}
        <code>icon</code> <code>review</code>, <code>book</code> or <code>order</code>.
      </p>
      <p>
        Menu dishes take a <code>photo</code>, <code>labels</code> (any of <code>vegan</code>,{" "}
        <code>vegetarian</code>, <code>gluten-free</code>, <code>dairy-free</code>,{" "}
        <code>spicy</code>, <code>nuts</code>, <code>halal</code> and <code>kosher</code>),{" "}
        <code>on</code> (false hides the dish), <code>soldOut</code>, <code>popular</code>, and{" "}
        <code>options</code> (up to 4, each a <code>label</code> and <code>price</code>, shown
        instead of the price). <code>tags</code> holds other notes; an older dish’s tags that name a
        label become that label. Sections take a <code>description</code>. Coupons take{" "}
        <code>scan</code> (<code>text</code>, <code>qr</code> or <code>barcode</code>; a barcode
        holds up to 20 plain characters) and a <code>badge</code> (up to 12 characters). Events take{" "}
        <code>online</code> with a <code>joinUrl</code>, an <code>agenda</code> (up to 30, each a{" "}
        <code>time</code> as <code>HH:mm</code>, a <code>title</code> and a <code>note</code>), and{" "}
        <code>hosts</code> (up to 12, each a <code>photo</code>, <code>name</code> and{" "}
        <code>role</code>).
      </p>
      <Code>{`{
  "type": "links",
  "name": "Bio links",
  "content": {
    "title": "Dave’s Diner",
    "bio": "Breakfast all day",
    "links": [{ "label": "Order online", "url": "https://example.com/order" }],
    "socials": [{ "network": "instagram", "url": "https://instagram.com/example" }]
  }
}`}</Code>

      <h3>Page looks</h3>
      <p>
        A page&apos;s <code>content.look</code> sets how it looks. Send it back with every change to
        keep the look; without it, the page gets its type&apos;s default theme.{" "}
        <code>content.color</code> always equals <code>look.button.color</code>.
      </p>
      <ul>
        <li>
          <code>theme</code>: <code>ziplume</code>, <code>paper</code>, <code>midnight</code>,{" "}
          <code>ocean</code>, <code>sunset</code>, <code>grape</code>, <code>forest</code>,{" "}
          <code>blush</code> or <code>sand</code>.
        </li>
        <li>
          <code>wallpaper</code>: <code>{`{ "kind": "solid", "color" }`}</code>,{" "}
          <code>{`{ "kind": "gradient", "from", "to", "direction" }`}</code> (direction{" "}
          <code>down</code>, <code>diagonal</code> or <code>across</code>) or{" "}
          <code>{`{ "kind": "image", "image", "dim", "color" }`}</code> (dim 0–80; an image uploaded
          in the app; color shows while it loads).
        </li>
        <li>
          <code>header</code>: <code>classic</code> or <code>hero</code>; <code>shape</code>:{" "}
          <code>circle</code> or <code>rounded</code>.
        </li>
        <li>
          <code>font</code>: <code>clean</code>, <code>bold</code>, <code>elegant</code>,{" "}
          <code>friendly</code>, <code>modern</code> or <code>typewriter</code>; <code>text</code>:{" "}
          <code>auto</code> or a hex color.
        </li>
        <li>
          <code>button</code>: <code>shape</code> (<code>square</code>, <code>rounded</code>,{" "}
          <code>pill</code>), <code>style</code> (<code>solid</code>, <code>outline</code>,{" "}
          <code>soft</code>), <code>shadow</code> (<code>none</code>, <code>soft</code>,{" "}
          <code>hard</code>), <code>color</code>, and <code>text</code> (<code>auto</code> or a hex
          color).
        </li>
        <li>
          <code>socials</code>: <code>top</code> (under the header) or <code>bottom</code>.
        </li>
        <li>
          <code>socialStyle</code>: <code>outline</code>, <code>filled</code>, <code>plain</code> or{" "}
          <code>brand</code>; <code>socialSize</code>: <code>small</code>, <code>medium</code> or{" "}
          <code>large</code>.
        </li>
      </ul>

      <h2>The code object</h2>
      <ul>
        <li>
          <code>id</code>, <code>name</code>, <code>type</code>, <code>dynamic</code>,{" "}
          <code>slug</code>, <code>destination</code>, <code>content</code> and (for single codes){" "}
          <code>design</code>.
        </li>
        <li>
          <code>status</code> is what you set (<code>active</code> or <code>paused</code>);{" "}
          <code>state</code> also accounts for the active dates: <code>active</code>,{" "}
          <code>paused</code>, <code>scheduled</code> or <code>expired</code>.
        </li>
        <li>
          <code>folder_id</code>, <code>active_from</code>, <code>active_until</code> and{" "}
          <code>password_protected</code>. Passwords are set in the dashboard, never through the
          API.
        </li>
        <li>
          <code>scan_count</code>, <code>last_scanned_at</code>, <code>created_at</code> and{" "}
          <code>updated_at</code>.
        </li>
        <li>
          <code>short_link</code> (dynamic codes) and <code>payload</code>, the exact text to
          encode.
        </li>
      </ul>
    </>
  );
}
