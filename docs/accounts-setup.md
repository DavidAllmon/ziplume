# Accounts, dynamic codes and analytics: setup

This is the one-time setup that connects Ziplume (formerly QuickQReate) to the self-hosted Supabase at
`studio.techitdave.com`, Brevo email, Google sign-in and Coolify hosting.

The app code works without any of it: with no Supabase variables set, Ziplume runs as
the free static generator and hides sign-in. Every step below needs either a browser session
or an owner credential, so the owner does them. Never commit or paste keys; they go into
Coolify's environment variables, the Supabase project settings, or the Claude Code cloud
environment's secrets.

## Decisions

| Item | Value |
| --- | --- |
| App URL | `https://ziplume.com` (`www.ziplume.com` forwards to it) |
| Dynamic short links | `https://ziplume.com/r/<slug>` |
| Old address | `https://qr.techitdave.com` stays forever (`LEGACY_HOSTS`): it serves `/r`, `/R`, `/p`, `/api` and their files itself, and forwards everything else to `https://ziplume.com` with a 308 |
| Hosting | Next.js server (standalone Docker image) on Coolify |
| Database / Auth | New isolated project **QuickQReate** in the TechitDave organization on the self-hosted Supabase panel |
| Email | Brevo, sending as `Ziplume <no-reply@ziplume.com>`; `support@` and `dmarc@ziplume.com` forward to `dallmon@techitdave.com` (Cloudflare Email Routing) |
| Sign-in | Email + password, Google |
| Pricing | Completely free, no limits. Buy Me a Coffee links: `https://buymeacoffee.com/davidallmon` |
| Old Pages URL | `davidallmon.github.io/QuickQReate` forwards to `https://ziplume.com` |

## Live deployment (verified 15 October 2026, after the move to ziplume.com)

| Item | Value |
| --- | --- |
| Supabase project | QuickQReate, TechitDave organization, UUID `db12f7ce-3e77-4461-a686-c8cd6de6f764`, slug `quickqreate-1791927515091` |
| API URL | `https://quickqreate-1791927515091.supabase.techitdave.com` |
| Child Studio | `https://quickqreate-1791927515091-studio.supabase.techitdave.com` (panel login required) |
| Database | `supabase_multitenant`, PostgreSQL 17.6, GoTrue v2.196.0, Storage v1.74.0 |
| Migrations applied | All five files, in order, through the private SQL bridge, 13 October 2026 |
| Coolify app | TechitDave Infrastructure → production → Ziplume (`4gko88co580xlr70qkda3jhx`), Dockerfile build, domains `https://ziplume.com`, `https://www.ziplume.com` (redirect to non-www) and `https://qr.techitdave.com` |
| Health check | `GET http://127.0.0.1:3000/api/health` (use `127.0.0.1`, not `localhost`: the image has busybox `wget` only, and `localhost` resolves to IPv6) |
| DNS | Cloudflare `ziplume.com` A `152.44.42.29` and `www` CNAME `ziplume.com`, proxied; SSL/TLS Full (strict); Always Use HTTPS off (certificate renewals pass over plain HTTP); visitor location headers on. `qr.techitdave.com` A `152.44.42.29` stays DNS only unless its proxy change is approved |
| Email | Brevo, sender `Ziplume <no-reply@ziplume.com>` (ziplume.com authenticated: `brevo-code` TXT, `brevo1`/`brevo2._domainkey` CNAMEs DNS only, `_dmarc` `v=DMARC1; p=none; rua=mailto:dmarc@ziplume.com`); the techitdave.com sender stays. One SPF record: `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all` |
| Mail to ziplume.com | Cloudflare Email Routing: `support@` and `dmarc@` → `dallmon@techitdave.com` |
| Google sign-in | Google Cloud project `ziplume` in the techitdave.com organization (External, in production, no logo), web client "Ziplume web" `147783092225-nmjm1llk3l6v8o4d10oto3dp7p0mf3a4.apps.googleusercontent.com`, origins `https://ziplume.com` and `https://qr.techitdave.com`, redirects `https://ziplume.com/auth/v1/callback` (used) and `<API URL>/auth/v1/callback` (kept for rollback). The go-live client in the HopeLinx project `quickqreate` is retired |
| Switch | 15 October 2026: PR #14 merged 03:56 UTC, build live 03:58 UTC |
| Certificates | Let's Encrypt for ziplume.com issued 15 October 2026, expires 13 January 2027; Traefik renews about 14 December 2026 (plain HTTP through Cloudflare, Always Use HTTPS off) |
| Auto-deploy | GitHub webhook (push) → Coolify manual GitHub webhook |
| Backups | Included in the host's daily backup with an off-server copy that is restored and hash-checked (first receipt: archive `20261014T003300Z`) |

## 1. Create the Supabase project (owner, in the browser)

1. Sign in at <https://studio.techitdave.com>, confirm the **TechitDave** organization is selected.
2. Create a new project named **QuickQReate**. Let the panel generate strong credentials.
3. When it is running, note (not secret):
   - API URL, expected shape `https://quickqreate-<id>.supabase.techitdave.com`
   - Child Studio URL, expected shape `https://quickqreate-<id>-studio.supabase.techitdave.com`
4. Note (secret, never paste in chat): the project's **anon** key and **service_role** key.

## 2. Create the database schema

Open the project's child Studio → **SQL Editor** and run each file in `supabase/migrations/`
once, in filename order (oldest first). When new files appear in later updates, run only
those. Today that is:

1. `20261013120000_quickqreate_core.sql`
2. `20261013130000_design_templates.sql` (saved design templates)
3. `20261013140000_hosted_pages.sql` (new code types, hosted pages, feedback responses)
4. `20261013140100_page_media_storage.sql` (the `page-media` Storage bucket for uploads)
5. `20261013150000_power_tools.sql` (folders, teams, active dates, password-protected codes
   and API keys; uses the `pgcrypto` extension, which Supabase installs in the `extensions`
   schema by default)

When applying through the private SQL bridge (which rejects backslashes), the email check in the
fifth file uses `[:space:]` and `[.]` instead of `\s` and `\.`; the repository file matches what
was applied.

The fourth one needs the project's **Storage** service. If it fails because the `storage`
schema doesn't exist, enable Storage for the project and run it again; everything else works
without it, except uploading files to hosted pages (PDF, images, video, audio, logos).

The first file
creates `profiles`, `qr_codes`, `scan_events`, row-level security (including a rule
that locks accounts with two-factor authentication to two-factor sessions), the scan recorder
and the analytics function. It is safe to read before running: it only touches the `public`
schema and adds one trigger on `auth.users` to create profiles.

## 3. Brevo (owner, in the browser)

1. **Senders, Domains & Dedicated IPs → Domains**: make sure `techitdave.com` is authenticated
   (Brevo shows DKIM and DMARC records to add in Cloudflare if it is not).
2. **Senders**: add `no-reply@techitdave.com` with the name **Ziplume**.
   For ziplume.com: add the domain `ziplume.com`, choose to add the records yourself, put
   them in the ziplume.com zone (the DKIM CNAMEs DNS only), authenticate, then add the sender
   **Ziplume <no-reply@ziplume.com>**.
3. **SMTP & API → SMTP**: note the SMTP login and generate an SMTP key named `quickqreate-auth`.
   These go into step 5, nowhere else.

## 4. Google sign-in (owner, in the browser)

In <https://console.cloud.google.com>, project **Ziplume** (`ziplume`) in the techitdave.com organization:

1. **APIs & Services → OAuth consent screen**: External; app name **Ziplume**; support
   email; logo (use `public/icons/icon-512.png`); app domain `https://ziplume.com`;
   privacy policy `https://ziplume.com/privacy`; terms `https://ziplume.com/terms`;
   authorized domains `ziplume.com` and `techitdave.com`; scopes `openid`, `email`, `profile`.
   Publish the app.
2. **Clients → Create client → Web application**, named "Ziplume web":
   - Authorized JavaScript origins: `https://ziplume.com` and `https://qr.techitdave.com`
   - Authorized redirect URIs: `https://ziplume.com/auth/v1/callback` and `<API URL>/auth/v1/callback`
3. Keep the client ID and client secret for step 5.

## 5. Configure Auth on the Supabase project

In the panel, open the project with **Manage** and set its Auth environment. In the pinned
self-hosted compose these are the variables (GoTrue names in brackets):

```
SITE_URL=https://ziplume.com                                         [GOTRUE_SITE_URL]
ADDITIONAL_REDIRECT_URLS=https://qr.techitdave.com/auth/callback,https://qr.techitdave.com/auth/confirm,https://ziplume.com/auth/callback,https://ziplume.com/auth/confirm   [GOTRUE_URI_ALLOW_LIST]
ENABLE_PHONE_SIGNUP=false                                            [GOTRUE_EXTERNAL_PHONE_ENABLED]
ENABLE_EMAIL_SIGNUP=true                                             [GOTRUE_EXTERNAL_EMAIL_ENABLED]
ENABLE_EMAIL_AUTOCONFIRM=false                                       [GOTRUE_MAILER_AUTOCONFIRM]
SMTP_HOST=smtp-relay.brevo.com                                       [GOTRUE_SMTP_HOST]
SMTP_PORT=587                                                        [GOTRUE_SMTP_PORT]
SMTP_USER=<Brevo SMTP login>                                         [GOTRUE_SMTP_USER]
SMTP_PASS=<Brevo SMTP key>                                           [GOTRUE_SMTP_PASS]
SMTP_ADMIN_EMAIL=no-reply@ziplume.com                                [GOTRUE_SMTP_ADMIN_EMAIL]
SMTP_SENDER_NAME=Ziplume                                             [GOTRUE_SMTP_SENDER_NAME]
```

Google is not in the default `.env`; these are the project environment keys (GoTrue names in
brackets):

```
GOOGLE_ENABLED=true                                                  [GOTRUE_EXTERNAL_GOOGLE_ENABLED]
GOOGLE_CLIENT_ID=<Google client ID>                                  [GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID]
GOOGLE_SECRET=<Google client secret>                                 [GOTRUE_EXTERNAL_GOOGLE_SECRET]
GOOGLE_REDIRECT_URI=https://ziplume.com/auth/v1/callback             [GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI]
```

Without `GOOGLE_REDIRECT_URI` the redirect falls back to `${API_EXTERNAL_URL}/callback` (the
Supabase address). Don't change `API_EXTERNAL_URL` itself: it is also the token issuer.

Branded emails (after the app is deployed, so the template URLs resolve):

```
MAILER_TEMPLATES_CONFIRMATION=https://qr.techitdave.com/email-templates/confirm.html
MAILER_TEMPLATES_RECOVERY=https://qr.techitdave.com/email-templates/recovery.html
MAILER_TEMPLATES_EMAIL_CHANGE=https://qr.techitdave.com/email-templates/email-change.html
MAILER_TEMPLATES_MAGIC_LINK=https://qr.techitdave.com/email-templates/magic-link.html
MAILER_SUBJECTS_CONFIRMATION=Confirm your Ziplume account
MAILER_SUBJECTS_RECOVERY=Reset your Ziplume password
MAILER_SUBJECTS_EMAIL_CHANGE=Confirm your new email for Ziplume
MAILER_SUBJECTS_MAGIC_LINK=Your Ziplume sign-in link
```

(GoTrue names: `GOTRUE_MAILER_TEMPLATES_*`, `GOTRUE_MAILER_SUBJECTS_*`.) The templates load from the
old address on purpose: it serves `/email-templates/*` forever and isn't behind Cloudflare, so
the auth server's fetch is never challenged. The links inside use `{{ .SiteURL }}`, which is
ziplume.com.

On ziplume.com the app passes `/auth/v1/authorize`, `/auth/v1/callback` and
`/storage/v1/object/public/*` through to the project, so Google's screen and public file links
show ziplume.com. The Supabase address itself is unchanged.

Restart only this project's auth service after changing them. If the panel does not expose
these settings, they need SSH to the server, which the owner (or a local Claude Code session
with the server key) has to do.

On the panel these values are set through the project's environment (`Manage` → `Configure`, or
the panel's `POST /api/projects/<id>/env`, which merges keys). The pinned compose file does not wire
Google sign-in or mail templates, so the project's `docker-compose.yml` maps the keys above to
the GoTrue names, including
`GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI:-${API_EXTERNAL_URL}/callback}`.
Redeploy from the panel; only the auth container is recreated.

## 6. DNS (owner, Cloudflare)

In the **ziplume.com** zone:

- `ziplume.com` → `A` → `152.44.42.29` and `www` → `CNAME` → `ziplume.com`, proxied (orange
  cloud) once the Coolify certificates exist.
- **SSL/TLS** → **Full (strict)**. **Always Use HTTPS** off: the server already forwards to
  HTTPS and must answer certificate renewals on plain HTTP.
- **Rules → Managed Transforms → Add visitor location headers** on. Ziplume reads
  `CF-IPCountry`, `cf-ipcity` and `cf-region` for the country and city in scan analytics.
- **Email Routing** on (it adds its MX records, a DKIM TXT and the SPF record), with
  `support@` and `dmarc@` routed to `dallmon@techitdave.com`. Keep exactly one SPF record:
  `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all`.
- Brevo's records (section 3), with the DKIM CNAMEs DNS only.

The old `qr` → `A` → `152.44.42.29` record in the techitdave.com zone stays DNS only, so old
printed codes' scans have no location, unless the owner approves turning its proxy on.

## 7. Coolify app (owner, in the browser, after the server build is pushed)

New resource in **TechitDave Infrastructure → production** → Application → public GitHub
repository `https://github.com/DavidAllmon/ziplume`, branch `main`, build pack
**Dockerfile**, port `3000`, domains `https://ziplume.com`, `https://www.ziplume.com` (www redirect: to non-www) and `https://qr.techitdave.com`, health check `127.0.0.1:3000/api/health` (see Live deployment).

Environment variables:

| Name | Value | Build-time | Secret |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://ziplume.com` | yes | no |
| `LEGACY_HOSTS` | `qr.techitdave.com` (old addresses that keep serving `/r`, `/R`, `/p`, `/api` and their files; everything else forwards) | no | no |
| `INVITE_FROM_EMAIL` | `no-reply@ziplume.com` | no | no |
| `NEXT_PUBLIC_SUPABASE_URL` | project API URL | yes | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | project anon key | yes | no (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | project service_role key | no | **yes** |
| `SCAN_HASH_SECRET` | 32+ random characters | no | **yes** |
| `BREVO_API_KEY` | Brevo API key (`quickqreate-invites`), for team invite emails | no | **yes** |

`BREVO_API_KEY` is an API key, not the SMTP key the Supabase project uses: create it in Brevo
under **Settings → SMTP & API → API keys**. If Brevo's "authorized IPs" protection is on,
allow `152.44.42.29`. Without the key, the Team page creates invite links to share by hand.

Enable automatic deployment on push to `main`.

## 8. Retire the GitHub Pages site (after the Coolify app is live)

Until this step, `davidallmon.github.io/QuickQReate` keeps serving the last static build, so
nothing breaks while the new site is being set up. Once the site works:

GitHub → **Actions → CI → Run workflow** on `main`, with **redirect_to** set to
`https://ziplume.com` (it was `https://qr.techitdave.com` before the move). It replaces the Pages site with a page that forwards visitors (and
any old deep links) to the new address, and a service worker that removes the old offline copy
from returning visitors' browsers.

## 9. Let Claude verify it (optional)

To let the Claude Code cloud environment test the live project, edit the environment:

- **Network access → Allowed domains**: `techitdave.com`, `*.techitdave.com`
- **Environment variables / secrets**: `QUICKQREATE_SUPABASE_URL`,
  `QUICKQREATE_SUPABASE_ANON_KEY`, `QUICKQREATE_SUPABASE_SERVICE_ROLE_KEY`

## Verification checklist

- [x] `<API URL>/auth/v1/health` returns 200 over HTTPS
- [x] Sign up with email: confirmation email arrives from `no-reply@techitdave.com` (`no-reply@ziplume.com` after the move), link signs you in
- [ ] Password reset email arrives and the new password works
- [x] Google sign-in creates an account and lands on the dashboard
- [x] Create a dynamic code, scan it with a phone: it redirects and the scan appears in analytics
- [ ] A second account cannot see the first account's codes or scans
- [ ] After turning on two-factor in **Account**, signing in asks for the authenticator code
- [ ] Create a Link list page with a profile picture: the upload works and `/p/<slug>` shows it
- [ ] A Feedback page accepts a rating and it appears under Responses in My codes
- [x] The project appears in the nightly backup receipts
