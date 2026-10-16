import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { resolveLook } from "@/features/pages/look/resolve";
import { PageView } from "@/features/pages/PageView";
import { isValidSlug } from "@/lib/dynamic/slug";
import { SITE_URL, accountsEnabled } from "@/lib/env";
import { pageDescription, pageImage } from "@/lib/pages/meta";
import { mediaUrl } from "@/lib/pages/urls";
import { pageSummary } from "@/lib/pages/validate";
import { PAGE_TYPES } from "@/lib/pages/types";
import { getPublicPage } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = isValidSlug(slug) ? await getPublicPage(slug) : null;
  if (!page || page === "unavailable" || page.locked)
    // Absolute titles: hosted pages belong to their owners, so the site name is never added.
    return { title: { absolute: "Ziplume" }, robots: { index: false } };
  const title = pageSummary(page.type, page.content) || PAGE_TYPES[page.type].label;
  const description = pageDescription(page.type, page.content) ?? undefined;
  const image = pageImage(page.type, page.content);
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: "Ziplume",
      type: "website",
      ...(image ? { images: [mediaUrl(image.path)] } : {}),
    },
    // X reads its own tags, which the site's root metadata would otherwise fill.
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [mediaUrl(image.path)] } : {}),
    },
  };
}

/** The browser's bars take the page's wallpaper color (spec 6.8). */
export async function generateViewport({ params }: PageProps<"/p/[slug]">): Promise<Viewport> {
  const { slug } = await params;
  const page = isValidSlug(slug) ? await getPublicPage(slug) : null;
  if (!page || page === "unavailable" || page.locked) return {};
  const look = resolveLook(page.content.look);
  return { themeColor: look.themeColor, colorScheme: look.colorScheme };
}

/** Paused, scheduled, expired and unavailable pages keep the Ziplume look (spec 6.8). */
function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <main className="grid flex-1 place-items-center px-4 py-10">
        <div className="max-w-sm rounded-[1.5rem] border border-border bg-surface p-8 text-center shadow-card">
          <h1 className="font-display text-xl font-bold text-fg">{title}</h1>
          <p className="mt-2 text-fg-muted">{message}</p>
        </div>
      </main>
      <footer className="flex justify-center px-4 pt-2 pb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-fg-muted focus-ring hover:text-fg"
        >
          Made with Ziplume · free QR codes
        </Link>
      </footer>
    </div>
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
  // Behind the page (the bounce past its ends on phones) is its wallpaper's color too, not the
  // visitor's light or dark background. A normalized hex, so it's safe in CSS.
  const behind = resolveLook(page.content.look).themeColor;
  return (
    <>
      <style>{`html,body{background-color:${behind}}`}</style>
      <PageView
        type={page.type}
        content={page.content}
        slug={page.slug}
        pageUrl={`${SITE_URL}/p/${page.slug}`}
      />
    </>
  );
}
