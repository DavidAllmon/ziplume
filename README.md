<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/logo-lockup-dark.png" />
    <img src="public/brand/logo-lockup.png" alt="QuickQReate" width="320" />
  </picture>
</p>

<p align="center">
  <strong>Create beautiful, scannable QR codes in seconds.</strong><br />
  Links, Wi-Fi, contacts, email, phone and SMS, plus editable dynamic codes with scan analytics.<br />
  Completely free, with no limits.
</p>

<p align="center">
  <a href="https://qr.techitdave.com"><strong>Open QuickQReate →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://buymeacoffee.com/davidallmon">Buy me a coffee</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React_19-149ECA?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-0EA5E9?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/license-MIT-4F46E5?style=flat-square" alt="MIT license" />
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/desktop-dark.png" />
    <img src="docs/screenshots/desktop-light.png" alt="QuickQReate on desktop: a Wi-Fi form on the left and a live, verified QR code preview with download options on the right" width="860" />
  </picture>
</p>

<p align="center">
  <img src="docs/screenshots/mobile-light.png" alt="QuickQReate on a phone with the live preview bar at the bottom" width="260" />
  &nbsp;
  <img src="docs/screenshots/mobile-sheet-dark.png" alt="The mobile preview sheet in dark mode" width="260" />
</p>

## Features

- **Seven QR types:** links, plain text, Wi-Fi (including hidden networks), contact cards (vCard), email, phone and SMS. Every type has labelled fields and friendly validation.
- **Live preview everywhere:** a sticky preview on tablet and desktop, and an always-visible thumbnail bar with a Download button on phones.
- **Scan check:** contrast, inverted colors, logo coverage and data density are checked as you edit. The rendered code is then decoded with a real QR reader, so "Verified scannable" means exactly that.
- **Make it yours:** scan-safe color presets, linear and radial gradients, separate corner colors, transparent backgrounds, six pattern styles, five corner styles and five corner centers, frames with a "Scan me" call to action, and your own logo or one of 24 built-in icons. Adding a logo raises error correction to High automatically.
- **Quick styles and templates:** apply a ready-made look in one tap, or save your own designs to your account and use them on any device.
- **Export:** PNG, SVG, JPG or WebP at 512 to 4096 px, plus vector PDF and EPS for print shops. Copy to clipboard or use the native share sheet where supported. Files get readable names like `quickqreate-wifi-cafe-guest.png`.
- **Remembers your style:** design and export settings are saved on your device. What you type, such as Wi-Fi passwords, never is.
- **Works offline:** install it as an app; it keeps working without a connection.
- **Free accounts (optional):** sign up with email and password or Google to save unlimited codes, with optional two-factor authentication. The generator never requires an account.
- **Dynamic codes:** a Link code can point at a short link (`qr.techitdave.com/r/…`) whose destination you change any time, even after printing. Pause a code, customize its ending, or add UTM tags for Google Analytics.
- **Scan analytics:** scans and unique visitors over time, countries, cities, devices, operating systems, browsers and time of day, for 7 days to all time. Export every scan as CSV. Bots and link previewers aren't counted.
- **Accessible:** keyboard friendly, screen-reader labelled, WCAG AA contrast in light and dark themes, and it respects reduced motion.

## Privacy

Codes are generated in your browser, and nothing you type is sent anywhere unless you save a code to your account. There are no ads, tracking scripts or advertising cookies. Scans of dynamic codes record an approximate location, device type and a daily-salted visitor hash; IP addresses are never stored. See the [privacy policy](https://qr.techitdave.com/privacy).

## Getting started

Requires Node.js 22 or newer.

```bash
git clone https://github.com/DavidAllmon/QuickQReate.git
cd QuickQReate
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without any environment variables, the app runs as the free generator with sign-in hidden. To work on accounts, dynamic codes and analytics, copy `.env.example` to `.env.local` and fill in a Supabase project (see [docs/accounts-setup.md](docs/accounts-setup.md)).

### Scripts

| Command                | What it does                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Start the development server                                         |
| `npm run build`        | Build the standalone server and generate the service worker          |
| `npm start`            | Run the production build (`PORT`, default 3000)                      |
| `npm run lint`         | ESLint                                                               |
| `npm run typecheck`    | TypeScript                                                           |
| `npm test`             | Unit tests (Vitest), including the database migration on PGlite      |
| `npm run test:e2e`     | End-to-end tests (Playwright) against the built app; run `build` first |
| `npm run format`       | Prettier                                                             |
| `npm run brand`        | Regenerate favicons, app icons, logos and the social image           |

## How it's built

```
app/                    Routes: generator, sign-in, dashboard, analytics, /r/<slug> redirects
components/
  brand/                Logo and the shared mark geometry used to generate assets
  layout/               Header, footer, theme toggle, providers
  ui/                   Buttons, fields, segmented controls, sheet, toast…
  support/              Buy Me a Coffee links
features/
  auth/                 Sign-in, sign-up, password reset, two-factor and account forms
  codes/                Saving, updating and deleting codes
  dashboard/            Saved-code list and code editor
  analytics/            Charts and the analytics page
features/generator/
  content/              Type picker and one form per QR type
  style/                Colors, shape, logo and error correction
  preview/              Live preview, scan check, mobile bar and sheet
  export/               Download, copy and share
  state/                Reducer, defaults and saved settings
lib/
  qr/                   Encoders, validation, capacity, scan check, renderer adapter
  color/                WCAG contrast helpers
  dynamic/              Short-link slugs, scan context (location, device, bot filter), UTM tags
  analytics/            Date ranges, time zones and chart shaping
  supabase/             Browser, server and service-role clients
supabase/
  migrations/           Schema, row-level security, scan recorder, analytics function
  test/                 The migration applied to PGlite and tested as each role
scripts/                Brand asset renderer, service worker generator, server launcher
e2e/                    Playwright tests that download codes and decode them with jsQR
```

- **QR logic is plain TypeScript** in `lib/qr`, fully unit tested, including spec-correct escaping for Wi-Fi and vCard payloads and UTF-8 support for any language or emoji.
- **Rendering** uses [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) behind `lib/qr/renderer.ts`, the only file that knows about it. Every format starts from one SVG: frames are composed around it (`lib/qr/frame.ts`), raster formats draw it on a canvas, PDF uses jsPDF + svg2pdf.js, and EPS comes from a small SVG-to-PostScript converter (`lib/qr/eps.ts`) that the tests render with Ghostscript and decode.
- **Accounts and data** use a self-hosted Supabase project. Every table has row-level security and least-privilege grants; scans enter only through a server-side function, and accounts with two-factor authentication are locked to two-factor sessions in the database itself.
- **Theme tokens** live in `app/globals.css`. `app/theme.test.ts` fails if any text color pair drops below WCAG AA contrast.

### Adding a QR type

1. Add the values type and ID in `lib/qr/types.ts`.
2. Write an encoder and validator (`lib/qr/encoders.ts`, `lib/qr/validators.ts`) with tests.
3. Register it in `lib/qr/qr-types.ts` (label, defaults, summary, filename).
4. Add an icon in `features/generator/content/registry.ts` and a form in `features/generator/content/forms/`, then wire it in `ContentForm.tsx`.

## Deployment

QuickQReate runs as a Next.js server from the `Dockerfile` (standalone output, health check at `/api/health`). Production is a Coolify application at `https://qr.techitdave.com` that redeploys on every push to `main`. GitHub Actions runs lint, formatting, type checks, unit and end-to-end tests on every push and pull request.

The one-time setup (Supabase project, Brevo email, Google sign-in, DNS and Coolify) is in [docs/accounts-setup.md](docs/accounts-setup.md). The old GitHub Pages address becomes a redirect by running the CI workflow manually with `redirect_to` set to the new URL.

## Contributing

Issues and pull requests are welcome. Before opening a PR, run `npm run lint && npm run typecheck && npm test`, plus `npm run build && npm run test:e2e` for UI changes.

## License

MIT. See [LICENSE](LICENSE).

<p align="center">Made by <a href="https://github.com/DavidAllmon">David Allmon</a></p>
