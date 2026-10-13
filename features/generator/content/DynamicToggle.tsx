"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Toggle } from "@/components/ui/Toggle";
import { useSession } from "@/features/auth/useSession";
import { accountsEnabled, shortLinkLabel } from "@/lib/env";

interface DynamicToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  /** The saved code's ending, once it has one. */
  slug: string | null;
  /** Saved codes can't switch between static and dynamic. */
  locked: boolean;
}

/** Turns a Link code into a dynamic one: editable destination and scan analytics. */
export function DynamicToggle({ enabled, onChange, slug, locked }: DynamicToggleProps) {
  const { user, loading } = useSession();
  if (!accountsEnabled) return null;

  if (!user && !loading) {
    return (
      <div className="flex gap-3 rounded-control border border-dashed border-field-border p-4">
        <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primary dark:text-link" />
        <p className="text-sm text-fg-muted">
          <strong className="font-semibold text-fg">Want to change the link after printing?</strong>{" "}
          Dynamic codes let you edit where it points and see who scans it. Free with an account, no
          limits.{" "}
          <Link
            href="/signup?next=/"
            className="font-semibold text-link underline-offset-4 hover:underline"
          >
            Create a free account
          </Link>{" "}
          or{" "}
          <Link
            href="/login?next=/"
            className="font-semibold text-link underline-offset-4 hover:underline"
          >
            sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  const description = enabled
    ? slug
      ? `This code opens ${shortLinkLabel(slug)}, which redirects to your link. Change the link any time from My codes.`
      : "The code will open a short link that redirects to your URL. Save it to get the link, then download."
    : "Change where the code points after it's printed, and see how many people scan it.";

  return (
    <div className="rounded-control border border-border bg-surface-2/60 p-4">
      {locked ? (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-fg">
            {enabled ? "Dynamic link" : "Static code"}
          </span>
          <span className="text-sm text-fg-muted">
            {enabled
              ? description
              : "Saved as a static code. Create a new code to make it dynamic."}
          </span>
        </div>
      ) : (
        <Toggle
          label="Dynamic link"
          description={description}
          checked={enabled}
          onChange={onChange}
        />
      )}
    </div>
  );
}
