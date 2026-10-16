"use client";

import { TriangleAlert } from "lucide-react";

import { lookChecks, type LookCheck } from "@/features/pages/look/resolve";
import type { PageLook } from "@/lib/pages/look";

const MESSAGES: Record<LookCheck["id"], string> = {
  text: "Text is hard to read on this page's background.",
  buttonText: "Button text is hard to read on this color.",
  button: "Buttons are hard to see on this page's background. Try a lighter or darker color.",
};

/** The readability guard's warnings for a look (spec 6.1). */
export function LookWarnings({ look }: { look: PageLook }) {
  const issues = lookChecks(look);
  if (!issues.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {issues.map((issue) => (
        <li key={issue.id} className="flex items-start gap-2 text-sm text-fg">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {MESSAGES[issue.id]}
        </li>
      ))}
    </ul>
  );
}
