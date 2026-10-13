import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageView } from "@/features/pages/PageView";
import { isValidSlug } from "@/lib/dynamic/slug";
import { SITE_URL, accountsEnabled } from "@/lib/env";
import { pageSummary } from "@/lib/pages/validate";
import { PAGE_TYPES } from "@/lib/pages/types";
import { getPublicPage } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = isValidSlug(slug) ? await getPublicPage(slug) : null;
  if (!page || page === "unavailable" || page.locked)
    return { title: "QuickQReate", robots: { index: false } };
  const title = pageSummary(page.type, page.content) || PAGE_TYPES[page.type].label;
  return {
    title,
    robots: { index: false, follow: false },
    openGraph: { title, siteName: "QuickQReate", type: "website" },
  };
}

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="max-w-sm rounded-[1.5rem] border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="font-display text-xl font-bold text-fg">{title}</h1>
        <p className="mt-2 text-fg-muted">{message}</p>
      </div>
    </main>
  );
}

export default async function PublicPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  if (!accountsEnabled || !isValidSlug(slug)) notFound();
  const page = await getPublicPage(slug);
  if (page === "unavailable") {
    return (
      <Notice
        title="Temporarily unavailable"
        message="This page can’t be opened right now. Please try again shortly."
      />
    );
  }
  if (!page) notFound();
  if (page.status === "paused") {
    return (
      <Notice
        title="This page is paused"
        message="Its owner has paused it for now. Try again later."
      />
    );
  }
  if (page.status === "scheduled") {
    return (
      <Notice
        title="This page isn’t open yet"
        message="It hasn’t started yet. Please try again later."
      />
    );
  }
  if (page.status === "expired") {
    return (
      <Notice
        title="This page has expired"
        message="Its owner set it to stop working after a certain date."
      />
    );
  }
  // The short link asks for the password, then sends the visitor back here.
  if (page.locked) redirect(`/r/${page.slug}`);
  return (
    <PageView
      type={page.type}
      content={page.content}
      slug={page.slug}
      pageUrl={`${SITE_URL}/p/${page.slug}`}
    />
  );
}
