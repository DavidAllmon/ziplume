# Ziplume hosted pages: a live editor, page looks, and a phone layout fix

Draft for David's approval, 2026-10-15. Decisions taken with David in conversation the same day
(section 2). Linktree's editor was the reference David pointed to; this design borrows its ideas
(a live preview, themes, header layouts, fonts, button styles) without copying its look.

## 1. Why, and what success looks like

Twelve code types open a page Ziplume hosts at `/p/<slug>`: Link list, Contact page, Business,
Menu, Coupon, Event, Feedback, PDF, Images, Video, Audio and App. Today:

- **A page's look is one color.** There is no choice of background, font, button style or
  header layout, and the page turns dark or light to match each visitor's phone setting.
- **The editor hides the page.** The color picker is the last field of Content, the QR code's
  look is a separate Design section, and the page preview sits behind a "Page" tab that starts on
  the QR code and stays blank until the page is valid.
- **The flow is one long scroll.** Type tiles, content, QR design, settings and name are five
  stacked cards. The hint under the Create button says "This field is required" without naming
  the field.
- **Phones:** the app can scroll past its content, and the bottom menu moves at the end of a page
  (seen in Chrome on an iPhone). The Create page stacks about 180px of fixed bars.

Success means:

- An owner sees their page live, as a phone, a tablet or a desktop, while they edit it.
- An owner can give a page a finished look in one click (a theme) and then adjust the wallpaper,
  header, font and buttons, without being able to make it unreadable by accident.
- Every visitor sees the same page.
- Creating a page is: pick a type, fill in the content, pick a look, create. Each step is a tab,
  and the Create button says exactly what is missing and takes you to it.
- On every phone size the app ends where its content ends, and the bottom menu stays put.
  Automated tests check this on iPhone and Android screen sizes.

## 2. Decisions

| Question | David's answer |
|---|---|
| Editor layout | Tabs (Content, Look, QR code, Settings) with a live preview beside them, plus a switch between phone, tablet and desktop previews |
| Light and dark | The owner picks the look and every visitor sees exactly that |
| What "Create code" opens | A type gallery first |
| Where the scroll bug was seen | Chrome on iPhone; the fix must hold on all phones, checked by code |
| Restore the codes deleted on 2026-10-15 | No |

Assumptions (correct them in review):

- Existing pages switch to the new renderer with a light "Paper" look that keeps their current
  color as the button color (section 6.9). The only pages in production today are David's 12
  samples plus any early users' pages.
- This project goes before Phase 3b (teams switch row, Private codes).
- The signed-out home-page generator keeps its own UI until Phase 5; its page preview uses the
  shared renderer, so it gets the new looks for free.

## 3. Releases

Three releases, each shipped and checked before the next starts. Each gets its own
implementation plan, written just before it starts.

1. **Phone layout fix** (small). Ships first, on its own.
2. **The editor.** Type gallery, tabbed editor, live device preview, cleaner Content forms,
   drag to reorder, named errors, focused phone editor. The Look tab holds today's page color
   until release 3.
3. **Page looks.** Themes, wallpaper, header layouts, fonts, buttons, the new page renderer, and
   the stored `look` data.

## 4. Release 1: phone layout fix

### 4.1 Causes found in the code

- `components/app/AppShell.tsx:239`: `main` reserves `pb-28` (112px) for a tab bar that is 57px
  plus the safe area. That leaves up to 55px of empty space at the end of every page.
- `features/create/CreatePage.tsx:88` and `features/create/EditCodePage.tsx:37` add `pb-24`
  (96px) on top, for 208px in total.
- Nothing sets `overscroll-behavior` on the page, so the iPhone's bounce at the end of a page
  pulls the content, and the fixed tab bar appears to move with it. Chrome on iPhone uses the
  same engine (WebKit) as Safari.
- `AppShell.tsx:149` sets `min-h-dvh`, which changes as the browser's toolbar hides and shows
  and makes the page relayout while scrolling. The body already paints the background, so it
  isn't needed.
- Smaller offsets that don't follow the bar's real height: the toast stack (`Toast.tsx:35`,
  `bottom-28`), the codes selection bar (`SelectionBar.tsx:70`, `bottom-24`, which rides up 16px
  at the end of the list) and the Create bar (`CreateMobileBar.tsx:21`).
- Found while writing the tests: the signed-out header (logo, coffee button, theme switch, Sign
  in) is wider than every phone up to 412px, so the whole site scrolls sideways (97px at 320px,
  24px on an iPhone 15).
- Related: the paused/expired notice on `/p/<slug>` (`app/p/[slug]/page.tsx:29`) and the
  short-link status page (`lib/dynamic/status-page.ts:25`) are always taller than the screen;
  the code page's `#download` jump lands under the 56px phone top bar (`CodeOverview.tsx:339`,
  `scroll-mt-6`).

### 4.2 Fix

- One CSS variable for the bar: `--tabbar-h`, `0px` from the `sm` breakpoint up and
  `calc(3.5rem + 1px + env(safe-area-inset-bottom))` on phones. `main`'s bottom padding becomes
  `calc(var(--tabbar-h) + 1.5rem)`. The toast stack, selection bar and Create bar position
  themselves from the same variable.
- Remove the extra `pb-24` from the Create and Edit pages; their fixed bar adds its own height
  through a second variable, `--actionbar-h`.
- No bounce on app pages: `html:has([data-app-shell]) { overscroll-behavior-y: none; }`. This
  also turns off pull-to-refresh inside the signed-in app; public pages keep it.
- Drop `min-h-dvh` from the shell root.
- Notice pages use `min-h-dvh` for the whole page including the footer; the status page gets
  `box-sizing: border-box` and `min-height: 100dvh`; the download card's scroll margin clears the
  phone top bar.

- The signed-out header keeps only the logo and Sign in below 640px; the theme switch moves to
  the footer there (the coffee link is already in it).

If David's phone still shows the bar moving after this ships, the fallback is an app-style shell
where the page itself never scrolls and only `main` does (`h-dvh` flex column). It is held back
because it stops the browser toolbar from hiding and needs scroll-to-top handling on every
navigation.

### 4.3 Proving it on every phone

New Playwright projects run a phone-layout suite on six device profiles (heights are the
browser's visible area):

| Project | Engine | Viewport (CSS px) |
|---|---|---|
| iPhone SE (1st gen) | WebKit | 320 × 568 |
| iPhone SE | WebKit | 375 × 667 |
| iPhone 15 | WebKit | 393 × 659 |
| iPhone 15 Pro Max | WebKit | 430 × 739 |
| Pixel 7 | Chromium | 412 × 839 |
| Galaxy S8 | Chromium | 360 × 740 |

On every signed-in page (`/codes`, `/codes/new`, a code page, its edit page, `/codes/bulk`,
`/team`, each Settings tab), every public page type, and the signed-out site (home, sign-in,
sign-up, privacy, bulk, the short-link status page), the suite checks:

- no sideways scroll;
- after scrolling to the end, the tab bar's bottom edge equals the screen's bottom edge, and its
  top edge is where it was before scrolling;
- the last piece of content ends above the tab bar, with at most 32px of empty space between them;
- the page's total height is the content plus the bar plus that gap, nothing more.

CI installs the WebKit browser for these projects. Browser toolbars and the iPhone bounce can't
be emulated, so release 1 ends with David checking `ziplume.com` in Chrome on his iPhone.

## 5. Release 2: the editor

### 5.1 Starting a code: the type gallery

`/codes/new` without a `type` opens a gallery titled "What do you want to make?":

- **Link** first, as a wide tile: "Send people to a website. Change it any time."
- **Pages**: the 12 hosted types, each tile with a small drawing of the page and one line on what
  it's for.
- **Instant codes, work without internet**: Text, Wi-Fi, Contact card, Email, Phone, SMS,
  WhatsApp, Location, Payment.
- A search field filters all tiles. A "Make many at once" link goes to `/codes/bulk`.
- If an unfinished code is saved on this device, a banner offers "Continue your <type>".

Choosing a tile goes to `/codes/new?type=<id>` (keeping `folder`), so the browser's Back returns
to the gallery. Quick starts that already pass `?type=` skip the gallery. In edit mode the type
can't change, as today.

### 5.2 The editor frame

```
┌ ←  [icon] Link list   [ Name: Sample: Link list ✎ ]        Unsaved · [Create code] ┐
│ Content │ Look │ QR code │ Settings                                               │
├──────────────────────────────────────────┬────────────────────────────────────────┤
│ tab panel                                │ [Page | QR code]  [Phone|Tablet|Desktop]│
│                                          │          live preview (sticky)          │
└──────────────────────────────────────────┴────────────────────────────────────────┘
```

- **Top bar** (sticky): back arrow (to the gallery when creating, to the code page when
  editing), the type with its icon, the code name as an inline field whose placeholder is the
  suggested name, "Unsaved changes" and "Discard" when editing, and the primary button "Create
  code" or "Save changes".
- **Tabs** (a real tab list): Content, Look, QR code, Settings. Link and the instant codes have
  no Look tab. The open tab is kept in the address as `#content`, `#look`, `#qr` or `#settings`.
- **Name & folder** goes away as a section: the name sits in the top bar and the folder in
  Settings.

### 5.3 Live preview

- A view switch, **Page | QR code**, for page types. It follows the tab: Content and Look show
  the page, QR code shows the code, Settings keeps whichever was showing. Picking one by hand
  holds until the tab changes.
- A device switch, **Phone | Tablet | Desktop**, for the page view. The page renders at the
  device's real width (390, 820 or 1280 CSS px) inside a matching frame (phone bezel, tablet
  bezel, a browser window showing the page's address) and is scaled down to fit the column.
  The page scrolls inside the frame.
- The QR view shows the code large, with the existing "Verified scannable" badge and scan
  warnings.
- The page preview draws as soon as the editor opens, even before the content is valid; empty
  fields show their placeholder text in the preview.
- Links and buttons in the preview don't navigate; media doesn't play.
- When editing a saved page, an "Open the live page" link opens `/p/<slug>`.
- The page renderer sizes itself from its container (CSS container queries) instead of the
  browser window, so the tablet and desktop previews show the real wide layouts.

### 5.4 Content tab

Every page type uses the same order: a **Header** card first, then the type's own cards, then
**Social icons** where the type has them. Cards have plain headings.

| Type | Cards |
|---|---|
| Link list | Header (profile picture, title, bio) · Links · Social icons |
| Contact page | Header (photo, first and last name, job title, company) · About · Phone numbers · Email addresses · Website and address · Social icons |
| Business | Header (logo, cover photo, name, tagline) · Contact (phone, email, website, address) · About · Opening hours · Buttons · Social icons |
| Menu | Header (logo, restaurant name, description) · Sections and dishes · Currency and note |
| Coupon | Header (image, business) · Offer (offer, headline, description, coupon code, valid until) · Button · Terms |
| Event | Header (image, event name, organizer) · When · Where · Details · Tickets |
| Feedback | Header (logo, business name) · Question (question, ask for a comment, ask for contact details) · After sending (thank-you message) |
| PDF | File · Details (title, description) · Opening (open the PDF straight away) |
| Images | Details (title, description) · Images |
| Video | Video (link or upload) · Details |
| Audio | Audio (file or link) · Header (cover art, title, artist) · Details |
| App | Header (app icon, app name, description) · Store links · Website |

Lists (links, buttons, phone numbers, emails, menu sections and dishes, images):

- **Add** sits at the top of the list and the new row opens focused, as on Linktree.
- **Drag to reorder** with a handle, by mouse, touch or keyboard (focus the handle, Space, arrow
  keys, Space). Each row's "⋯" menu also has Move up, Move down and Remove. Images can move both
  ways. This uses `@dnd-kit/core` and `@dnd-kit/sortable` (MIT; keyboard and touch support
  built in).
- Rows keep a stable identity while being moved, so an error stays on the row it belongs to.
- **On/off switch** on each link (Link list) and button (Business): off hides it from the public
  page but keeps it in the editor. Stored as `on: boolean` on the item, default `true`.
- **Social icons**: a grid of network icons; picking one adds a row for its address.

### 5.5 Look tab (release 2)

Holds the existing page color picker, moved out of Content. Release 3 fills it out (section 6).

### 5.6 QR code tab

Today's Design section, unchanged inside: Start from a style, Colors, Shape, Logo, Frame, More
design options. Two changes:

- **Match my page** (page types): sets the code color and frame color to the first of these
  with at least 4.5:1 contrast on the code's white background: the page's button color, its
  darkest wallpaper color, or ink `#0F172A`. A code on light-on-dark colors would scan badly, so
  the background stays white.
- The QR "Logo" section is renamed **Image in the code**, so it isn't confused with a page logo.

### 5.7 Settings tab

Trackable (Link, when creating), password, active dates, short link ending, campaign tags (Link)
and **Folder**.

### 5.8 Errors and the Create button

- Messages name the field: "Add a title", "Add the link for “Buy me a coffee”", "Pick when the
  event starts". `lib/pages/validate.ts` keeps its error paths; only the wording changes.
- While something is missing, the button is disabled and the first problem shows beside it, with
  **Show me**. Show me opens the right tab, scrolls to the field, focuses it and shows its error.
- The rest of the button rules stay as today (`useCodeDraft` `blocker`).

### 5.9 Phones and tablets

- **Phones (below 768px):** the editor takes the whole screen. The app's top bar and bottom tabs
  hide on `/codes/new?type=…` and `/codes/<id>/edit`. Instead:
  - a top bar with back, the type icon and the name;
  - the tabs, sticky under it and scrollable sideways;
  - a bottom bar with a small QR, **Preview**, the first missing thing, and Create or Save.
    Preview opens a full-screen sheet with the same view and device switches.
- **Tablets (768–1279px):** two columns, with the app sidebar shown as its narrow icon rail on
  editor pages so the form keeps room.
- **Desktop (1280px and up):** two columns with the full sidebar.

### 5.10 Code page

The Hosted page card on `/codes/<id>` gets a small live phone preview of the page, next to the
short link, with **Edit page**.

## 6. Release 3: page looks

### 6.1 What an owner can set (the Look tab)

In this order:

1. **Theme**: nine tiles (6.2). Picking one sets the wallpaper, font, buttons and text color in
   one go, with an Undo toast. The header layout and image shape stay as they were.
2. **Header**: layout, Classic or Hero (6.4), and the image shape for Classic, Circle or Rounded.
3. **Wallpaper**: Solid (swatches plus a custom color), Gradient (two colors and a direction:
   down, diagonal or across), or Image (an upload, plus a Darken slider from 0 to 80%).
4. **Text**: font (6.3) and text color, Auto (recommended) or custom.
5. **Buttons**: shape (Square, Rounded, Pill), style (Solid, Outline, Soft), shadow (None, Soft,
   Hard), button color, and button text color (Auto or custom).
6. **Social icons** (Link list, Contact page, Business): under the header or at the bottom.

**Reset to theme** puts every field back to the current theme's values.

**Readability guard.** Auto colors always pick the more readable of near-white and near-black.
When a custom choice is hard to read, a warning appears under that control with a one-click fix:

- text against the wallpaper (both gradient ends; for an image, after darkening): at least 4.5:1;
- button text against the button: at least 4.5:1;
- a solid button, or an outline button's border, against the wallpaper: at least 3:1.

### 6.2 Themes

| Theme | Wallpaper | Font | Buttons | Text |
|---|---|---|---|---|
| Ziplume | gradient `#0A1330` → `#16245A`, down | Bold | pill, solid `#7FE9FF` | auto (white) |
| Paper | solid `#F6F5F1` | Clean | rounded, solid `#0F172A` | auto (ink) |
| Midnight | solid `#070B1A` | Clean | rounded, outline `#E6EEFA` | auto (white) |
| Ocean | gradient `#095E77` → `#0A1330`, diagonal | Clean | pill, soft (white at 16%) | auto (white) |
| Sunset | gradient `#C2410C` → `#881337`, diagonal | Bold | pill, solid `#FFFFFF` | auto (white) |
| Grape | gradient `#7C3AED` → `#3B0764`, down | Friendly | rounded, solid `#F5F3FF` | auto (white) |
| Forest | solid `#14532D` | Elegant | rounded, solid `#F5F0E1` | auto (white) |
| Blush | solid `#FCE7F3` | Friendly | pill, solid `#831843` | auto (ink) |
| Sand | solid `#F3E8D8` | Elegant | square, outline `#7C2D12`, hard shadow | auto (ink) |

Every theme passes the readability guard (checked while writing this spec: the tightest pairs
are Ocean's soft buttons at 5.0:1 and Sunset's text at 5.2:1); a unit test checks each pair.

New pages start on a theme chosen for the type: Link list and App on Ziplume; Contact page,
Business, Feedback and PDF on Paper; Menu on Sand; Coupon on Sunset; Event on Grape; Images and
Video on Midnight; Audio on Ocean.

### 6.3 Fonts

The chosen font sets the page title, headings and buttons. Longer text uses its reading partner.
All are self-hosted from `@fontsource` packages (Latin subset); a visitor's browser downloads
only the faces the page uses.

| Font (as shown) | Headings and buttons | Longer text | New package |
|---|---|---|---|
| Clean | IBM Plex Sans | IBM Plex Sans | already installed |
| Bold | Archivo, wide | IBM Plex Sans | already installed |
| Elegant | Playfair Display | IBM Plex Sans | `@fontsource-variable/playfair-display` |
| Friendly | Nunito | Nunito | `@fontsource-variable/nunito` |
| Modern | Bricolage Grotesque | IBM Plex Sans | `@fontsource-variable/bricolage-grotesque` |
| Typewriter | IBM Plex Mono | IBM Plex Mono | already installed |

### 6.4 Header layouts by type

| Type | Header image | Layouts |
|---|---|---|
| Link list | profile picture | Classic, Hero |
| Contact page | photo | Classic, Hero |
| Business | logo and cover photo | Classic (logo); Hero (cover across the top, logo overlapping it) |
| Menu, Feedback | logo | Classic, Hero |
| Audio | cover art | Classic (square art), Hero |
| Coupon, Event | image | always a banner at the top |
| App | app icon | Classic only |
| PDF, Images, Video | none | no header setting |

- **Classic**: the image centered above the name.
- **Hero**: the image fills the top of the page edge to edge and fades into the wallpaper; the
  name sits under it. With no image, the page shows Classic and the Look tab says "Add a photo
  to use Hero".

### 6.5 How the page is drawn

- **Cards** (opening hours, menu sections, event details and so on) take their surface from the
  wallpaper: on light wallpapers, white at 92% with a faint border; on dark ones, white at 8%
  with a white 12% border. Card corners follow the button shape (8, 16 or 24px).
- **Accent** (icons, the coupon offer, feedback stars, links in text) is the button color when
  it has at least 3:1 contrast on the card, otherwise the text color.
- **Layout**: one column, at most 560px wide, centered. On wide screens the wallpaper fills the
  window and the column floats in the middle.
- **Footer** "Made with Ziplume" in the page's muted text color, part of the page itself, so the
  preview shows it too.

### 6.6 Stored data

Each page type's content gains `look`:

```ts
interface PageLook {
  theme: "ziplume" | "paper" | "midnight" | "ocean" | "sunset" | "grape" | "forest" | "blush" | "sand";
  wallpaper:
    | { kind: "solid"; color: string }
    | { kind: "gradient"; from: string; to: string; direction: "down" | "diagonal" | "across" }
    | { kind: "image"; image: Media; dim: number; color: string }; // dim 0–80; color = fallback
  header: "classic" | "hero";
  shape: "circle" | "rounded";
  font: "clean" | "bold" | "elegant" | "friendly" | "modern" | "typewriter";
  text: "auto" | string; // hex
  button: {
    shape: "square" | "rounded" | "pill";
    style: "solid" | "outline" | "soft";
    shadow: "none" | "soft" | "hard";
    color: string; // hex
    text: "auto" | string;
  };
  socials: "top" | "bottom";
}
```

- `lib/pages/sanitize.ts` gets a `look` spec; unknown values fall back to the type's theme.
- **Pages saved before release 3** have no `look`. `sanitizePage` fills one in (6.9), so the
  editor, the public page and the API all see the same thing.
- `color` stays, and saving keeps it equal to `look.button.color`, for API users and older
  drafts.
- Link items (Link list `links`, Business `buttons`) gain `on: boolean` in release 2.
- The wallpaper image is page media: `mediaPaths` and `replaceMediaPaths` include it, so
  duplicating a page and the teams keep-or-take copy carry it; the API's media ownership check
  covers it.
- No database migration: content is jsonb, and the 64 KB limit leaves plenty of room.

### 6.7 Renderer

New shared pieces in `features/pages/`:

- `look/themes.ts`, `look/fonts.ts`, and `look/resolve.ts` (look → CSS variables, auto colors,
  accent, readability checks shared with the editor's warnings);
- `PageFrame` (wallpaper, variables, fonts, container-query root, footer), `PageHeader` (Classic,
  Hero, Banner), `PageButton`, `PageCard`, `SocialRow`.

Each type's view is rebuilt on these. The renderer stops using the app's light/dark tokens, so
a visitor's site theme no longer changes a page. Headings become consistent: every type has one
`h1` (Feedback and Coupon don't today).

### 6.8 The public page

- `app/p/layout.tsx` no longer paints the app background; the page paints its own wallpaper.
- The browser's theme color (`viewport.themeColor`) and `color-scheme` follow the page's
  wallpaper.
- Page metadata gains a description (bio, tagline or description) and, when the page has a
  header image, a share image.
- Paused, scheduled, expired and unavailable notices keep the Ziplume look.

### 6.9 Existing pages

A page without `look` is drawn with the Paper theme, Classic header, its saved `color` as the
button color, and social icons where that type shows them today (Link list under the header;
Contact page and Business at the bottom). Opening it in the editor shows exactly that, and
saving stores it. David's 12 sample pages are the main existing pages; all will change from
today's look.

### 6.10 API

`look` is accepted and returned in a page's `content`, sanitized like the rest. The API docs
page gets a "Page looks" section listing the fields and values. Requests without `look` get the
type's default theme.

## 7. Testing

**Release 1:** the phone-layout suite in 4.3, plus the existing no-sideways-scroll and axe checks.

**Release 2:**

- Unit:
  - the gallery (grouping, search, draft banner);
  - tabs and the address hash;
  - the view and device switches, including the scale-to-fit math;
  - Show me (tab, focus, error shown);
  - drag to reorder by keyboard;
  - the on/off switch;
  - Match my page.
- End to end:
  - create a Link list, a Business and an Event from the gallery on desktop and on a phone;
  - edit and save;
  - switch to the tablet preview and see the wide layout;
  - axe in light and dark at 390, 820 and 1280px;
  - no sideways scroll;
  - the phone-layout suite on the editor routes.
- Tests that depend on today's labels and layout are updated as part of the release:
  - `CreatePage`, `EditCodePage`, `EditorLayout` and `sections` unit tests;
  - `PageEditor` field order;
  - `e2e/accounts/create.spec.ts`, `edit.spec.ts` and `app.spec.ts`.

**Release 3:**

- Unit:
  - `sanitizeLook`, plus the fallback for pages saved without `look`;
  - every theme against the readability guard;
  - `resolve` (look → variables, auto colors, accent choice);
  - `mediaPaths` includes the wallpaper image.
- Render tests:
  - every type in both header layouts and in a light and a dark theme;
  - each asserts one `h1`, the buttons and the landmarks.
- End to end:
  - pick a theme in the editor, create, and check that `/p` shows its wallpaper and font;
  - axe and no sideways scroll on `/p` for every type under every theme, at phone sizes.

## 8. Not in this project

- Per-link thumbnails or icons
- Click counts per link
- Scheduling single links
- Collections, shops and payments
- Custom CSS or font uploads
- Button animations
- Saved page-look templates, which can follow the QR templates later
- The signed-out home generator's own UI (Phase 5)

## 9. Risks

- **Phone browsers:** Playwright can't emulate the iPhone bounce or Chrome's toolbar. The
  release 1 fix needs David's check on his iPhone; the app-style shell in 4.2 is the fallback.
- **Pages change look:** every existing page moves to the new renderer in release 3 (6.9).
- **Test churn:** release 2 rewrites many label-based tests; they are updated in the same
  release so CI stays green throughout.
- **New dependencies:** the `@dnd-kit` packages (release 2) and three font packages (release 3).
- **Size:** releases 2 and 3 are each larger than any earlier phase. Their plans split them into
  tasks that each leave the app working.
