# QuickQReate redesign: navigation, creation flow, profiles and invites

Status: draft for review · Date: 2026-10-14 · Owner: David Allmon

## 1. Why

Feedback from the first live use of qr.techitdave.com:

- Creating a new code starts with the previous code's settings (type, colors, logo, frame, export format, even the name).
- Password and active dates can only be set after a code exists, on a different page.
- Team invites only produce a link; nobody gets an email.
- The Google profile photo isn't used, and there is no way to add or change a photo.
- The interface is cluttered and hard to navigate.

An audit of the current code confirmed the causes. Research into other QR tools and well-regarded SaaS products shaped the direction below:

- QR tools: QR Code Generator PRO, Bitly, Uniqode, QR TIGER, Flowcode, Hovercode, QR Code Monkey, Canva and Adobe Express.
- General SaaS: Stripe, Vercel, Linear, Notion, Calendly, Mailchimp and Figma.
- Guidance: Nielsen Norman Group, Carbon and the Atlassian design system.

### What the audit found

- **The create page shows about 75–80 controls at once:** 22 type tiles, 6 design accordions, then save and export. Save is a small secondary button inside "Preview & download".
- **Signed-in users create on the public home page.** It tells them "no sign-up needed". "New code" and "Edit design" both go to `/`.
- **Two editors overlap.** The home-page generator (`/?edit=<id>`) and the code page (`/dashboard/codes/<id>`) both edit name and destination, and "Edit" means different things in different menus.
- **There is no sidebar.**
  - Bulk create and Team are buttons in the dashboard header.
  - Developers is only in the footer, and API keys are on `/account`.
  - "My codes" is hidden on phones.
- **Status uses three vocabularies across three places:** "Live", "Active"/Paused and "active". There is also jargon: Quartile, Link ending, Dynamic/Static, UTM, Corner centers.
- **The Buy Me a Coffee prompt appears in 5 places.**
- **Identity:** there is no avatar column or bucket, the Google picture is discarded, and the header ignores the profile name.
- **"New code isn't new" has three causes.**
  - Type, design and export settings are written to localStorage on every change and restored on every mount.
  - Opening an existing code overwrites that remembered state.
  - The in-page "New code" button resets almost nothing.

  Files: `useGenerator.ts:72-82, 255-260`, `persistence.ts`, `SavePanel.tsx:21`.

### What the research says works

- **Navigation:** a visible left sidebar with about 7 items and a prominent **+ Create**.
- **Creation:** one creation page with a sticky live preview and sections you can open in any order, rather than a locked wizard.
- **Type picker:** show the 6–8 common types, then "More types" with search.
- **Advanced settings:** password, schedule, short link and tracking tags appear both during creation and when editing.
- **Finishing:** one primary button, then land on the code's page.
- **New codes:** every new code starts clean, and unfinished work is kept as an explicit draft.
- **Invites:** sent by email, with a copyable link as backup.
- **Profile photos:** the OAuth photo by default, with upload and initials as fallback.
- **Free tier:** being genuinely free is the differentiator; the worst-rated QR tools break that promise. Static codes stay available without an account.

## 2. Decisions

These were made with David on 2026-10-14.

| Topic | Decision |
| --- | --- |
| Primary audience | Signed-in users get a real app. The public home page becomes a landing page with a quick static generator. |
| Create flow | One page: sections on the left (open in any order), live preview and a single **Create code** button on the right (option A). |
| Look | "Calm & professional": neutral grays, near-black primary buttons, one blue for links, white space, thin borders, no gradients. Light and dark modes stay. |
| Rollout | In phases. Each phase is its own PR and deploy. |
| Responsiveness | Every page fully responsive (phone, tablet, desktop), verified automatically. |
| Readability | Near-black primary text, dark-gray secondary text, 13px minimum, strong contrast in both themes. |

### Assumptions

These were stated to David and not objected to:

- The product stays free with no paywalls.
- No features are removed, only reorganized.
- Printed codes and links (`/r/<slug>`, `/p/<slug>`) never change.
- Coffee support stays but is quiet: the sidebar and the public footer only.

## 3. Information architecture

### 3.1 Signed-in app shell

Desktop (≥1024px) has a persistent left sidebar.

1. **Workspace switcher** (top left): "David's codes", or a team you belong to. Replaces the dashboard workspace chips.
2. **+ Create**: primary button. Its menu offers *Bulk create from a spreadsheet*. Creating while a folder is selected puts the new code in that folder.
3. **Codes**: folders are listed underneath (All codes, each folder with a count, + New folder). One click filters.
4. **Analytics** (new): scans across all codes in the workspace.
5. **Templates**: saved designs, including one default design.
6. **Team**: members, roles and email invites.
7. Bottom group:
   - **Settings**
   - **Help & API docs**
   - **Support QuickQReate** (coffee)
   - the signed-in user with photo and name. Their menu has Settings, Theme and Sign out.

Tablet (640–1023px) uses a collapsible icon sidebar. Phone (<640px) uses bottom tabs: Codes, Analytics, a centered **+** (Create), Team, More. More holds Templates, Settings, Help and Sign out.

### 3.2 Routes

| New route | Purpose | Replaces |
| --- | --- | --- |
| `/codes` | All codes (`?folder=<id>`, `?workspace=<owner>`, filters) | `/dashboard` |
| `/codes/new` | Create page (`?folder=`, `?type=`, `?workspace=`) | `/` for signed-in users |
| `/codes/bulk` | Bulk create inside the app (save to account, folder, trackable) | `/bulk` for signed-in users |
| `/codes/<id>` | Code page, Overview tab | `/dashboard/codes/<id>` |
| `/codes/<id>/content`, `/design`, `/settings`, `/analytics` | Code page tabs | `/?edit=<id>`, `/dashboard/codes/<id>/analytics` |
| `/analytics` | Workspace analytics overview | none (new) |
| `/templates` | Saved designs | the "My templates" accordion |
| `/team` | Members and invites | `/dashboard/team` |
| `/settings` (`/settings/security`, `/settings/api-keys`, `/settings/account`) | Profile and photo; password and two-step; API keys; delete account | `/account` |

Unchanged:

- Public pages: `/`, `/bulk` (static, no account), `/developers`, `/privacy`, `/terms`, the `(auth)` pages and `/invite/<token>`.
- Route handlers: `/r/<slug>`, `/p/<slug>`, `/api/*` and `/auth/*`.

Redirects use 308:

- `/dashboard` → `/codes`
- `/dashboard/codes/<id>[/analytics]` → `/codes/<id>[/analytics]`
- `/dashboard/team` → `/team`
- `/account` → `/settings`
- `/account/update-password` stays as the reset-link target.
- `/?edit=<id>` → `/codes/<id>/design`

A signed-in visitor to `/` is redirected to `/codes`. The public site stays reachable from the footer link "QuickQReate home".

`proxy.ts` session refresh extends to the new app routes.

### 3.3 Public site (signed out)

- **`/`** landing page:
  - Hero: "Free QR codes that never expire. No sign-up to start."
  - **Quick generator**:
    - static codes only, in 8 types: Link, Wi-Fi, Contact, Text, Email, Phone, SMS, Location
    - the style row, colors and logo
    - download PNG, SVG, PDF, EPS, JPG or WebP without an account.
  - Below the preview: "Want to change it after printing or see scans? Create a free account." Trackable codes, hosted pages, analytics and teams are listed as account features. Nothing is gated after the user has done the work.
  - Then "How it works" (3 steps), a features grid, an FAQ, and the footer (with coffee).
- When accounts are off (`accountsEnabled === false`), the landing page and generator still work. Account-only mentions are hidden, as they are today.

## 4. Pages

### 4.1 Codes list (`/codes`)

- **Header:** folder or "All codes" title, count, **Bulk create** (secondary), **+ Create code** (primary).
- **Toolbar:**
  - search (name, link or content)
  - **Type** filter
  - **Status** filter: Active, Paused, Scheduled, Expired, Static
  - sort: Newest, Recently updated, Most scans, Name
  - list/grid toggle (remembered per user in localStorage).
- **List row:** checkbox, thumbnail, name, then short link (trackable) or content summary (static), type, a single status pill, scans over 30 days, updated, and a ⋯ menu (Open, Duplicate, Move, Pause/Resume, Download, Delete).
  - A small lock icon marks password-protected codes.
- **Grid view:** cards with a thumbnail, name, type, status and scans. It has no badge pile.
- **Selection** shows a sticky action bar: Move, Download (ZIP), Pause/Resume, Delete, Clear.
- **Empty states:**
  - First code: "Create your first QR code" with 3 quick-start types (Link, Wi-Fi, Link list).
  - No results: "No codes match", with Clear filters.
- **Viewers** (team role) see no create, edit or delete controls. A short line says they can view only.

### 4.2 Create page (`/codes/new`)

Two columns on desktop: sections on the left and a sticky preview on the right. On phones it is a single column with a compact sticky preview bar that opens a full-screen preview. The sections are:

1. **What should it open?**
   - 8 common types as labelled tiles with a one-line description: Link, Link list, Wi-Fi, Contact, PDF, Menu, Text, Email.
   - **More types** opens a searchable list grouped as "Works without internet" (static) and "Hosted pages".
   - "Contact" and "Contact page" merge into one **Contact** type with a choice inside: "Save straight to phone" (static vCard) or "Show a contact page" (hosted, editable).
2. **Content**: the type's form. Hosted page types embed the existing page editor, split into smaller components (see 4.7).
3. **Design**:
   - "Start from a style": Classic, 4 color styles, and the user's templates, with the default template marked.
   - Then **Colors**, **Shape**, **Logo** and **Frame** as expandable groups, several of which can be open at once.
   - **Scan reliability** (error correction) is automatic: it rises when a logo is added. A manual control sits under "More design options".
   - **Reset to style** and **Save as template** are available.
4. **Settings** (trackable codes and hosted pages):
   - **Trackable** toggle, on by default. "Change where it points after printing, and see scans."
   - Password (optional, 4–128 characters).
   - Starts and Ends (optional, the user's time zone).
   - Short link: custom ending, or blank for random.
   - Campaign tracking (UTM fields), for Link only.
   - With Trackable off, these are disabled with the reason ("Static codes can't change after printing").
5. **Name & folder**: name auto-filled from the content and editable; folder defaults to the current folder.

The preview column holds the live QR, a scan-reliability check and a **Create code** button. Hosted types add a Code/Page toggle.

- Button states:
  - Disabled with the reason when required content is missing (for example "Add a website address").
  - "Creating…" while saving.
  - On success, go to `/codes/<id>` with a toast "Code created" and the Download panel ready.
- Static codes also offer **Download without saving** (secondary).

**Fresh state and drafts.** This is the Phase 0 fix, carried into the new page.

- Every visit to `/codes/new` starts from defaults, with folder and type taken from the URL params.
  - The default design is Classic until Phase 4. From then on, it is the user's default template if they have set one.
- Design, type and export settings are **no longer persisted** to localStorage. Only the theme (next-themes) and the Codes list/grid preference are remembered.
- Unfinished work is saved as a **draft** under the key `quickqreate:draft:v2:<userId>`:
  - written on change, debounced 500 ms
  - holds content, type, design, settings and name, but never the password
  - cleared on successful create or on **Discard**.
  - If a draft exists, the page shows "You have an unfinished code from 2 hours ago: Resume · Discard".
- Opening or editing an existing code never reads or writes the draft.
- Bulk create uses its own default design, not the last code's.

### 4.3 Code page (`/codes/<id>`)

> Superseded in part: content, design and settings are edited in the Create editor at
> `/codes/<id>/edit` (Ziplume Release 1). The code page is an overview.

- **Header:**
  - a breadcrumb (Codes / folder)
  - thumbnail, name and status pill
  - the short link with Copy and Test
  - **Copy link**, **Download ▾** (formats and sizes), and ⋯ (Duplicate, Move, Pause/Resume, Delete).
- **Tabs:**
  - **Overview:**
    - "Where it points": destination field for trackable links; for hosted pages, a page link and View page; for static codes, a content summary and "Edit content"
    - Scans: 7 days, 30 days, all time, a sparkline and "Open analytics"
    - an Access summary (password and dates) linking to Settings
    - Download with a preview, PNG/SVG/PDF and "More"
  - **Content** (hosted pages and static codes): the same content form as Create.
  - **Design**: the same Design section as Create, with live preview.
  - **Settings**: the same Settings section as Create, plus Name & folder, plus a Danger zone (Delete).
  - **Analytics**: the existing per-code analytics view, restyled.
- **One way to save.** Any change shows a sticky bar: "You have unsaved changes · Discard · Save changes".
  - Leaving with unsaved changes asks for confirmation (in-app navigation and `beforeunload`).
  - This replaces today's separate Change, Save dates, Save destination and Save name buttons.
- The pause/resume control lives in exactly one place, the ⋯ menu and its Paused banner, and uses the same status words everywhere.

### 4.4 Analytics overview (`/analytics`, new)

- Range control (7, 30 and 90 days, custom), scan totals and unique visitors, a daily chart.
- Top codes, countries, devices, and CSV export.
- Workspace-scoped: the same viewers and editors as the codes.
- Backed by a new SQL function `workspace_analytics(p_owner uuid, p_from timestamptz, p_to timestamptz, p_tz text)`, modelled on `code_analytics`, with the same `can_view` check.

### 4.5 Templates (`/templates`)

- A grid of saved designs with preview, name and "Default" badge, plus Rename, Set as default, Duplicate and Delete.
- "New template" opens the Design panel alone.
- Adds `design_templates.is_default boolean not null default false`, with a partial unique index per user so at most one default.

### 4.6 Settings (`/settings`) and Team (`/team`)

**Settings** has tabs.

- **Profile:**
  - photo with Upload photo, Remove, and "Use Google photo" when available
  - Name
  - Email (read-only), plus "Signed in with Google and email".
- **Security:** password and two-step verification (the existing components, restyled).
- **API keys:** the existing keys, with a link to the docs.
- **Account:** delete account, kept as it works today.

**Team.**

- Invite people:
  - one or more emails (comma or newline separated) and a role (Editor or Viewer), then **Send invites**
  - below it, "They get an email with a button to join · Copy invite link instead".
- Pending list: email, role, sent time and expiry, with **Resend** and **Revoke**.
- Members: photo or initials, name, role select, Remove.
- "Teams you're in": Open and Leave (as today).

Phase 3 replaces the team model (two-way sharing, keep-or-take removal, a member view of the Team page). See `2026-10-14-quickqreate-teams-design.md`.

### 4.7 Component boundaries

- `features/create/`: `CreatePage` composed of `TypeSection`, `ContentSection`, `DesignSection`, `SettingsSection`, `NameFolderSection` and `PreviewColumn`.
  - The same sections are used by the code page tabs.
  - State comes from a `useCodeDraft` hook: a pure reducer with explicit `reset(defaults)` and `load(code)`, and no implicit persistence.
- The 1,004-line `PageEditor.tsx` is split per hosted-page type, one editor component each, sharing field primitives.
- `components/app/`: `AppShell`, `Sidebar`, `BottomTabs`, `WorkspaceSwitcher`, `UserMenu`, `Avatar`, `SaveBar`, `EmptyState`, `StatusPill`, `PageHeader`.
- The old `features/generator` survives only as the engine: QR rendering, export and design state types. Its UI (`Generator.tsx`, `SavePanel`, `StyleCard`, `TypePicker`) is removed in Phase 5, once the landing page's quick generator uses the new sections.

## 5. Visual system ("Calm & professional")

**Tokens.** Update `app/globals.css`; names stay the same, values change.

- **Neutrals:**

  | Theme | bg | surface | surface-2 | border | field border |
  | --- | --- | --- | --- | --- | --- |
  | Light | `#ffffff` | `#fcfcfd` | `#f2f4f7` | `#eaecf0` | `#848d9c` |
  | Dark | `#0c0d0f` | `#131417` | `#1b1d21` | `#2a2d33` | `#6b7280` |

  Field borders are darker than first proposed so they meet the 3:1 rule below.

- **Text:**

  | Theme | fg | fg-muted |
  | --- | --- | --- |
  | Light | `#101828` | `#475467` |
  | Dark | `#f5f6f7` | `#c3c7cf` |

  `fg-subtle` is used only for non-essential decoration, never for text you need to read.
- **Primary (buttons):** near-black `#101828` with white text in light mode; near-white `#f5f6f7` with `#101828` text in dark mode.
- **Link/accent:** `#1d4ed8` (light) and `#60a5fa` (dark).
- **The lime accent is removed.**
- **Status pills:**
  - Active: green `#dcfae6` / `#05603a`
  - Scheduled: amber `#fef0c7` / `#93370d`
  - Expired: red `#fee4e2` / `#912018`
  - Paused and Static: gray `#eaecf0` / `#344054`
  - Dark-mode equivalents are defined with the same contrast.

**Contrast and size.**

- Primary text is at least 7:1 against its background.
- Secondary text is at least 4.5:1.
- Controls and borders that convey state are at least 3:1.
- Minimum font size is 13px; body text is 14px; headings run 16–22px; numbers use tabular figures.
- `app/theme.test.ts` is extended to assert these pairs in both themes.

**Type.** Inter only; Space Grotesk is removed.

**Shape.** 8px control radius, 12px card radius, 1px borders, a subtle single shadow on popovers only. No gradients or glows. At most one status pill per item.

**Icons.** lucide-react, one stroke width, always paired with a text label in navigation.

**Motion.** Short (150–200 ms) opacity and transform transitions only; respects `prefers-reduced-motion`.

**Responsive rules.**

- Every page renders from 320px to 1920px wide with no horizontal scrolling.
- Touch targets are at least 44×44px on phone layouts.
- Tables become stacked rows below 640px.
- Dialogs become full-height sheets on phones.
- The Create preview becomes a sticky mini bar plus a full-screen sheet on phones.

**Wording glossary.**

| Use | Instead of |
| --- | --- |
| Trackable | Dynamic |
| Static | Static |
| Short link | Link ending, slug |
| Scan reliability | Error correction L/M/Q/H |
| Campaign tracking | UTM tags (shown as a sub-label) |
| Team | workspace (in UI copy) |
| Active, Paused, Scheduled, Expired | Live, active |

Buttons start with a verb, in sentence case.

**Support prompt.** The coffee link appears only in the sidebar bottom group and the public footer. It is removed from the dashboard, account and analytics pages.

## 6. Data and server changes

All changes are new, versioned migrations in `supabase/migrations/` (created with the Supabase CLI naming). They are applied to the live project through the private SQL bridge, in a transaction each, after a verified backup.

### 6.1 Create with settings in one step (Phase 2)

New function:

```sql
public.create_code(p_code jsonb, p_password text default null) returns public.qr_codes
```

- **Security:** `security invoker` (as built in Phase 2a: the caller's row rules, two-step policy and column grants apply), `set search_path = ''`, `execute` granted to `authenticated`. The password goes through `set_code_password`.
- **Checks:**
  - `mfa_satisfied()`
  - the target owner (`p_code->>'user_id'`, or `auth.uid()`) passes `can_edit(owner)`.
  - Only columns authenticated users may already insert are accepted: name, qr_type, content, design, is_dynamic, destination, slug, folder_id, active_from, active_until.
  - Campaign tracking needs no column. The client adds UTM tags to `destination` with `lib/dynamic/utm.ts`, as it does today.
- **Writes:** inserts the row. If `p_password` is non-null, the code is dynamic and the password is 4–128 characters, it also writes the bcrypt hash to `code_secrets` and sets `has_password = true`.
- **Atomic:** all in one transaction, so it either fully succeeds or does nothing.
- **Tests:** PGlite tests in `supabase/test/migration.test.ts` cover:
  - owner and editor can create; viewer is denied
  - MFA restriction
  - password stored and checked through `check_code_password`
  - static code with a password is rejected
  - invalid dates are rejected.

### 6.2 Profile photos (Phase 1)

- `profiles.avatar_url text`, null when unset. The check allows `https://` URLs of at most 2,048 characters.
- `update (display_name, avatar_url)` is granted to authenticated users on their own row.
- `handle_new_user` also copies `coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')`.
- A backfill sets `avatar_url` for existing users from `auth.users.raw_user_meta_data` where it is null.
- When Google is linked to an existing account, `/auth/callback` sets `avatar_url` from `user_metadata` server-side if the profile has none. A user-uploaded photo is never overwritten.
- Uploads:
  - a new **public** storage bucket `avatars`: 2 MB limit, `image/png`, `image/jpeg` and `image/webp`
  - path `<user id>/<random>.webp`
  - insert, update and delete only within the user's own folder, plus the same restrictive MFA policy as `page-media`.
  - The browser crops to a square, resizes to 512×512 and encodes WebP before uploading, then stores the public URL in `avatar_url`.
  - Removing a photo deletes the user's files and sets `avatar_url` to null.
- The UI reads name and photo from `profiles`, not auth metadata, which fixes "rename doesn't show".
- `Avatar` falls back to initials on a color derived from the user id.
- Team lists (`team_overview`, `my_workspaces`) return `avatar_url`.

### 6.3 Email invites (Phase 1)

- Columns `team_invites.last_sent_at timestamptz` and `team_invites.send_count int not null default 0`.
- New function `public.record_invite_send(p_invite uuid)`:
  - `security definer`, owner only
  - enforces at most 20 sends per owner per rolling hour and at most 5 sends per invite
  - updates the counters.
- New server action `sendInvites(emails: string[], role)` in `features/teams/actions.ts`:
  1. validates up to 10 emails per request
  2. inserts `team_invites` rows under the user's session (existing RLS)
  3. calls `record_invite_send`
  4. sends each email through **Brevo's transactional email API** (`POST https://api.brevo.com/v3/smtp/email`) from the server only.
- `resendInvite(id)` sends the same token again and records the send. Revoke is unchanged (delete).
- Email template in `emails/invite.ts`:
  - escaped HTML plus a plain-text alternative, from **no-reply@techitdave.com**, sender name "QuickQReate"
  - subject: "<Inviter> invited you to their QuickQReate codes"
  - body: inviter photo or initials and name, role and what it allows, one **Accept invite** button to `<SITE_URL>/invite/<token>`, the invited address and the expiry date, and "If you weren't expecting this, ignore this email."
- Invited people who are new:
  - `/invite/<token>` offers "Create account". It links to `/signup?invite=<token>`; the token, not the email, is in the URL.
  - The signup page looks up the invited email server-side, pre-fills it, and makes it read-only.
  - After email confirmation, the user lands back on `/invite/<token>` and accepts.
- Existing users sign in and click Accept (as today). The wrong-account warning stays.
- New environment variables:
  - `BREVO_API_KEY`: runtime only, secret, entered in Coolify by David.
  - `INVITE_FROM_EMAIL`: optional, default `no-reply@techitdave.com`.
- If `BREVO_API_KEY` is absent, the Team page shows copy-link only, with "Email invites aren't set up on this server."
- The privacy page is updated: Brevo also sends team invites, and profile photos are stored.
- Fix the existing invite-page copy that implies an email was sent.

### 6.4 Analytics overview and templates (Phase 4)

- `public.workspace_analytics(...)` (see 4.4).
- `design_templates.is_default` with a partial unique index (see 4.5).

## 7. Testing

- **Unit:**
  - the new `useCodeDraft` reducer (reset, load, draft serialization never contains the password)
  - wording and status helpers
  - email template escaping
  - `sendInvites` input validation.
- **Component tests** (Testing Library, already configured but unused):
  - Create sections
  - the Save bar dirty/discard logic
  - Settings disabled when static
  - `Avatar` fallbacks.
- **Database:** PGlite migration tests for every new function and policy (sections 6.1–6.4).
- **Browser (Playwright):**
  - Keep the signed-out suite (generator downloads decode with jsQR; axe in light and dark).
  - Update the tests that lock the old "design is remembered" behavior: `e2e/experience.spec.ts:27-38` and `persistence.test.ts`.
  - Add an **accounts** suite that runs against a disposable local Supabase in CI. It starts with the Supabase CLI, applies `supabase/migrations`, and seeds two users through the admin API. It covers:
    - sign-in
    - create with password and dates
    - New code starts clean, and draft resume/discard
    - code page save bar
    - folders
    - team invite with a stubbed email sender (the HTTP call is captured, not sent)
    - second-account isolation.
  - **Responsive:** every page is visited at 390, 820 and 1280px wide and checked for no horizontal scroll and no axe violations.
- **Live check after each phase deploy:** `/api/health`, sign-in, one create and download, and Coolify healthy.

## 8. Phases

Each phase is a PR to `main` with CI green, and is deployed by Coolify auto-deploy after merge.

Each phase gets its own implementation plan, written just before that phase starts, so later plans reflect what the earlier phases actually built.

| Phase | Ships | Notes |
| --- | --- | --- |
| 0 | "New code" fix on the current UI: stop persisting design, type and export settings; `startNew` fully resets, including the name; editing never touches remembered state; bulk uses its own defaults. Also go-live wrap-up (GitHub Pages redirect, docs PR). | Small, ships first. Updates the two tests that lock the old behavior. |
| 1 | App shell (sidebar, bottom tabs, workspace switcher), new tokens and wording, `/codes` list, `/settings` with profile photos, `/team` with email invites, redirects from old routes. | Needs `BREVO_API_KEY` in Coolify (David). Migrations from 6.2 and 6.3. |
| 2 | `/codes/new` Create page with settings during creation and drafts; `/codes/bulk`. | Migration from 6.1. Signed-in "New code" points here. |
| 3 | Teams: two-way sharing between teammates, Owner/Editor/Viewer rules for teammates' codes, leaving and keep-or-take removal, the switch row and Everyone view, Private codes. | Added 2026-10-14. Design: `2026-10-14-quickqreate-teams-design.md`. One migration. |
| 4 | Code page overview polish (editing moved to the Create editor in Ziplume Release 1, see `2026-10-14-ziplume-rebrand-design.md`); `/analytics` overview; `/templates` with a default template. | Migrations from 6.4. (`/?edit=` already forwards to `/codes/<id>/edit`.) |
| 5 | Public landing page and quick static generator; public `/bulk` and docs restyled; old generator UI removed. | Signed-in `/` redirects to `/codes`. |

## 9. Success criteria

- A first-time visitor creates and downloads a static code in about 30 seconds without help.
- A signed-in user creates a trackable, password-protected, scheduled code in one pass, without leaving the Create page.
- "New code" never shows a previous code's settings. Drafts only return when the user chooses Resume.
- Every feature is reachable from the sidebar (or bottom tabs) within two clicks.
- Invites arrive by email from no-reply@techitdave.com, and new invitees can join in one flow.
- A Google user's photo appears automatically. Any user can upload or remove a photo.
- Every page passes the responsive and axe checks at 390, 820 and 1280px, and the contrast tests in both themes.

## 10. Risks and open items

- **CI time:** the accounts suite adds a local Supabase start, a few minutes per run. It is acceptable for the coverage it adds; it can run only on PRs that touch app or migration code if needed.
- **Brevo API key:** David creates and enters it, since secrets are owner-entered. Without it, invites fall back to links (see 6.3).
- **Mixed look between phases:** Phase 1 restyles the shell and the new pages. Not-yet-redesigned pages (Create in Phase 1, code page until Phase 4) use the new tokens immediately but keep their old layout until their phase.
- **Hosted page editor split:** Phase 2 splits the 1,004-line `PageEditor.tsx` per type. This needs care to keep each page type's saved `content` shape unchanged.
- **Live data migrations:** each phase's migrations go through a verified backup first and are recorded in the runbook.
