import type { Metadata } from "next";

import { BUY_ME_A_COFFEE_URL, REPO_URL } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p>Last updated 13 October 2026.</p>
      <p>
        Ziplume is a free QR code generator run by David Allmon. This page explains what it stores
        and why, in plain language.
      </p>

      <h2>Without an account</h2>
      <p>
        Codes are generated in your browser. What you type is never sent to a server and is never
        stored. Only your light or dark theme choice is remembered, on your own device. There are no
        ads, analytics scripts or tracking cookies.
      </p>

      <h2>With an account</h2>
      <ul>
        <li>
          <strong>Sign-in details:</strong> your email address and a securely hashed password, or
          your Google account’s email, name and photo if you sign in with Google.
        </li>
        <li>
          <strong>Profile photo:</strong> your Google photo, or a photo you upload. Uploaded photos
          are stored as public images so your teammates and the invites you send can show them.
          Removing your photo deletes the uploaded file.
        </li>
        <li>
          <strong>Saved codes:</strong> the content and design of codes you choose to save,
          including the destination of dynamic codes. Saved Wi-Fi codes include the network password
          you entered.
        </li>
        <li>
          <strong>Hosted pages and files:</strong> the text, links, images, PDFs, audio and video
          you add to a hosted page. These are public: anyone with the code or link can see them.
        </li>
        <li>
          <strong>Design templates:</strong> designs you save to reuse later.
        </li>
        <li>
          <strong>Teams:</strong> people you invite can see your codes, analytics and what visitors
          send (viewers) or also change them (editors). An invite keeps the email address you
          entered until it’s used, revoked or expires after 14 days. When you invite someone by
          email, Ziplume sends the invite for you through Brevo; it shows your name and photo. Teams
          you join can see your name and email address.
        </li>
        <li>
          <strong>API keys:</strong> only a one-way hash of each key is stored, with the name you
          gave it and when it was last used.
        </li>
        <li>
          <strong>Code passwords:</strong> stored only as a secure one-way hash.
        </li>
        <li>
          <strong>Cookies:</strong> strictly necessary cookies that keep you signed in. When a
          visitor enters a code’s password, a cookie remembers that for 12 hours so they aren’t
          asked again.
        </li>
      </ul>

      <h2>What visitors send</h2>
      <p>
        When someone answers a feedback page, shares their details from a Contact page, marks a
        coupon used, or RSVPs to an event, Ziplume stores what they send:
      </p>
      <ul>
        <li>ratings and comments;</li>
        <li>a name with a phone number or email, and a note;</li>
        <li>the time a coupon was used;</li>
        <li>or a name, email, number of guests and note.</li>
      </ul>
      <p>
        It also stores the same daily-salted visitor hash used for scans, to stop repeat
        submissions; only Ziplume’s server can read it. A visitor’s phone remembers, in its own
        browser storage, the coupons it marked used and the events it RSVPed to. For a coupon, that
        includes a random ID, of which Ziplume keeps only a one-way hash. The page’s owner and their
        team can see and delete what visitors send, except on codes the owner keeps private. If the
        page’s owner turns on “Email me new responses”, Ziplume also emails them what was sent,
        through Brevo. The page’s owner decides what to do with details visitors share.
      </p>

      <h2>Scans of dynamic codes</h2>
      <p>
        When someone scans a dynamic code, Ziplume records the time, the approximate location
        (country, region and city, as provided by Cloudflare), the device type, operating system and
        browser. To count unique visitors it stores a one-way hash of the IP address and browser,
        salted with a value that changes every day. The IP address itself is never stored, and the
        hash can’t be turned back into it. Only the owner of the code can see its scans.
      </p>

      <h2>Who processes data</h2>
      <ul>
        <li>
          The database and sign-in service are self-hosted by the operator in a data center in
          Chicago, USA.
        </li>
        <li>
          Brevo sends account emails such as confirmations and password resets, team invites, and
          emails about new responses.
        </li>
        <li>Google handles sign-in if you choose “Continue with Google”.</li>
        <li>Cloudflare delivers the site and provides approximate scan locations.</li>
      </ul>
      <p>Your data is never sold or shared for advertising.</p>

      <h2>Keeping and deleting data</h2>
      <p>
        Your account and codes are kept until you delete them. Deleting your account (Account →
        Delete account) permanently removes it, every saved code, uploaded file, everything visitors
        sent and all scan history right away. Backups are rotated and expire within about three
        months.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests: open an issue on <a href={`${REPO_URL}/issues`}>GitHub</a>. Ziplume
        is free and open source; if it helps you, you can{" "}
        <a href={BUY_ME_A_COFFEE_URL}>buy me a coffee</a>.
      </p>
    </>
  );
}
