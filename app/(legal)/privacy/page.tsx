import type { Metadata } from "next";

import { BUY_ME_A_COFFEE_URL, REPO_URL } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy · QuickQReate" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p>Last updated 13 October 2026.</p>
      <p>
        QuickQReate is a free QR code generator run by David Allmon. This page explains what it
        stores and why, in plain language.
      </p>

      <h2>Without an account</h2>
      <p>
        Codes are generated in your browser. What you type is never sent to a server and is never
        stored. Your design settings (colors, shapes, logo) are remembered on your own device so
        they’re there next time. There are no ads, analytics scripts or tracking cookies.
      </p>

      <h2>With an account</h2>
      <ul>
        <li>
          <strong>Sign-in details:</strong> your email address and a securely hashed password, or
          your Google account’s email and name if you sign in with Google.
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
          <strong>Sign-in cookies:</strong> strictly necessary cookies that keep you signed in.
        </li>
      </ul>

      <h2>Feedback pages</h2>
      <p>
        When someone answers a feedback page, QuickQReate stores their rating, any comment and any
        contact details they choose to give, plus the same daily-salted visitor hash used for scans
        (to stop repeat submissions). Only the page’s owner can see responses.
      </p>

      <h2>Scans of dynamic codes</h2>
      <p>
        When someone scans a dynamic code, QuickQReate records the time, the approximate location
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
        <li>Brevo sends account emails such as confirmations and password resets.</li>
        <li>Google handles sign-in if you choose “Continue with Google”.</li>
        <li>Cloudflare delivers the site and provides approximate scan locations.</li>
      </ul>
      <p>Your data is never sold or shared for advertising.</p>

      <h2>Keeping and deleting data</h2>
      <p>
        Your account and codes are kept until you delete them. Deleting your account (Account →
        Delete account) permanently removes it, every saved code, uploaded file, feedback response
        and all scan history right away. Backups are rotated and expire within about three months.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests: open an issue on <a href={`${REPO_URL}/issues`}>GitHub</a>.
        QuickQReate is free and open source; if it helps you, you can{" "}
        <a href={BUY_ME_A_COFFEE_URL}>buy me a coffee</a>.
      </p>
    </>
  );
}
