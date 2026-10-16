import { Briefcase, Globe, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { PageLook } from "@/lib/pages/look";
import { SOCIAL_ICONS } from "@/lib/pages/social-icons.data";
import type { Media, SocialItem, SocialNetwork } from "@/lib/pages/types";
import { mediaUrl, socialHref } from "@/lib/pages/urls";

import { resolveLook } from "./look/resolve";

// Building blocks shared by every hosted page: the frame that paints the page's look, its header,
// cards and buttons. One centered column, at most 560px wide.

/** A hosted page's frame: its wallpaper and look, one centered column, and the footer. */
export function PageFrame({
  look,
  preview = false,
  children,
}: {
  look: PageLook;
  preview?: boolean;
  children: ReactNode;
}) {
  const resolved = resolveLook(look);
  // The public page's main landmark; in the editor's preview it's just part of the editor.
  const Root = preview ? "div" : "main";
  const style = {
    ...resolved.vars,
    background: resolved.background,
    colorScheme: resolved.colorScheme,
  } as CSSProperties;
  return (
    // A container: the page lays out by its own width, so the editor's device preview matches a
    // real screen of that size.
    <Root
      style={style}
      data-page-frame
      className="@container flex min-h-full flex-1 flex-col font-page-body text-fg"
    >
      <div
        data-page-column
        className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 px-4 pt-8 pb-6 @min-[40rem]:pt-14"
      >
        {children}
      </div>
      <footer className="flex justify-center px-4 pt-2 pb-8">
        {preview ? (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-fg-muted">
            Made with Ziplume
          </span>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-fg-muted underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-(--ring)"
          >
            Made with Ziplume · free QR codes
          </Link>
        )}
      </footer>
    </Root>
  );
}

/**
 * The top of a page: Classic (the image centered above the title), Hero (the image across the
 * top, fading into the wallpaper; Classic when there's no image) or Banner (Coupon and Event).
 * The title is the page's one h1.
 */
export function PageHeader({
  look,
  layout,
  image,
  imageAlt,
  art = false,
  large = false,
  title,
  sub,
  eyebrow,
  badge,
}: {
  look: PageLook;
  layout: "classic" | "hero" | "banner";
  image: Media | null;
  imageAlt: string;
  /** Square art (Audio's cover, a logo, App's icon) instead of the look's circle or rounded shape. */
  art?: boolean;
  /** A larger Classic image (Audio's cover art). */
  large?: boolean;
  title: ReactNode;
  sub?: ReactNode;
  eyebrow?: ReactNode;
  /** Business Hero: the logo overlapping the cover. */
  badge?: Media | null;
}) {
  const drawn = layout === "hero" && !image ? "classic" : layout;
  const heading = (
    <div className="flex flex-col items-center gap-1 text-center">
      {eyebrow && (
        <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{eyebrow}</p>
      )}
      <h1 className="font-page-heading text-3xl font-bold tracking-tight text-balance text-fg">
        {title}
      </h1>
      {sub && <p className="text-[15px] text-balance text-fg-muted">{sub}</p>}
    </div>
  );
  if (drawn === "banner") {
    return (
      <div data-header="banner" className="flex flex-col gap-4">
        {image && (
          <MediaImage
            media={image}
            alt={imageAlt}
            eager
            className="aspect-[16/9] w-full rounded-(--pg-radius) object-cover"
          />
        )}
        {heading}
      </div>
    );
  }
  if (drawn === "hero" && image) {
    return (
      // Reaches the column's edges and top: the column's own padding.
      <div
        data-header="hero"
        className="-mx-4 -mt-8 flex flex-col items-center gap-4 @min-[40rem]:-mt-14"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden @min-[40rem]:aspect-[16/7]">
          <MediaImage media={image} alt={imageAlt} eager className="size-full object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,var(--bg))]"
          />
        </div>
        {badge && (
          <MediaImage
            media={badge}
            alt=""
            eager
            className="relative -mt-16 size-24 rounded-(--pg-radius) border-4 border-(--bg) bg-(--bg) object-contain"
          />
        )}
        <div className="px-4">{heading}</div>
      </div>
    );
  }
  return (
    <div data-header="classic" className="flex flex-col items-center gap-4">
      {image && (
        <MediaImage
          media={image}
          alt={imageAlt}
          eager
          className={cn(
            large ? "size-56" : "size-28",
            "shrink-0 object-cover shadow-card",
            art
              ? "rounded-(--pg-radius)"
              : look.shape === "circle"
                ? "rounded-full"
                : "rounded-3xl",
          )}
        />
      )}
      {heading}
    </div>
  );
}

export function PageCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-(--pg-radius) border border-border bg-surface p-5 shadow-card @min-[40rem]:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** An uploaded image from the page-media bucket. */
export function MediaImage({
  media,
  alt,
  className,
  eager,
}: {
  media: Media;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user uploads served from storage
    <img
      src={mediaUrl(media.path)}
      alt={alt}
      width={media.width}
      height={media.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

const buttonBase =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-(--pg-btn-radius) border-2 px-5 py-3 text-center font-page-heading text-[15px] font-semibold transition-[filter,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring) active:scale-[0.99] [&_svg]:size-5 [&_svg]:shrink-0";

export const pageButton = {
  /** The look's button: its color, style, shape and shadow. */
  primary: cn(
    buttonBase,
    "border-(--pg-btn-border) bg-(--pg-btn-bg) text-(--pg-btn-fg) shadow-(--pg-btn-shadow) hover:brightness-110",
  ),
  /** Quieter actions (Calendar, Download): the notes' tone, which keeps the text readable on
   * every theme, on the wallpaper and inside cards. */
  secondary: cn(buttonBase, "border-border bg-surface-2 text-fg hover:brightness-95"),
};

/** A link button; renders a disabled look in the editor preview (no navigation). */
export function PageLink({
  href,
  children,
  variant = "primary",
  download,
  preview,
}: {
  href: string | null;
  children: ReactNode;
  variant?: "primary" | "secondary";
  download?: boolean | string;
  preview?: boolean;
}) {
  if (!href) return null;
  if (preview) {
    return (
      <span className={pageButton[variant]} aria-disabled>
        {children}
      </span>
    );
  }
  const external = /^https?:/.test(href) && !download;
  return (
    <a
      href={href}
      className={pageButton[variant]}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...(download ? { download: typeof download === "string" ? download : "" } : {})}
    >
      {children}
    </a>
  );
}

const FALLBACK_ICONS: Partial<Record<SocialNetwork, LucideIcon>> = {
  linkedin: Briefcase,
  website: Globe,
};
const SOCIAL_LABELS: Record<string, string> = Object.fromEntries([
  ...SOCIAL_ICONS.map((icon) => [icon.id, icon.label]),
  ["linkedin", "LinkedIn"],
  ["website", "Website"],
]);

export const socialLabel = (network: SocialNetwork) => SOCIAL_LABELS[network] ?? network;

export function SocialIcon({ network, className }: { network: SocialNetwork; className?: string }) {
  const brand = SOCIAL_ICONS.find((icon) => icon.id === network);
  if (brand) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
        <path d={brand.path} />
      </svg>
    );
  }
  const Icon = FALLBACK_ICONS[network] ?? Globe;
  return <Icon aria-hidden className={className} />;
}

/** The page's social icons, under the header or at the end (the look says which). */
export function SocialRow({ socials, preview }: { socials: SocialItem[]; preview?: boolean }) {
  const items = socials
    .map((s) => ({ ...s, href: socialHref(s.network, s.url) }))
    .filter((s): s is SocialItem & { href: string } => s.href !== null);
  if (!items.length) return null;
  return (
    <ul data-socials className="flex flex-wrap justify-center gap-2">
      {items.map((s, i) => (
        <li key={`${s.network}-${i}`}>
          <a
            href={preview ? undefined : s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={socialLabel(s.network)}
            title={socialLabel(s.network)}
            className="grid size-11 place-items-center rounded-full border border-border bg-surface text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
          >
            <SocialIcon network={s.network} className="size-5" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Paragraphs from plain text, keeping the owner's line breaks. */
export function Prose({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean);
  if (!paragraphs.length) return null;
  return (
    <div className={cn("flex flex-col gap-3 text-[15px] leading-relaxed text-fg-muted", className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-surface-2 px-4 py-3 text-center text-sm text-fg-muted">
      {children}
    </p>
  );
}

const sizeFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
export const fileSize = (bytes: number) =>
  bytes >= 1_048_576
    ? `${sizeFormat.format(bytes / 1_048_576)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
