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
| App URL | `https://qr.techitdave.com` |
| Dynamic short links | `https://qr.techitdave.com/r/<slug>` |
| Hosting | Next.js server (standalone Docker image) on Coolify |
| Database / Auth | New isolated project **QuickQReate** in the TechitDave organization on the self-hosted Supabase panel |
| Email | Brevo SMTP relay, sending as `no-reply@techitdave.com` |
| Sign-in | Email + password, Google |
| Pricing | Completely free, no limits. Buy Me a Coffee links: `https://buymeacoffee.com/davidallmon` |
| Old URL | `davidallmon.github.io/QuickQReate` becomes a redirect to the new site |

## Live deployment (verified 14 October 2026)

| Item | Value |
| --- | --- |
| Supabase project | QuickQReate, TechitDave organization, UUID `db12f7ce-3e77-4461-a686-c8cd6de6f764`, slug `quickqreate-1791927515091` |
| API URL | `https://quickqreate-1791927515091.supabase.techitdave.com` |
| Child Studio | `https://quickqreate-1791927515091-studio.supabase.techitdave.com` (panel login required) |
| Database | `supabase_multitenant`, PostgreSQL 17.6, GoTrue v2.196.0, Storage v1.74.0 |
| Migrations applied | All five files, in order, through the private SQL bridge, 13 October 2026 |
| Coolify app | TechitDave Infrastructure → production → QuickQReate (`4gko88co580xlr70qkda3jhx`), Dockerfile build, `https://qr.techitdave.com` |
| Health check | `GET http://127.0.0.1:3000/api/health` (use `127.0.0.1`, not `localhost`: the image has busybox `wget` only, and `localhost` resolves to IPv6) |
| DNS | Cloudflare `qr` A `152.44.42.29`, DNS only |
| Email | Brevo SMTP relay, sender `Ziplume <no-reply@techitdave.com>` (verified, techitdave.com DKIM/DMARC) |
| Google sign-in | Google Cloud project `quickqreate` (External, in production, no logo), web client ID `31907044023-urs4031kmta7apq7rkkn9sa7b606sh92.apps.googleusercontent.com`, redirect `<API URL>/auth/v1/callback` |
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
3. **SMTP & API → SMTP**: note the SMTP login and generate an SMTP key named `quickqreate-auth`.
   These go into step 5, nowhere else.

## 4. Google sign-in (owner, in the browser)

In <https://console.cloud.google.com> (any project you own):

1. **APIs & Services → OAuth consent screen**: External; app name **Ziplume**; support
   email; logo (use `public/icons/icon-512.png`); app domain `https://qr.techitdave.com`;
   privacy policy `https://qr.techitdave.com/privacy`; terms `https://qr.techitdave.com/terms`;
   authorized domain `techitdave.com`; scopes `openid`, `email`, `profile`. Publish the app.
2. **Credentials → Create credentials → OAuth client ID → Web application**, named QuickQReate:
   - Authorized JavaScript origins: `https://qr.techitdave.com`
   - Authorized redirect URIs: `<API URL>/auth/v1/callback`
3. Keep the client ID and client secret for step 5.

## 5. Configure Auth on the Supabase project

In the panel, open the project with **Manage** and set its Auth environment. In the pinned
self-hosted compose these are the variables (GoTrue names in brackets):

```
SITE_URL=https://qr.techitdave.com                                   [GOTRUE_SITE_URL]
ADDITIONAL_REDIRECT_URLS=https://qr.techitdave.com/auth/callback,https://qr.techitdave.com/auth/confirm   [GOTRUE_URI_ALLOW_LIST]
ENABLE_PHONE_SIGNUP=false                                            [GOTRUE_EXTERNAL_PHONE_ENABLED]
ENABLE_EMAIL_SIGNUP=true                                             [GOTRUE_EXTERNAL_EMAIL_ENABLED]
ENABLE_EMAIL_AUTOCONFIRM=false                                       [GOTRUE_MAILER_AUTOCONFIRM]
SMTP_HOST=smtp-relay.brevo.com                                       [GOTRUE_SMTP_HOST]
SMTP_PORT=587                                                        [GOTRUE_SMTP_PORT]
SMTP_USER=<Brevo SMTP login>                                         [GOTRUE_SMTP_USER]
SMTP_PASS=<Brevo SMTP key>                                           [GOTRUE_SMTP_PASS]
SMTP_ADMIN_EMAIL=no-reply@techitdave.com                             [GOTRUE_SMTP_ADMIN_EMAIL]
SMTP_SENDER_NAME=Ziplume                                             [GOTRUE_SMTP_SENDER_NAME]
```

Google is not in the default `.env`; add these to the **auth** service environment:

```
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<Google client ID>
GOTRUE_EXTERNAL_GOOGLE_SECRET=<Google client secret>
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=<API URL>/auth/v1/callback
```

Branded emails (after the app is deployed, so the template URLs resolve):

```
GOTRUE_MAILER_TEMPLATES_CONFIRMATION=https://qr.techitdave.com/email-templates/confirm.html
GOTRUE_MAILER_TEMPLATES_RECOVERY=https://qr.techitdave.com/email-templates/recovery.html
GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE=https://qr.techitdave.com/email-templates/email-change.html
GOTRUE_MAILER_TEMPLATES_MAGIC_LINK=https://qr.techitdave.com/email-templates/magic-link.html
GOTRUE_MAILER_SUBJECTS_CONFIRMATION=Confirm your Ziplume account
GOTRUE_MAILER_SUBJECTS_RECOVERY=Reset your Ziplume password
GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGE=Confirm your new email for Ziplume
GOTRUE_MAILER_SUBJECTS_MAGIC_LINK=Your Ziplume sign-in link
```

Restart only this project's auth service after changing them. If the panel does not expose
these settings, they need SSH to the server, which the owner (or a local Claude Code session
with the server key) has to do.

On the panel these values are set through the project's environment (`Manage` → `Configure`, or
the panel's `POST /api/projects/<id>/env`, which merges keys). The pinned compose file does not wire
Google sign-in or mail templates, so the project's `docker-compose.yml` adds these auth variables,
read from `.env`: `GOTRUE_EXTERNAL_GOOGLE_ENABLED/CLIENT_ID/SECRET/REDIRECT_URI` and
`GOTRUE_MAILER_TEMPLATES_*` / `GOTRUE_MAILER_SUBJECTS_*`. Redeploy from the panel; only the auth
container is recreated.

## 6. DNS (owner, Cloudflare)

Add `qr` → `A` → `152.44.42.29`.

Recommended: turn the proxy on (orange cloud) for this record and enable
**Rules → Managed Transforms → Add visitor location headers**. Ziplume reads
`CF-IPCountry`, `cf-ipcity` and `cf-region` for the country and city in scan analytics.
With the record DNS-only, analytics still work but show no locations. With the proxy on, set
SSL/TLS mode to **Full (strict)**.

## 7. Coolify app (owner, in the browser, after the server build is pushed)

New resource in **TechitDave Infrastructure → production** → Application → public GitHub
repository `https://github.com/DavidAllmon/QuickQReate`, branch `main`, build pack
**Dockerfile**, port `3000`, domain `https://qr.techitdave.com`, health check `127.0.0.1:3000/api/health` (see Live deployment).

Environment variables:

| Name | Value | Build-time | Secret |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://qr.techitdave.com` | yes | no |
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
nothing breaks while the new site is being set up. Once `https://qr.techitdave.com` works:

GitHub → **Actions → CI → Run workflow** on `main`, with **redirect_to** set to
`https://qr.techitdave.com`. It replaces the Pages site with a page that forwards visitors (and
any old deep links) to the new address, and a service worker that removes the old offline copy
from returning visitors' browsers.

## 9. Let Claude verify it (optional)

To let the Claude Code cloud environment test the live project, edit the environment:

- **Network access → Allowed domains**: `techitdave.com`, `*.techitdave.com`
- **Environment variables / secrets**: `QUICKQREATE_SUPABASE_URL`,
  `QUICKQREATE_SUPABASE_ANON_KEY`, `QUICKQREATE_SUPABASE_SERVICE_ROLE_KEY`

## Verification checklist

- [x] `<API URL>/auth/v1/health` returns 200 over HTTPS
- [x] Sign up with email: confirmation email arrives from `no-reply@techitdave.com`, link signs you in
- [ ] Password reset email arrives and the new password works
- [x] Google sign-in creates an account and lands on the dashboard
- [x] Create a dynamic code, scan it with a phone: it redirects and the scan appears in analytics
- [ ] A second account cannot see the first account's codes or scans
- [ ] After turning on two-factor in **Account**, signing in asks for the authenticator code
- [ ] Create a Link list page with a profile picture: the upload works and `/p/<slug>` shows it
- [ ] A Feedback page accepts a rating and it appears under Responses in My codes
- [x] The project appears in the nightly backup receipts
