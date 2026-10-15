import {
  CalendarPlus,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Music,
  Phone,
  Play,
  Smartphone,
  Ticket,
  UserPlus,
} from "lucide-react";

import type { ReactNode } from "react";

import { googleCalendarUrl } from "@/lib/pages/files";
import type {
  AppPage,
  AudioPage,
  BusinessPage,
  CouponPage,
  EventPage,
  FeedbackPage,
  ImagesPage,
  LinksPage,
  MenuPage,
  PageContentMap,
  PdfPage,
  VcardPage,
  VideoPage,
} from "@/lib/pages/types";
import { mailHref, mediaUrl, safeHref, telHref, videoEmbed } from "@/lib/pages/urls";
import type { PageTypeId } from "@/lib/qr/types";

import { CopyCode } from "./CopyCode";
import { FeedbackForm } from "./FeedbackForm";
import {
  Avatar,
  EmptyNote,
  fileSize,
  Heading,
  MediaImage,
  PageCard,
  PageLink,
  PageShell,
  Prose,
  SocialLinks,
} from "./parts";

export interface PageViewProps<K extends PageTypeId = PageTypeId> {
  type: K;
  content: PageContentMap[K];
  slug: string;
  /** Absolute URL of the page (for calendar entries and sharing). */
  pageUrl: string;
  /** In the editor: links and forms don't navigate or submit. */
  preview?: boolean;
}

interface ViewProps<T> {
  page: T;
  slug: string;
  pageUrl: string;
  preview?: boolean;
}

function LinksView({ page, preview }: ViewProps<LinksPage>) {
  const links = page.links
    .filter((link) => link.on)
    .map((link) => ({ ...link, href: safeHref(link.url) }))
    .filter((link) => link.href && (link.label.trim() || link.url.trim()));
  return (
    <PageShell color={page.color}>
      <div className="flex flex-col items-center gap-4">
        <Avatar media={page.avatar} name={page.title} />
        <Heading sub={page.bio || undefined}>{page.title || "Your name"}</Heading>
        <SocialLinks socials={page.socials} preview={preview} />
      </div>
      <nav aria-label="Links" className="flex flex-col gap-3">
        {links.length ? (
          links.map((link, i) => (
            <PageLink
              key={i}
              href={link.href}
              variant={i === 0 ? "primary" : "secondary"}
              preview={preview}
            >
              {link.label.trim() || link.url.replace(/^https?:\/\//, "")}
            </PageLink>
          ))
        ) : (
          <EmptyNote>Links you add appear here.</EmptyNote>
        )}
      </nav>
    </PageShell>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  preview,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href: string | null;
  preview?: boolean;
}) {
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-fg">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-xs font-medium tracking-wide text-fg-muted uppercase">{label}</span>
        <span className="truncate text-[15px] font-medium text-fg">{value}</span>
      </span>
    </>
  );
  if (!href || preview) return <li className="flex items-center gap-3 py-2.5">{body}</li>;
  return (
    <li>
      <a
        href={href}
        className="flex items-center gap-3 rounded-xl py-2.5 focus-visible:outline-2 focus-visible:outline-[var(--page-accent)]"
        {...(/^https?:/.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {body}
      </a>
    </li>
  );
}

const mapsHref = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;

function VcardView({ page, slug, preview }: ViewProps<VcardPage>) {
  const name =
    [page.firstName, page.lastName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ") ||
    page.company ||
    "Your name";
  const role = [page.jobTitle.trim(), page.company.trim()].filter(Boolean).join(" · ");
  const website = safeHref(page.website);
  return (
    <PageShell color={page.color}>
      <div className="flex flex-col items-center gap-4">
        <Avatar media={page.photo} name={name} />
        <Heading sub={role || undefined}>{name}</Heading>
      </div>
      <PageLink href={`/p/${encodeURIComponent(slug)}/contact.vcf`} download preview={preview}>
        <UserPlus aria-hidden /> Save contact
      </PageLink>
      <PageCard>
        {page.bio.trim() && <Prose text={page.bio} className="mb-3" />}
        <ul className="divide-y divide-border">
          {page.phones
            .filter((p) => p.number.trim())
            .map((p, i) => (
              <ContactRow
                key={`p${i}`}
                icon={Phone}
                label={p.label || "Phone"}
                value={p.number}
                href={telHref(p.number)}
                preview={preview}
              />
            ))}
          {page.emails
            .filter((e) => e.address.trim())
            .map((e, i) => (
              <ContactRow
                key={`e${i}`}
                icon={Mail}
                label={e.label || "Email"}
                value={e.address}
                href={mailHref(e.address)}
                preview={preview}
              />
            ))}
          {website && (
            <ContactRow
              icon={Globe}
              label="Website"
              value={page.website.replace(/^https?:\/\//, "")}
              href={website}
              preview={preview}
            />
          )}
          {page.address.trim() && (
            <ContactRow
              icon={MapPin}
              label="Address"
              value={page.address}
              href={mapsHref(page.address)}
              preview={preview}
            />
          )}
        </ul>
      </PageCard>
      <SocialLinks socials={page.socials} preview={preview} />
    </PageShell>
  );
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatTime(value: string) {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function BusinessView({ page, preview }: ViewProps<BusinessPage>) {
  const phone = telHref(page.phone);
  const email = mailHref(page.email);
  const website = safeHref(page.website);
  return (
    <PageShell
      color={page.color}
      header={
        page.cover ? (
          <MediaImage media={page.cover} alt="" eager className="size-full object-cover" />
        ) : undefined
      }
    >
      <PageCard className="flex flex-col items-center gap-4 text-center">
        {page.logo && (
          <MediaImage
            media={page.logo}
            alt={`${page.name} logo`}
            eager
            className="-mt-16 size-24 rounded-2xl border-4 border-surface bg-surface object-contain shadow-card"
          />
        )}
        <Heading sub={page.tagline || undefined}>{page.name || "Your business"}</Heading>
        <div className="grid w-full grid-cols-3 gap-2">
          {[
            { href: phone, icon: Phone, label: "Call" },
            { href: email, icon: Mail, label: "Email" },
            {
              href: page.address.trim() ? mapsHref(page.address) : null,
              icon: MapPin,
              label: "Directions",
            },
          ]
            .filter((a) => a.href)
            .map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={preview ? undefined : href!}
                {...(href!.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="flex flex-col items-center gap-1 rounded-2xl bg-surface-2 px-2 py-3 text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:outline-[var(--page-accent)]"
              >
                <Icon aria-hidden className="size-5 text-[var(--page-accent)]" />
                {label}
              </a>
            ))}
        </div>
      </PageCard>
      {page.buttons
        .filter((b) => b.on && safeHref(b.url))
        .map((b, i) => (
          <PageLink
            key={i}
            href={safeHref(b.url)}
            variant={i === 0 ? "primary" : "secondary"}
            preview={preview}
          >
            {b.label.trim() || b.url.replace(/^https?:\/\//, "")}
          </PageLink>
        ))}
      {page.about.trim() && (
        <PageCard>
          <h2 className="mb-2 font-display text-lg font-bold text-fg">About</h2>
          <Prose text={page.about} />
        </PageCard>
      )}
      {page.showHours && (
        <PageCard>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-fg">
            <Clock aria-hidden className="size-5" /> Opening hours
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            {page.hours.map((h, i) => (
              <div key={DAYS[i]} className="contents">
                <dt className="text-fg-muted">{DAYS[i]}</dt>
                <dd className="text-right font-medium text-fg tabular-nums">
                  {h.open ? `${formatTime(h.from)} – ${formatTime(h.to)}` : "Closed"}
                </dd>
              </div>
            ))}
          </dl>
        </PageCard>
      )}
      {(website || page.address.trim()) && (
        <PageCard>
          <ul className="divide-y divide-border">
            {website && (
              <ContactRow
                icon={Globe}
                label="Website"
                value={page.website.replace(/^https?:\/\//, "")}
                href={website}
                preview={preview}
              />
            )}
            {page.address.trim() && (
              <ContactRow
                icon={MapPin}
                label="Address"
                value={page.address}
                href={mapsHref(page.address)}
                preview={preview}
              />
            )}
          </ul>
        </PageCard>
      )}
      <SocialLinks socials={page.socials} preview={preview} />
    </PageShell>
  );
}

function MenuView({ page, preview }: ViewProps<MenuPage>) {
  const sections = page.sections
    .map((s) => ({ ...s, items: s.items.filter((item) => item.name.trim()) }))
    .filter((s) => s.items.length);
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col items-center gap-3 text-center">
        {page.logo && (
          <MediaImage
            media={page.logo}
            alt={`${page.name} logo`}
            eager
            className="size-20 rounded-2xl object-contain"
          />
        )}
        <Heading sub={page.description || undefined}>{page.name || "Your menu"}</Heading>
      </PageCard>
      {sections.length > 1 && (
        <nav aria-label="Menu sections" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {sections.map((s, i) =>
            // In the editor's preview a chip mustn't navigate: #section-n would replace the tab.
            preview ? (
              <span
                key={i}
                className="shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg"
              >
                {s.name || "Menu"}
              </span>
            ) : (
              <a
                key={i}
                href={`#section-${i}`}
                className="shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg"
              >
                {s.name || "Menu"}
              </a>
            ),
          )}
        </nav>
      )}
      {sections.length ? (
        sections.map((section, i) => (
          <PageCard key={i}>
            <h2
              id={`section-${i}`}
              className="mb-3 scroll-mt-4 font-display text-xl font-bold text-fg"
            >
              {section.name || "Menu"}
            </h2>
            <ul className="divide-y divide-border">
              {section.items.map((item, j) => (
                <li key={j} className="flex gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">{item.name}</p>
                    {item.description.trim() && (
                      <p className="mt-0.5 text-sm text-fg-muted">{item.description}</p>
                    )}
                    {item.tags.trim() && (
                      <p className="mt-1.5 flex flex-wrap gap-1">
                        {item.tags
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted"
                            >
                              {tag}
                            </span>
                          ))}
                      </p>
                    )}
                  </div>
                  {item.price.trim() && (
                    <p className="shrink-0 font-semibold text-fg tabular-nums">
                      {/^\d/.test(item.price.trim())
                        ? `${page.currency}${item.price.trim()}`
                        : item.price.trim()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </PageCard>
        ))
      ) : (
        <EmptyNote>Dishes you add appear here.</EmptyNote>
      )}
      {page.note.trim() && <Prose text={page.note} className="px-1 text-center text-sm" />}
    </PageShell>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
}

function CouponView({ page, preview }: ViewProps<CouponPage>) {
  const expired = page.validUntil && page.validUntil < new Date().toISOString().slice(0, 10);
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col items-center gap-4 overflow-hidden text-center">
        {page.image && (
          <MediaImage
            media={page.image}
            alt=""
            eager
            className="-mx-6 -mt-6 aspect-[16/9] w-[calc(100%+3rem)] max-w-none object-cover"
          />
        )}
        {page.business.trim() && (
          <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
            {page.business}
          </p>
        )}
        {page.offer.trim() && (
          <p className="font-display text-5xl font-bold tracking-tight text-[var(--page-accent)]">
            {page.offer}
          </p>
        )}
        {page.headline.trim() && (
          <h1 className="font-display text-2xl font-bold text-balance text-fg">{page.headline}</h1>
        )}
        {page.description.trim() && <Prose text={page.description} />}
        {page.code.trim() && (
          <div className="w-full">
            <p className="mb-2 text-sm text-fg-muted">Use this code</p>
            <CopyCode code={page.code.trim()} />
          </div>
        )}
        {page.validUntil && (
          <p className={expired ? "font-semibold text-danger" : "text-sm text-fg-muted"}>
            {expired ? "This offer has ended" : `Valid until ${formatDate(page.validUntil)}`}
          </p>
        )}
        {page.buttonUrl.trim() && (
          <PageLink href={safeHref(page.buttonUrl)} preview={preview}>
            {page.buttonLabel.trim() || "Redeem now"}
          </PageLink>
        )}
      </PageCard>
      {page.terms.trim() && (
        <details className="rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-fg-muted">
          <summary className="cursor-pointer font-semibold text-fg">Terms and conditions</summary>
          <Prose text={page.terms} className="mt-2 text-sm" />
        </details>
      )}
    </PageShell>
  );
}

function eventWhen(page: EventPage): { date: string; time: string | null } | null {
  if (!page.start || !page.timeZone) return null;
  try {
    const startLocal = new Date(`${page.start}:00Z`);
    const date = startLocal.toLocaleDateString("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    if (page.allDay) {
      const end =
        page.end && page.end.slice(0, 10) > page.start.slice(0, 10)
          ? ` – ${new Date(`${page.end.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en", { month: "long", day: "numeric", timeZone: "UTC" })}`
          : "";
      return { date: `${date}${end}`, time: "All day" };
    }
    const fmt = (v: string) =>
      new Date(`${v}:00Z`).toLocaleTimeString("en", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      });
    const zone = new Intl.DateTimeFormat("en", { timeZone: page.timeZone, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    const sameDay = page.end && page.end.slice(0, 10) === page.start.slice(0, 10);
    const end = page.end
      ? sameDay
        ? ` – ${fmt(page.end)}`
        : ` – ${new Date(`${page.end}:00Z`).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })}`
      : "";
    return { date, time: `${fmt(page.start)}${end}${zone ? ` ${zone}` : ""}` };
  } catch {
    return null;
  }
}

function EventView({ page, slug, pageUrl, preview }: ViewProps<EventPage>) {
  const when = eventWhen(page);
  const google = googleCalendarUrl(page, pageUrl);
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col gap-4 overflow-hidden">
        {page.image && (
          <MediaImage
            media={page.image}
            alt=""
            eager
            className="-mx-6 -mt-6 aspect-[16/9] w-[calc(100%+3rem)] max-w-none object-cover"
          />
        )}
        {page.organizer.trim() && (
          <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
            {page.organizer}
          </p>
        )}
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-fg">
          {page.title || "Your event"}
        </h1>
        <ul className="flex flex-col gap-3 text-[15px]">
          {when && (
            <li className="flex gap-3">
              <CalendarPlus
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-[var(--page-accent)]"
              />
              <span className="flex flex-col">
                <span className="font-semibold text-fg">{when.date}</span>
                {when.time && <span className="text-fg-muted">{when.time}</span>}
              </span>
            </li>
          )}
          {page.location.trim() && (
            <li className="flex gap-3">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--page-accent)]" />
              <a
                href={preview ? undefined : mapsHref(page.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-fg underline-offset-4 hover:underline"
              >
                {page.location}
              </a>
            </li>
          )}
        </ul>
        <div className="flex flex-col gap-2">
          {page.ticketUrl.trim() && (
            <PageLink href={safeHref(page.ticketUrl)} preview={preview}>
              <Ticket aria-hidden /> {page.ticketLabel.trim() || "Get tickets"}
            </PageLink>
          )}
          {when && (
            <div className="grid grid-cols-2 gap-2">
              <PageLink
                href={`/p/${encodeURIComponent(slug)}/event.ics`}
                variant="secondary"
                download
                preview={preview}
              >
                <CalendarPlus aria-hidden /> Calendar
              </PageLink>
              <PageLink href={google} variant="secondary" preview={preview}>
                Google
              </PageLink>
            </div>
          )}
        </div>
      </PageCard>
      {page.description.trim() && (
        <PageCard>
          <h2 className="mb-2 font-display text-lg font-bold text-fg">About this event</h2>
          <Prose text={page.description} />
        </PageCard>
      )}
    </PageShell>
  );
}

function FeedbackView({ page, slug, preview }: ViewProps<FeedbackPage>) {
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col items-center gap-2 text-center">
        {page.logo && (
          <MediaImage
            media={page.logo}
            alt={`${page.business} logo`}
            eager
            className="size-20 rounded-2xl object-contain"
          />
        )}
        <p className="font-display text-xl font-bold text-fg">{page.business || "Your business"}</p>
      </PageCard>
      <PageCard>
        <FeedbackForm
          slug={slug}
          question={page.question}
          allowComment={page.allowComment}
          askContact={page.askContact}
          thanks={page.thanks}
          preview={preview}
        />
      </PageCard>
    </PageShell>
  );
}

function PdfView({ page, preview }: ViewProps<PdfPage>) {
  const href = page.file ? mediaUrl(page.file.path) : null;
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-20 place-items-center rounded-3xl bg-[var(--page-accent)] text-[var(--page-accent-fg)]">
          <FileText aria-hidden className="size-10" />
        </span>
        <Heading sub={page.description || undefined}>
          {page.title || page.file?.name || "Document"}
        </Heading>
        {page.file ? (
          <>
            <PageLink href={href} preview={preview}>
              <ExternalLink aria-hidden /> Open PDF
            </PageLink>
            <PageLink href={href} variant="secondary" download={page.file.name} preview={preview}>
              <Download aria-hidden /> Download · {fileSize(page.file.size)}
            </PageLink>
          </>
        ) : (
          <EmptyNote>Your PDF appears here.</EmptyNote>
        )}
      </PageCard>
    </PageShell>
  );
}

function ImagesView({ page, preview }: ViewProps<ImagesPage>) {
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col gap-2 text-center">
        <Heading sub={page.description || undefined}>{page.title || "Gallery"}</Heading>
      </PageCard>
      {page.images.length ? (
        <ul className="grid grid-cols-2 gap-2">
          {page.images.map((image, i) => (
            <li
              key={image.path}
              className={page.images.length % 2 === 1 && i === 0 ? "col-span-2" : undefined}
            >
              <a
                href={preview ? undefined : mediaUrl(image.path)}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-2xl bg-surface-2"
              >
                <MediaImage
                  media={image}
                  alt={`Image ${i + 1} of ${page.images.length}`}
                  eager={i < 2}
                  className="aspect-square w-full object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>Images you add appear here.</EmptyNote>
      )}
    </PageShell>
  );
}

/** In the editor's preview, media stays still: it plays on the live page. */
function StillMedia({ icon }: { icon: ReactNode }) {
  return (
    <div className="grid aspect-video w-full place-items-center bg-black text-white/80">
      <span className="flex flex-col items-center gap-2 text-sm font-medium">
        {icon}
        Plays on the live page
      </span>
    </div>
  );
}

function VideoView({ page, preview }: ViewProps<VideoPage>) {
  const embed = page.source === "link" ? videoEmbed(page.url) : null;
  const link = page.source === "link" && !embed ? safeHref(page.url) : null;
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col gap-4">
        <div className="-mx-6 -mt-6 overflow-hidden rounded-t-[1.5rem] bg-black">
          {preview && (embed || (page.source === "upload" && page.file)) ? (
            <StillMedia icon={<Play aria-hidden className="size-12" />} />
          ) : embed ? (
            <iframe
              src={embed.src}
              title={page.title || "Video"}
              className="aspect-video w-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          ) : page.source === "upload" && page.file ? (
            <video
              src={mediaUrl(page.file.path)}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-black"
            />
          ) : (
            <div className="grid aspect-video place-items-center text-white/80">
              <Play aria-hidden className="size-14" />
            </div>
          )}
        </div>
        <Heading sub={undefined}>{page.title || "Video"}</Heading>
        {page.description.trim() && <Prose text={page.description} />}
        {link && (
          <PageLink href={link} preview={preview}>
            <Play aria-hidden /> Watch video
          </PageLink>
        )}
      </PageCard>
    </PageShell>
  );
}

function AudioView({ page, preview }: ViewProps<AudioPage>) {
  const link = safeHref(page.link);
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col items-center gap-4 text-center">
        {page.cover ? (
          <MediaImage
            media={page.cover}
            alt={`${page.title} cover art`}
            eager
            className="aspect-square w-full max-w-72 rounded-2xl object-cover shadow-card"
          />
        ) : (
          <span className="grid aspect-square w-full max-w-60 place-items-center rounded-2xl bg-[var(--page-accent)] text-[var(--page-accent-fg)]">
            <Music aria-hidden className="size-16" />
          </span>
        )}
        <Heading sub={page.artist || undefined}>{page.title || "Audio"}</Heading>
        {page.file &&
          (preview ? (
            <p className="flex items-center gap-2 text-sm font-medium text-fg-muted">
              <Music aria-hidden className="size-4" /> Plays on the live page
            </p>
          ) : (
            <audio src={mediaUrl(page.file.path)} controls preload="metadata" className="w-full" />
          ))}
        {link && (
          <PageLink href={link} variant={page.file ? "secondary" : "primary"} preview={preview}>
            <Music aria-hidden /> Listen
          </PageLink>
        )}
        {page.description.trim() && <Prose text={page.description} />}
      </PageCard>
    </PageShell>
  );
}

function AppView({ page, preview }: ViewProps<AppPage>) {
  const ios = safeHref(page.iosUrl);
  const android = safeHref(page.androidUrl);
  const web = safeHref(page.webUrl);
  return (
    <PageShell color={page.color}>
      <PageCard className="flex flex-col items-center gap-4 text-center">
        {page.icon ? (
          <MediaImage
            media={page.icon}
            alt={`${page.name} icon`}
            eager
            className="size-24 rounded-[1.6rem] object-cover shadow-card"
          />
        ) : (
          <span className="grid size-24 place-items-center rounded-[1.6rem] bg-[var(--page-accent)] text-[var(--page-accent-fg)]">
            <Smartphone aria-hidden className="size-12" />
          </span>
        )}
        <Heading sub={page.description || undefined}>{page.name || "Your app"}</Heading>
        <div className="flex w-full flex-col gap-2">
          <PageLink href={ios} preview={preview}>
            <Download aria-hidden /> Download on the App Store
          </PageLink>
          <PageLink href={android} variant={ios ? "secondary" : "primary"} preview={preview}>
            <Download aria-hidden /> Get it on Google Play
          </PageLink>
          <PageLink href={web} variant="secondary" preview={preview}>
            <Globe aria-hidden /> Visit website
          </PageLink>
        </div>
      </PageCard>
    </PageShell>
  );
}

/** Renders a hosted page of any type. Used by /p/<slug> and by the editor's live preview. */
export function PageView({ type, content, slug, pageUrl, preview }: PageViewProps) {
  const props = { slug, pageUrl, preview };
  switch (type) {
    case "links":
      return <LinksView page={content as LinksPage} {...props} />;
    case "vcard":
      return <VcardView page={content as VcardPage} {...props} />;
    case "business":
      return <BusinessView page={content as BusinessPage} {...props} />;
    case "menu":
      return <MenuView page={content as MenuPage} {...props} />;
    case "coupon":
      return <CouponView page={content as CouponPage} {...props} />;
    case "event":
      return <EventView page={content as EventPage} {...props} />;
    case "feedback":
      return <FeedbackView page={content as FeedbackPage} {...props} />;
    case "pdf":
      return <PdfView page={content as PdfPage} {...props} />;
    case "images":
      return <ImagesView page={content as ImagesPage} {...props} />;
    case "video":
      return <VideoView page={content as VideoPage} {...props} />;
    case "audio":
      return <AudioView page={content as AudioPage} {...props} />;
    case "app":
      return <AppView page={content as AppPage} {...props} />;
  }
}
