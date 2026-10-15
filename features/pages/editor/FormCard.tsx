"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

import { Card, CardHeader } from "@/components/ui/Card";

/**
 * How the parts of a page's form are drawn: "card", each its own card (the Create editor's
 * Content tab); "section", titled sections inside the form's own card (the home page).
 */
export const FormCardStyle = createContext<"card" | "section">("section");

/** One titled part of a hosted page's form, e.g. Header or Links. */
export function FormCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  const id = useId();
  const style = useContext(FormCardStyle);
  if (style === "card") {
    return (
      <Card aria-labelledby={id}>
        <CardHeader id={id} title={title} description={note} />
        <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">{children}</div>
      </Card>
    );
  }
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 border-t border-border pt-5 first:border-t-0 first:pt-0"
    >
      <div>
        <h3 id={id} className="font-display text-base font-bold text-fg">
          {title}
        </h3>
        {note && <p className="mt-0.5 text-sm text-fg-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}
