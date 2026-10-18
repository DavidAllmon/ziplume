"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { sanitizePage } from "@/lib/pages/sanitize";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Pages whose visitors send something back: feedback, shared details and RSVPs (ruling 10). */
export function takesResponses(type: string, content: unknown, on: boolean): boolean {
  if (on || type === "feedback") return true;
  if (type === "vcard") return sanitizePage("vcard", content).shareDetails;
  if (type === "event") return sanitizePage("event", content).rsvp;
  return false;
}

/** "Email me new responses" (spec item 38), for the code's maker only (ruling 1). */
export function ResponseEmails({
  codeId,
  initial,
  emailReady,
}: {
  codeId: string;
  initial: boolean;
  /** This server has a Brevo key; without one the switch saves, but nothing is sent. */
  emailReady: boolean;
}) {
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setOn(next);
    const { error } = await supabase.rpc("set_response_emails", { p_code: codeId, p_on: next });
    setBusy(false);
    if (error) {
      setOn(!next);
      toast("Emails couldn’t be changed. Please try again.", "error");
    }
  }

  return (
    <Card>
      <div className="px-5 py-4 sm:px-6">
        <Toggle
          label="Email me new responses"
          description={
            emailReady
              ? "One email per response, up to 50 a day. Each email has a link to turn them off."
              : "Email isn’t set up on this server, so nothing will be sent for now."
          }
          checked={on}
          onChange={(next) => void change(next)}
          disabled={busy}
        />
      </div>
    </Card>
  );
}
