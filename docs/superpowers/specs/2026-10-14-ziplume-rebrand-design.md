# Ziplume: one editor, a new name and look, and the move to ziplume.com

Approved in conversation with David on 2026-10-14. Brand direction: kit C "X-ray" from the canvas
"Ziplume brand kits" (https://claude.ai/artifact/Sh2x2qCqwGGarKqH2bUtub, artboard `XRay.dc.html`).

## 1. Why, and what success looks like

David is renaming QuickQReate to **Ziplume** and moving it from `qr.techitdave.com` to
**ziplume.com** (registered on Cloudflare on 2026-10-14). He also found that editing a saved code
opens a different editor, the old home-page generator, without the app sidebar. He wants to edit
in the same editor he created the code in.

- Tagline: **"Make it. Link it. Share it."**
- Sub-tagline: **"QR codes, short links, and simple sharing tools."**
- Layout and features stay as they are. Only the name, logo, text logo, colors, fonts and styles
  change, plus the editing fix and the new address.

Success means:

- **Editing:** a saved code opens in the Create editor, inside the app with the sidebar, and
  saves in one step.
- **Name:** no "QuickQReate" is left anywhere a person can see it.
- **Look:** kit C's colors, fonts and logo appear across the app, the public pages, emails, icons
  and social images, and pass the contrast and accessibility checks in light and dark.
- **Address:** `ziplume.com` serves the app over HTTPS behind Cloudflare's proxy, and scans
  through it record country and city.
- **Nothing breaks:**
  - Every code already printed, which encodes `HTTPS://QR.TECHITDAVE.COM/R/<SLUG>`, keeps
    scanning and counting.
  - Hosted pages and API keys keep working on the old address.
  - Google sign-in, email sign-up, password reset and team invites work on the new address, with
    mail from `no-reply@ziplume.com`.

## 2. Decisions

| Question | Decision |
| --- | --- |
| Brand kit | C, "X-ray" |
| What the code page does once editing moves | An overview with one **Edit code** button. Every change happens in the editor. |
| Rollout | Three releases: 1) edit in the Create editor, 2) new name and look on the old address, 3) the move to ziplume.com |
| Cloudflare proxy for ziplume.com | On during the move, with visitor-location headers, so scans show places |
| App address | `ziplume.com`. `www.ziplume.com` forwards to it. Short links are `ziplume.com/r/<slug>`. |
| Old address | `qr.techitdave.com` stays forever: short links, hosted pages, the API and their files answer directly, and everything else forwards |
| Mail sender | `Ziplume <no-reply@ziplume.com>`, verified in Brevo |

**Global constraints.** These carry over from the earlier work:

- **Secrets and sign-ins:** David enters every password, key and secret, and signs in to
  Cloudflare, Google Cloud and Brevo himself. Claude never types them, and never writes them into
  git, docs, screenshots or messages.
- **DNS:** only the records named in this spec are added, all in the ziplume.com zone. No record
  in `techitdave.com` changes.
- **Shared server:** the Supabase Multitenant resource is left untouched. Project-level auth
  settings are changed through the panel's project environment, as at go-live.
- **Migrations:** applied live only after a verified backup and before merging, never with
  backslashes, and each recorded in the runbook `~/.codex/memories/supabase-coolify.md`.
- **David's data:** live checks don't create or delete data in David's account unless he asks.

## 3. Release 1: editing in the Create editor

### 3.1 Route and access

- **New route:** `/codes/<id>/edit`, inside the `(app)` layout, so the sidebar, tablet rail and
  phone tabs show.
- **Teammate's code:** it opens inside that team. The route redirects to add `?workspace=<owner>`,
  the same way `/codes/<id>` does.
- **Who can edit:** the owner, and teammates whose role can edit (`can_edit`). A teammate's
  private code is never shown.
- **Viewers:** a Viewer who opens the Edit address is redirected to `/codes/<id>` and sees
  "You can view this code but not change it."
- **Missing or hidden codes** return the usual not-found page.

### 3.2 The editor in Edit mode

`CreatePage` becomes one editor with two modes: `create` (`/codes/new`, unchanged) and `edit`.

**Same as Create:**
- the sections (Type, Content, Design, Settings, Name & folder)
- the preview column
- the phone bar

The header reads **Edit code**, with a back link to the code page.

**Locked, each with a short note:**
- **Type:** "Set when the code was created. Duplicate it to make a different type."
- **Trackable:** "Printed codes depend on this, so it can't change." The database already blocks
  it, because `is_dynamic` is missing from the update grant.

**Short link ending:**
- It stays editable.
- Once its value differs from the saved one, this warning appears under it: "Codes you've already
  printed or shared use the current link and will stop working."

**Password** (trackable codes):
- If the code has one, the field shows "This code has a password." with an empty box.
  - Blank keeps the current password.
  - Typing a new one replaces it.
  - **Remove password** clears it.
- If the code has none, the field behaves as it does in Create.

**Other fields:**
- Starts, Ends, campaign tags, Name and Folder are filled in from the saved code and editable.
- The folder list is the code owner's folders.

**Content and media:**
- Hosted-page content opens in the same page editor.
- Files uploaded while editing a teammate's code go to that teammate's space, which Phase 3a
  allows. The editor's `workspace` is the code owner.

**Saving:**
- The Create button becomes **Save changes**, in the preview column and the phone bar.
- It is disabled until something differs from the saved code, and a **Discard changes** action
  resets the form.
- Leaving with unsaved changes asks first: in-app links, back and forward, and closing the tab.
- After a save, the editor goes to `/codes/<id>` with the toast "Changes saved". On failure, the
  error shows next to the button and nothing is half-saved (see 3.4).

**Drafts:** Edit mode never reads or writes drafts. Drafts stay a Create-only feature.

### 3.3 Loading a saved code

A new mapper, `fromSavedCode(row, owner)`, turns a `qr_codes` row into `CreateState`. It reuses
the existing sanitizers (`sanitizeContent`, `sanitizeDesign`, `sanitizePage`), `readUtm`, and the
date-input helper now private to `AccessCard`, which moves to a shared module.

| Saved field | Editor state |
| --- | --- |
| `qr_type` | `code.activeType` (locked) |
| `content` | `code.content[type]`, or `code.pages[type]` for hosted pages |
| `design` | `code.design` |
| `name` | `code.name` |
| `destination` (trackable links) | the link field gets the address without `utm_*` tags; `settings.utm` gets the tags |
| `is_dynamic` | `settings.trackable` (locked) |
| `slug` | `settings.slug` |
| `has_password` | password state "set" or "none"; the box starts empty |
| `active_from` / `active_until` | `settings.startsAt` / `endsAt` as local date-time values |
| `folder_id` | `folderId` |

Round trip: saving a code that was loaded and not changed sends nothing. Comparing the saved and
current editor state decides whether **Save changes** is enabled.

### 3.4 Saving: `update_code`

A new migration adds `update_code(p_id uuid, p_patch jsonb, p_password text default null,
p_password_action text default 'keep') returns qr_codes`. Its rules:

- It is **security invoker**, so row-level security decides who may update: the owner, or a
  teammate who can edit when the code isn't private.
- `p_patch` may contain only `name, content, design, destination, slug, folder_id, active_from,
  active_until`.
  - Unknown keys raise an error.
  - Keys left out stay unchanged.
  - `folder_id` must be null or one of the code owner's folders. Otherwise it raises "That folder
    isn't in this code's space".
  - Status (Pause/Resume) stays on the code page's menu.
- `p_password_action`:
  - `keep` (default): leaves the password alone.
  - `set`: calls `set_code_password(p_id, p_password)`.
  - `clear`: calls `set_code_password(p_id, null)`.
  - `set` and `clear` on a static code raise an error.
- It runs in one transaction, so a failed password change undoes the field changes too.
- Existing errors pass through unchanged. For example, a taken slug returns "That link ending is
  already taken".
- The existing restrictive two-step policy (`mfa_satisfied()`) applies, as it does for
  `create_code`.

On the client, `updateCodeWithSettings(id, patch, password)` sits next to `createCodeWithSettings`
in `features/codes/api.ts`. A `toCodePatch(saved, state)` helper in `features/create/submit.ts`
builds only the changed fields.

### 3.5 The code page becomes an overview

`/codes/<id>` keeps its layout and loses the inline edit forms.

**Kept:**
- the header: back link, name, status pill, and the short link with Copy and Test
- the scans summary with **Open analytics**
- Download
- the actions **Pause/Resume, Duplicate, Move, Delete**
- hosted-page feedback responses

**Added:** a main **Edit code** button for people who can edit. Viewers don't see it.

**Removed, because the editor now covers them:**
- "Where it points" destination form
- campaign-tag form
- "Link ending" form
- name and folder form
- `AccessCard` (password and dates)
- the "Edit design" and "Edit content and design" links to `/?edit=`

**Summaries:** where a removed form showed a value, the overview shows it read-only: destination,
password on or off, start and end dates, and folder.

**Codes list:** the ⋯ menu (`CodeActions`) gains **Edit** for codes the person can edit.

### 3.6 Old paths

- `/?edit=<id>` forwards to `/codes/<id>/edit` with a 308.
  - A signed-out visitor goes through sign-in with `next` set to that address.
  - The forward is a server-side check on `/`, so it works before the page renders.
- The public generator's edit mode is removed (`useGenerator`'s `?edit` handling, the
  `editTransition` logic and the matching `SavePanel` states).
  - Saving a new code there while signed in now opens `/codes/<id>`, instead of switching the
    home page into edit mode.
  - The rest of the public generator is unchanged until Phase 5.
- The analytics page's "Create a trackable code" link points to `/codes/new?type=url`, where
  Trackable is already on by default.

### 3.7 Tests (Release 1)

**Unit:**
- `fromSavedCode`: every type, a trackable link with campaign tags, a hosted page, and dates.
- `toCodePatch`: no changes gives an empty patch; one field changed gives only that field.
- The reducer locks Type and Trackable in edit mode.
- Save is disabled until something changes.
- The slug warning appears.
- Password set, clear and keep.

**Migration (PGlite):** `update_code` for:
- the owner, an Editor, a Viewer (denied), and another member's private code (denied)
- unknown patch keys (rejected)
- a taken slug
- a password on a static code (rejected)
- a failed password check undoing the field changes
- MFA required

**Signed-in browser:**
- create a code, then Edit; change the content, a design color, the dates and the name; save;
  reopen and confirm the changes stuck
- a Viewer gets no Edit button, and the Edit address bounces
- `/?edit=<id>` forwards
- leaving with unsaved changes asks first
- the axe sweep includes `/codes/<id>/edit` at 390, 820 and 1280 px

## 4. Release 2: the new name and look (still on qr.techitdave.com)

### 4.1 Colors

Token names in `app/globals.css` stay. Their values change to kit C's.

**Changed tokens:**

| Token | Light | Dark |
| --- | --- | --- |
| `bg` | `#FFFFFF` | `#070B1A` |
| `surface` | `#F7F9FC` | `#0D1428` |
| `surface-2` | `#EDF1F7` | `#141D36` |
| `border` | `#DCE3ED` | `#232E4D` |
| `field-border` | `#7A8699` | `#66728C` |
| `fg` | `#0A1330` | `#E6EEFA` |
| `fg-muted` | `#45506A` | `#A9B6CC` |
| `fg-subtle` | `#5D6880` | `#8592AB` |
| `primary` / `primary-hover` / `primary-fg` | `#0A1330` / `#1E2A55` / `#FFFFFF` | `#5CE1FF` / `#8AEBFF` / `#04101F` |
| `primary-soft` / `primary-soft-fg` | `#E0F7FF` / `#075A73` | `#0B2B3A` / `#9FEFFF` |
| `link`, `ring` | `#0B6E8C` | `#7FE9FF` |
| `neutral` / `neutral-soft` | `#45506A` / `#E9EEF5` | `#C3CCDB` / `#232E4D` |
| `selection` | `#CDEFFA` | `#12406B` |
| `chart-1` | `#5B45E0` | `#A99BFF` |
| `shadow-color` | `226 66% 11%` | `228 60% 2%` |

**Status colors** (success, warning, danger and their soft versions) keep today's values.

**New tokens:**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `sidebar` | `#0A1330` | `#0D1428` | Desktop sidebar and tablet rail background |
| `sidebar-fg` / `sidebar-muted` | `#E6EEFA` / `#A9B6CC` | same | Sidebar text |
| `sidebar-active` / `sidebar-active-fg` | `#16224A` / `#7FE9FF` | same | Current sidebar item |
| `sidebar-border` | `#232E4D` | `#232E4D` | Sidebar dividers |
| `scan` / `scan-fg` | `#5CE1FF` / `#04101F` | same | The cyan button in the sidebar ("New code"), the logo beam, and glow details on dark surfaces |
| `ion-soft` / `ion-soft-fg` | `#EEEBFF` / `#4A3BB8` | `#2A2257` / `#CFC7FF` | Team badges |

**Removed token:** `logo-ring`. The logo uses the brand colors in 4.3.

**Rules:**
- The phone top bar, bottom tabs and More sheet keep the regular surface tokens. Only the desktop
  sidebar and tablet rail turn navy.
- Scan cyan is never used for text on a light background.
- The new names avoid `--accent`, which `theme.test.ts` bans, and the lime ban stays.
- `theme.test.ts` gets the new pairs: sidebar text on sidebar, active item, `scan-fg` on `scan`,
  `ion-soft-fg` on `ion-soft`. The rules stay the same: 7:1 for main text, 4.5:1 for secondary,
  3:1 for borders and controls.
- A value may be nudged only to pass that test, and must look the same.

**Hardcoded palettes** move to the new colors:
- `lib/dynamic/status-page.ts`
- the four auth email templates
- `pages-redirect/*.html`
- the brand script
- the `bg-checker` utility, which stays neutral gray

### 4.2 Fonts

The fonts are bundled with the app from npm font packages, through `next/font/local`, the same way
Inter is today. Inter is removed.

| Role | Font | Where |
| --- | --- | --- |
| `--font-sans` | IBM Plex Sans (400, 500, 600, 700) | Body text, buttons, forms |
| `--font-display` | Archivo, variable, width axis 100–125 (600, 700) | Headings at 112% width, wordmark and all-caps labels at 125% |
| `--font-mono` (new) | IBM Plex Mono (400, 500) | Short links, API keys, code samples |

- Only the Latin subset is loaded.
- Page-title headings use `font-display` at 112% width. The 31 existing `font-display` uses keep
  the class.
- The wide 125% uppercase style is used only for the wordmark and for small eyebrow labels, such
  as "Short link" above the link on the code page.
- Form field labels stay in IBM Plex Sans, sentence case, for readability.

### 4.3 Logo and generated images

`components/brand/mark.ts` is rewritten for the new mark (64×64 grid):

- **Corners:** four rounded corner brackets.
- **Bars:** the two horizontal strokes of the "Z".
- **Beam:** the "Z"'s diagonal, drawn in cyan, with a soft halo at large sizes.

| Variant | Corners | Bars | Beam | Used for |
| --- | --- | --- | --- | --- |
| On light | `#45506A` | `#0A1330` | `#0B9CC4` and a `#5CE1FF` halo | Public header, sign-in card |
| On dark | `#A9B6CC` | `#E6EEFA` | `#5CE1FF` and a halo | Navy sidebar, dark mode, film backgrounds |
| Tile | `#7C8AA8` on a `#0A1330` tile | `#FFFFFF` | `#5CE1FF` | App icons, favicon, hosted-page footer |
| Small (24 px and under) | none | as tile | as tile | Favicon 16/32 and tiny spots |

**Wordmark:**
- It reads "ZIPLUME": Archivo 700, 125% width, 0.14em letter spacing.
- **Framed version:** viewfinder corners in deep cyan `#0B9CC4` on light or `#5CE1FF` on dark. It
  appears on the sign-in card and in the social image.
- **Bare version:** everywhere else (sidebar, phone top bar, public header, footers).
- `components/brand/Logo.tsx` exports `LogoMark` (variants) and `Wordmark` (`framed?`).

**Generated images.** `npm run brand` (`scripts/build-brand-assets.mjs`) regenerates:
- `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`
- `public/icons/{icon-192, icon-512, icon-maskable-512}.png`
- `public/brand/*`
- `app/opengraph-image.png` and `app/twitter-image.png`: the film background, framed wordmark,
  tagline, sub-tagline and a QR.
  - The QR encodes the site address, passed to the script.
  - It is regenerated in Release 3 for ziplume.com.

**Other places the brand color appears:**
- **Manifest:** name "Ziplume", `theme_color #0A1330`, `background_color #FFFFFF`.
- **Viewport theme colors:** `#FFFFFF` and `#070B1A`.
- **`e2e/generator.spec.ts`:** it uploads `public/icons/icon-192.png` as a logo in a scan test.
  The new icon must still scan in that test.

### 4.4 Name and copy

- **Every user-visible "QuickQReate" becomes "Ziplume"**, using the inventory in the planning
  notes:
  - pages: the sidebar's "Support Ziplume", the `aria-label`s, sign-in, invite, the MFA prompt,
    the developers, privacy and terms pages, the analytics note, the hosted-page footer
    ("Made with Ziplume"), the short-link status page title, and the Buy-me-a-coffee card
  - API docs link text, and all metadata
- **Page titles:** one shared title pattern (`title.template: "%s · Ziplume"` in the root layout)
  replaces the hardcoded "· QuickQReate" suffix on 20 pages.
- **Taglines:**
  - The home page headline becomes "Make it. Link it. Share it."
  - The line under it starts with "QR codes, short links, and simple sharing tools." followed by
    today's sentence about free use and accounts.
  - The sub-tagline also becomes the site's meta description.
- **Downloads and file metadata:**
  - Download names: `ziplume-<type>…`, `ziplume-<type>-codes.zip`, plus the bulk template CSV,
    selection ZIP and analytics CSV names.
  - EPS `%%Creator`, PDF creator and iCal `PRODID` say Ziplume.
  - The iCal event UID suffix stays `@quickqreate`, so calendars don't duplicate events.
- **`TemplatesSection` sample QR data** becomes "Ziplume".
- **Migration message:** the invite limit message in the database ("QuickQReate has sent all the
  invite emails it can today") changes through a small migration that replaces that function with
  "Ziplume has sent…".
- **Docs:** `README.md` and `docs/accounts-setup.md` are renamed. Earlier specs and plans stay as
  history.
- **GitHub Pages redirect page** (`pages-redirect/*.html`): the copy reads "Ziplume has moved".
  The `/QuickQReate` path regex stays, because it is the Pages path.

### 4.5 Emails

- **Restyle:**
  - The four auth templates (`public/email-templates/*.html`) and the invite email
    (`emails/invite.ts`) get the new look: a navy header band with the wordmark, navy buttons,
    deep-cyan links and the new name.
  - The invite email's footer and plain-text version are renamed.
  - Today the auth templates use the old palette, and they are brought in line with the invite
    email.
- **Sender:** the name is "Ziplume", in `lib/email/brevo.ts`. The address stays
  `no-reply@techitdave.com` until Release 3.
- **Server change, after the deploy:** in the Supabase project environment, set
  `SMTP_SENDER_NAME=Ziplume` and these subjects:
  - "Confirm your Ziplume account"
  - "Reset your Ziplume password"
  - "Confirm your new email for Ziplume"
  - "Your Ziplume sign-in link"

  Then restart only the auth service. A test email checks the new look.
- **Google Cloud (David signs in):** rename the OAuth consent screen app from "QuickQReate" to
  "Ziplume". No logo is uploaded, because a logo triggers Google's brand review.

### 4.6 Defaults for new codes and pages

- The default QR design (`features/generator/state/defaults.ts`) moves from the indigo gradient to
  navy `#0A1330`.
- The default hosted-page color `DEFAULT_PAGE_COLOR` moves from `#4F46E5` to `#0A1330`.
- The accent swatches in the page editor include the new navy and deep cyan.
- Saved codes and pages keep their colors.
- The gradient presets keep passing the existing 4.5:1-on-white test.

### 4.7 Internal names that stay

These keep their old internal names, because no person sees them and changing them would break
saved data or issued keys:
- the API key prefix `qq_`
- the unlock cookie `qq_unlock_<SLUG>`
- the SVG id `qq-frame-inner`
- the iCal UID suffix
- the sentinel `quickqreate.invalid`
- the applied migration file names
- `supabase/config.toml`'s `project_id`
- the GitHub repo name and its Pages path

The localStorage keys and the service-worker cache prefix are renamed in Release 3 (see 5.6).
Window event names and `package.json`'s name are renamed in Release 2, because nothing outside the
page reads them.

### 4.8 Tests (Release 2)

- **Contrast:** `theme.test.ts` checks the new values and the new pairs in both themes.
- **Name tests:** every test that asserts the name (download names, email subject and sender, the
  sidebar label, the e2e link name) is updated in the same commit as its copy.
- **Name guard:** a new unit test fails if `quick ?qreate` (any case) appears in `app/`,
  `components/`, `features/`, `lib/`, `emails/`, `public/email-templates/` or
  `pages-redirect/`. Only an allowlist of the internal names in 4.7 may contain it.
- **Accessibility:** the axe sweeps run as they do today: the app pages at 390, 820 and 1280 px,
  dark `/codes`, `/team`, home, `/bulk` and `/developers` in light and dark.
- **Migration:** the PGlite migration test covers the renamed limit message.

## 5. Release 3: the move to ziplume.com

### 5.1 Address rules

**Settings:**
- `NEXT_PUBLIC_SITE_URL`, which already exists, is the one true address, `https://ziplume.com`.
- A new runtime setting lists the old addresses: `LEGACY_HOSTS=qr.techitdave.com`.

| Request host | Behavior |
| --- | --- |
| `ziplume.com` | Normal |
| `www.ziplume.com` | Every path forwards to `https://ziplume.com` + the same path and query, through Coolify's "redirect to non-www" |
| a `LEGACY_HOSTS` entry | **Served directly:** `/r/*`, `/R/*`, `/p/*`, `/api/*`, `/_next/*`, `/email-templates/*`, `/brand/*`, `/icons/*`, `/sw.js`, `/favicon.ico`, `/icon.svg`, `/apple-icon.png`, `/manifest.webmanifest`, `/opengraph-image.png`, `/twitter-image.png`. **Everything else:** a 308 to `https://ziplume.com` + the same path and query. |
| anything else (Coolify's health check on `127.0.0.1`, `localhost`, CI) | Normal, never forwarded |

**Why the old address serves these paths directly:**
- **Printed codes:** scans of printed codes keep counting with no extra hop.
- **Hosted pages:** they keep loading their scripts, fonts and images.
- **API keys:** they keep working, because many HTTP clients drop the `Authorization` header when
  forwarded to another host.
- **Offline helper:** the service worker updates in place, because browsers refuse a forwarded
  service-worker script.

**What forwarding preserves:**
- **Email links:** confirm and reset links already sent (`/auth/confirm?token_hash=…`) still work,
  because the token check doesn't depend on a cookie from the old host.
- **Google sign-in:** one that is half-finished at the moment of the switch fails once and works on
  retry.

**Where the rule lives:** it is applied by `proxy.ts`, whose matcher grows to cover every path.
The `/R/` rewrite stays. A pure function `legacyHostAction(host, pathname)` makes the rule
unit-testable.

**What changes automatically with `SITE_URL`** (the address is baked in at build time, so it takes
effect after a rebuild):
- short links, QR payloads and downloads
- the developers page's API base
- invite links
- status pages
- the hosted-page feedback origin check, which also accepts the request's own origin, so feedback
  still works on the old address

### 5.2 Preparation

Nothing changes for users during preparation.

1. **Cloudflare, ziplume.com zone (David signs in):**
   - add `ziplume.com` A `152.44.42.29` and `www` CNAME `ziplume.com`, both **DNS-only** at first
   - set **SSL/TLS** to **Full (strict)**
   - turn **Always Use HTTPS** off, because the server already forwards to HTTPS and must answer
     certificate renewals on plain HTTP
   - turn on **Managed Transforms → Add visitor location headers**
   - leave caching at the default (only versioned files, no page rules)
2. **Brevo (David signs in):**
   - add ziplume.com and add the records Brevo shows to the ziplume.com zone: the `brevo-code`
     TXT, two DKIM CNAMEs and a `_dmarc` TXT, starting with `p=none` and a report address
   - wait until Brevo shows the domain authenticated
   - add the sender **Ziplume <no-reply@ziplume.com>**
   - keep the techitdave.com sender
3. **Coolify:**
   - add `https://ziplume.com` and `https://www.ziplume.com` to the app's domains, next to
     `https://qr.techitdave.com`
   - set the direction to redirect `www` to non-www
   - wait for both Let's Encrypt certificates
4. **Cloudflare proxy:**
   - turn the proxy on (orange cloud) for `ziplume.com` and `www`
   - check that the site loads through Cloudflare with a valid certificate
   - check that a request to `http://ziplume.com/.well-known/acme-challenge/<random>` reaches the
     server's certificate handler, not the app
   - write the first renewal date (about 60 days out) in the runbook
5. **Supabase project env:** add `https://ziplume.com/auth/callback` and
   `https://ziplume.com/auth/confirm` to the allowed redirects (`GOTRUE_URI_ALLOW_LIST`),
   keeping the old ones.
6. **Google Cloud (David signs in):**
   - add `https://ziplume.com` to the client's JavaScript origins, keeping the old one
   - add `ziplume.com` to the consent screen's authorized domains
   - point its home page, privacy and terms links at `https://ziplume.com/…`
   - the redirect URI (the Supabase callback) is unchanged
7. **Read-only database check:** count saved codes, destinations and page contents that contain
   `qr.techitdave.com`. Any found keep working through the old-address rules, and are listed for
   David.

### 5.3 The switch (about 15 minutes)

1. **Coolify env:**
   - `NEXT_PUBLIC_SITE_URL=https://ziplume.com` (build and runtime)
   - `LEGACY_HOSTS=qr.techitdave.com`
   - `INVITE_FROM_EMAIL=no-reply@ziplume.com`

   These are set **before** the merge, so the auto-deploy builds with them.
2. **Merge Release 3.** Coolify builds and deploys it. Watch for the new build ID.
3. **Supabase project env:**
   - `SITE_URL=https://ziplume.com`
   - `GOTRUE_MAILER_TEMPLATES_*` set to `https://ziplume.com/email-templates/…`
   - `SMTP_ADMIN_EMAIL=no-reply@ziplume.com`

   Then restart only this project's auth service.
4. **GitHub Pages:** run the workflow with `redirect_to=https://ziplume.com`, so the old Pages
   address forwards straight to the new one.
5. **Records:** update `docs/accounts-setup.md`, the runbook and the go-live memory with the new
   address, the settings, and the certificate renewal date.

### 5.4 Live checks (right after the switch)

- **Addresses:**
  - `https://ziplume.com` and `https://www.ziplume.com` load, `www` forwards, and the
    certificates are valid.
  - `https://qr.techitdave.com/codes` forwards to `https://ziplume.com/codes`.
- **Printed codes:**
  - An existing short link `https://qr.techitdave.com/r/<slug>` (and the uppercase `/R/` form)
    sends the visitor on, and the code's scan count rises by exactly one.
  - A hosted page `https://qr.techitdave.com/p/<slug>` loads fully.
- **Scans on the new address:** a short link through ziplume.com records a scan with country and
  city.
- **Sign-in and email:**
  - Google sign-in and email sign-in work on ziplume.com.
  - A sign-up confirmation, a password reset and a team invite arrive from
    `no-reply@ziplume.com`, pass DKIM, show the new look, and link to ziplume.com.
  - David runs these with his test account `dvdallmon+qrtest@gmail.com`.
- **API keys:** an existing key works with `curl` on both `https://ziplume.com/api/v1/…` and the
  old address.
- **Cloudflare challenges:**
  - A scan from a phone camera app and an API call from a script are not challenged.
  - If Cloudflare challenges them, its Browser Integrity Check is turned off for the zone.

### 5.5 Rolling back

- **Before step 3 of the switch:** set `NEXT_PUBLIC_SITE_URL` back, empty `LEGACY_HOSTS`, and
  redeploy. This restores the old behavior.
- **After step 3:** also put back `SITE_URL`, the template addresses and the sender.
- `qr.techitdave.com` never stops serving short links at any point.

### 5.6 Renames that ride along

The new address starts with empty browser storage anyway, so Release 3 renames these at no extra
cost:
- the localStorage keys: `quickqreate:draft:v2:*` and `quickqreate:codes-view:*` become
  `ziplume:…`
- the service-worker cache prefix becomes `ziplume-`. The activate step deletes both old
  prefixes.

The literal `quickqreate:v1` stays, because the generator only ever deletes it.

### 5.7 Tests (Release 3)

- **Unit:** `legacyHostAction` with no legacy setting, the canonical host, `www`, each
  directly-served path and its uppercase or nested forms, other paths with query strings, and
  unknown hosts. Plus the storage-key and service-worker prefix changes.
- **Browser (public suite):**
  - Requests with `Host: qr.techitdave.com` to a short link and a hosted page are served.
  - `/codes` and `/` get a 308 to the canonical address with path and query kept.
  - The health check on `127.0.0.1` is not forwarded.
  - The test build sets the canonical and legacy settings itself.
- **Name guard:** the guard test from 4.8 also checks for `qr.techitdave.com` in user-facing
  source, outside tests and docs.

## 6. Effect on the redesign phases

- These three releases run before **Phase 3b**, which comes next after them.
- **Phase 4** loses the Content, Design and Settings tabs from section 4.3 of
  `2026-10-14-quickqreate-redesign-design.md`, because editing now happens in the Create editor.
  Phase 4 keeps `/analytics`, `/templates`, and polish of the code page overview.
- Phase 4's planned `/?edit=` → `/codes/<id>/design` redirect becomes Release 1's
  `/?edit=` → `/codes/<id>/edit`.
- **Phase 5** is unchanged, and uses the Ziplume look.

## 7. Risks and open items

- **Certificate renewals through the proxy:** Let's Encrypt renews over plain HTTP through
  Cloudflare.
  - Mitigations: Always Use HTTPS off, a renewal check on switch day, and the renewal date in the
    runbook.
  - If renewal ever fails, the fallback is a Cloudflare Origin CA certificate in Coolify, done as
    a separate change.
- **A new mail domain has no reputation:** the first emails from ziplume.com may land in spam more
  often. DMARC starts at `p=none` and moves to `quarantine` after a few clean weeks.
- **Everyone signs in again** on ziplume.com, and unsaved Create drafts on the old address don't
  carry over.
- **Old printed codes show no scan location,** because `qr.techitdave.com` stays DNS-only and its
  record isn't touched.
- **Google's account chooser** may still show the Supabase host
  (`quickqreate-1791927515091.supabase.techitdave.com`) in its "continue to" line. Changing it
  needs a custom auth domain on the shared Supabase server, which is out of scope.
- **Fonts:** Archivo's width axis makes the display font larger. Only the Latin subset loads.
- **Cloudflare security features** could challenge scanners or API scripts; switch day checks for
  this (5.4).

## 8. Out of scope

- a custom auth domain (for example `auth.ziplume.com`)
- renaming the GitHub repo
- changing the API key prefix
- proxying or otherwise changing `qr.techitdave.com`'s DNS
- an inbox or forwarding for ziplume.com mail
- Phase 3b, 4 and 5 features
