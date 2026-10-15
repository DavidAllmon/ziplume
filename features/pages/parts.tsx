import { Briefcase, Globe, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { textColorOn } from "@/lib/qr/frame";
import { SOCIAL_ICONS } from "@/lib/pages/social-icons.data";
import type { Media, SocialItem, SocialNetwork } from "@/lib/pages/types";
import { mediaUrl, socialHref } from "@/lib/pages/urls";

// Building blocks shared by every hosted page. Pages are mobile-first, a single centered
// column, with the owner's accent color on the header and primary buttons.

export function PageShell({
  color,
  children,
  header,
  className,
}: {
  color: string;
  children: ReactNode;
  /** Content of the colored header band. */
  header?: ReactNode;
  className?: string;
}) {
  const style = { "--page-accent": color, "--page-accent-fg": textColorOn(color) } as CSSProperties;
  return (
    // A container: the page lays out by its own width, so the editor's device preview matches a
    // real screen of that size.
    <div style={style} className={cn("@container min-h-full bg-bg", className)}>
      <div className="h-36 bg-[var(--page-accent)] @min-[40rem]:h-44" aria-hidden={!header}>
        {header}
      </div>
      <main className="relative mx-auto -mt-24 flex max-w-lg flex-col gap-4 px-4 pb-10">
        {children}
      </main>
    </div>
  );
}

export function PageCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] border border-border bg-surface p-5 shadow-card @min-[40rem]:p-6",
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

export function Avatar({
  media,
  name,
  size = "lg",
}: {
  media: Media | null;
  name: string;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "size-28" : "size-20";
  if (media) {
    return (
      <MediaImage
        media={media}
        alt={name ? `${name}` : "Profile picture"}
        eager
        className={cn(
          box,
          "shrink-0 rounded-full border-4 border-surface bg-surface object-cover shadow-card",
        )}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        box,
        "grid shrink-0 place-items-center rounded-full border-4 border-surface bg-[var(--page-accent)] font-display text-3xl font-bold text-[var(--page-accent-fg)] shadow-card",
      )}
    >
      {initials || "?"}
    </span>
  );
}

const buttonBase =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-center text-[15px] font-semibold transition-[filter,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--page-accent)] active:scale-[0.99] [&_svg]:size-5 [&_svg]:shrink-0";

export const pageButton = {
  primary: cn(
    buttonBase,
    "bg-[var(--page-accent)] text-[var(--page-accent-fg)] hover:brightness-110",
  ),
  secondary: cn(buttonBase, "border border-border bg-surface text-fg hover:bg-surface-2"),
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

export function SocialLinks({ socials, preview }: { socials: SocialItem[]; preview?: boolean }) {
  const items = socials
    .map((s) => ({ ...s, href: socialHref(s.network, s.url) }))
    .filter((s): s is SocialItem & { href: string } => s.href !== null);
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {items.map((s, i) => (
        <li key={`${s.network}-${i}`}>
          <a
            href={preview ? undefined : s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={socialLabel(s.network)}
            title={socialLabel(s.network)}
            className="grid size-11 place-items-center rounded-full border border-border bg-surface text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--page-accent)]"
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

export function Heading({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight text-balance text-fg">
        {children}
      </h1>
      {sub && <p className="text-[15px] text-balance text-fg-muted">{sub}</p>}
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
