import type { Metadata } from "next";

import { REPO_URL } from "@/lib/env";

export const metadata: Metadata = { title: "Terms · QuickQReate" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>
      <p>Last updated 13 October 2026.</p>

      <h2>A free service</h2>
      <p>
        QuickQReate is free, with no plans, trials or limits. Codes you create are yours to use for
        any lawful purpose, including commercial use. Dynamic codes keep working for as long as your
        account exists; they are never switched off to ask for payment.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>
          Keep your sign-in details safe. Two-step verification is available in your account
          settings.
        </li>
        <li>
          Don’t use QuickQReate for anything illegal, including phishing, malware or fraud. Short
          links that are reported and found to break the law may be disabled.
        </li>
      </ul>

      <h2>No warranty</h2>
      <p>
        QuickQReate is provided “as is”, without warranties of any kind. Test printed codes before
        you use them widely. To the extent the law allows, the operator isn’t liable for losses
        arising from use of the service, including downtime of dynamic codes.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated; the date above shows the latest version. The source code is
        available under the MIT License on <a href={REPO_URL}>GitHub</a>.
      </p>
    </>
  );
}
