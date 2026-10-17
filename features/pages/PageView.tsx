import {
  CalendarPlus,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Music,
  Phone,
  Play,
  Smartphone,
  Star,
  Ticket,
  UserPlus,
  Video,
} from "lucide-react";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
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
  MenuItem,
  MenuPage,
  PageContentMap,
  PdfPage,
  VcardPage,
  VideoPage,
} from "@/lib/pages/types";
import { DAY_NAMES, formatTime, rangesOf } from "@/lib/pages/hours";
import { isShown, linkHref, linkIcon } from "@/lib/pages/links";
import { priceText } from "@/lib/pages/menu";
import {
  mailHref,
  mediaUrl,
  safeHref,
  smsHref,
  telHref,
  videoEmbed,
  whatsappHref,
} from "@/lib/pages/urls";
import type { PageTypeId } from "@/lib/qr/types";

import { CopyCode } from "./CopyCode";
import { CouponDeadline, EventCountdown, JoinButton } from "./Countdowns";
import { LinkIconMark } from "./LinkIcon";
import { DietMark } from "./DietMark";
import { FeedbackForm } from "./FeedbackForm";
import { ScanCode } from "./ScanCode";
import { Gallery, ViewerGroup, ViewerThumb, type ViewerImage } from "./Viewer";
import { OpenStatus } from "./OpenStatus";
import {
  EmptyNote,
  fileSize,
  MediaImage,
  PageCard,
  PageFrame,
  PageHeader,
  PageLink,
  Prose,
  QuickActions,
  SocialIcon,
  SocialRow,
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
  const now = new Date();
  const rows = page.links
    .map((link) => ({ link, href: linkHref(link) }))
    .filter(({ link, href }) =>
      link.kind === "header"
        ? link.label.trim() !== ""
        : isShown(link, now) && href !== null && (link.label.trim() || link.url.trim()),
    );
  const featuredAt = rows.findIndex(({ link }) => link.kind !== "header" && link.featured);
  const look = page.look;
  const socials = <SocialRow socials={page.socials} look={look} preview={preview} />;
  const anyLinks = rows.some(({ link }) => link.kind !== "header");
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout={look.header}
        image={page.avatar}
        imageAlt={page.title || "Profile picture"}
        title={page.title || "Your name"}
        sub={page.bio || undefined}
      />
      {look.socials === "top" && socials}
      <nav aria-label="Links" className="flex flex-col gap-3">
        {anyLinks
          ? rows.map(({ link, href }, i) => {
              if (link.kind === "header") {
                return (
                  <h2
                    key={i}
                    className="mt-3 px-1 text-center font-page-heading text-sm font-semibold tracking-wide text-fg-muted uppercase first:mt-0"
                  >
                    {link.label.trim()}
                  </h2>
                );
              }
              const icon = linkIcon(link);
              return (
                <PageLink
                  key={i}
                  href={href}
                  preview={preview}
                  featured={i === featuredAt}
                  icon={icon ? <LinkIconMark icon={icon} /> : undefined}
                >
                  {link.label.trim() || link.url.replace(/^(https?:\/\/|mailto:|tel:|sms:)/, "")}
                </PageLink>
              );
            })
          : // The editor's hint; visitors never see it, even when every link is scheduled away.
            preview && <EmptyNote>Links you add appear here.</EmptyNote>}
      </nav>
      {look.socials === "bottom" && socials}
    </PageFrame>
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
  const role = [page.jobTitle, page.department, page.company]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");
  const pronouns = page.pronouns.trim();
  const look = page.look;
  const socials = <SocialRow socials={page.socials} look={look} preview={preview} />;
  // The quick buttons use the first phone and email that work (spec item 12).
  const phone = page.phones.find((p) => telHref(p.number));
  const whatsapp = page.phones.map((p) => p.whatsapp && whatsappHref(p.number)).find(Boolean);
  const email = page.emails.find((e) => mailHref(e.address));
  const actions = [
    page.showCall &&
      phone && { label: "Call", href: telHref(phone.number)!, icon: <Phone aria-hidden /> },
    page.showText &&
      phone && { label: "Text", href: smsHref(phone.number)!, icon: <MessageSquare aria-hidden /> },
    page.showEmail &&
      email && { label: "Email", href: mailHref(email.address)!, icon: <Mail aria-hidden /> },
    page.showWhatsapp &&
      whatsapp && {
        label: "WhatsApp",
        href: whatsapp,
        icon: <SocialIcon network="whatsapp" />,
      },
    page.showDirections &&
      page.address.trim() && {
        label: "Directions",
        href: mapsHref(page.address),
        icon: <MapPin aria-hidden />,
      },
  ];
  const websites = page.websites
    .map((w) => ({ ...w, href: safeHref(w.url) }))
    .filter((w) => w.href);
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        // With a cover, it runs across the top and the photo sits over it (spec item 11).
        layout={page.cover ? "banner" : look.header}
        image={page.cover ?? page.photo}
        imageAlt={page.cover ? "" : name}
        badge={page.cover ? page.photo : null}
        badgeRound={look.shape === "circle"}
        title={
          <>
            {name}
            {pronouns && (
              <>
                {" "}
                <span className="align-middle text-lg font-medium text-fg-muted">({pronouns})</span>
              </>
            )}
          </>
        }
        sub={role || undefined}
      />
      {look.socials === "top" && socials}
      <PageLink href={`/p/${encodeURIComponent(slug)}/contact.vcf`} download preview={preview}>
        <UserPlus aria-hidden /> Save contact
      </PageLink>
      <QuickActions actions={actions} preview={preview} />
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
          {websites.map((w, i) => (
            <ContactRow
              key={`w${i}`}
              icon={Globe}
              label={w.label.trim() || "Website"}
              value={w.url.trim().replace(/^https?:\/\//, "")}
              href={w.href}
              preview={preview}
            />
          ))}
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
      {look.socials === "bottom" && socials}
    </PageFrame>
  );
}

function BusinessView({ page, preview }: ViewProps<BusinessPage>) {
  const phone = telHref(page.phone);
  const email = mailHref(page.email);
  const website = safeHref(page.website);
  const look = page.look;
  const hero = look.header === "hero" && page.cover !== null;
  const services = page.services.filter((service) => service.name.trim());
  const socials = <SocialRow socials={page.socials} look={look} preview={preview} />;
  const actions = [
    phone && { label: "Call", href: phone, icon: <Phone aria-hidden /> },
    email && { label: "Email", href: email, icon: <Mail aria-hidden /> },
    page.address.trim() && {
      label: "Directions",
      href: mapsHref(page.address),
      icon: <MapPin aria-hidden />,
    },
  ];
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout={hero ? "hero" : "classic"}
        image={hero ? page.cover : page.logo}
        imageAlt={hero ? "" : `${page.name} logo`}
        art={!hero}
        badge={hero ? page.logo : null}
        title={page.name || "Your business"}
        sub={page.tagline || undefined}
      />
      {look.socials === "top" && socials}
      <QuickActions actions={actions} preview={preview} />
      {page.buttons
        .filter((b) => b.kind !== "header" && b.on && linkHref(b))
        .map((b, i) => {
          // A known site's icon, or a ready-made button's own, as on a Link list.
          const icon = linkIcon(b);
          return (
            <PageLink
              key={i}
              href={linkHref(b)}
              preview={preview}
              icon={icon ? <LinkIconMark icon={icon} /> : undefined}
            >
              {b.label.trim() || b.url.replace(/^(https?:\/\/|mailto:|tel:|sms:)/, "")}
            </PageLink>
          );
        })}
      <Gallery
        images={page.gallery.map((media, i) => ({
          media,
          alt: `Photo ${i + 1} of ${page.name.trim() || "the business"}`,
        }))}
        label="Photos"
        preview={preview}
      />
      {page.about.trim() && (
        <PageCard>
          <h2 className="mb-2 font-page-heading text-lg font-bold text-fg">About</h2>
          <Prose text={page.about} />
        </PageCard>
      )}
      {services.length > 0 && (
        <PageCard>
          <section aria-labelledby="services-heading">
            <h2 id="services-heading" className="mb-3 font-page-heading text-lg font-bold text-fg">
              Services
            </h2>
            <ul className="divide-y divide-border">
              {services.map((service, i) => (
                <li key={i} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <span className="min-w-0 font-medium [overflow-wrap:anywhere] text-fg">
                      {service.name}
                    </span>
                    {service.price.trim() && (
                      <span className="shrink-0 font-semibold text-fg tabular-nums">
                        {service.price}
                      </span>
                    )}
                  </div>
                  {service.description.trim() && (
                    <p className="text-sm [overflow-wrap:anywhere] text-fg-muted">
                      {service.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </PageCard>
      )}
      {page.showHours && (
        <PageCard>
          <h2 className="mb-3 flex items-center gap-2 font-page-heading text-lg font-bold text-fg">
            <Clock aria-hidden className="size-5" /> Opening hours
          </h2>
          {/* Clock-dependent, so never in the editor's preview. */}
          {!preview && (
            <OpenStatus hours={page.hours} closures={page.closures} timeZone={page.timeZone} />
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            {page.hours.map((h, i) => (
              <div key={DAY_NAMES[i]} className="contents">
                <dt className="text-fg-muted">{DAY_NAMES[i]}</dt>
                <dd className="text-right font-medium text-fg tabular-nums">
                  {rangesOf(h)
                    .map(([from, to]) => `${formatTime(from)} – ${formatTime(to)}`)
                    .join(", ") || "Closed"}
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
      {look.socials === "bottom" && socials}
    </PageFrame>
  );
}

function MenuView({ page, preview }: ViewProps<MenuPage>) {
  const sections = page.sections
    // Drawn as given, so a dish without the newer fields still shows (`on` unset is on).
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => item.on !== false && item.name.trim()),
    }))
    .filter((s) => s.items.length);
  // Every shown dish photo, in page order, for the viewer (spec item 21).
  const photos: ViewerImage[] = sections.flatMap((s) =>
    s.items.flatMap((item) =>
      item.photo ? [{ media: item.photo, alt: item.name, caption: item.name }] : [],
    ),
  );
  let photoAt = 0;
  const look = page.look;
  const body = sections.length ? (
    sections.map((section, i) => (
      <PageCard key={i}>
        <h2
          id={`section-${i}`}
          className="mb-3 scroll-mt-4 font-page-heading text-xl font-bold text-fg"
        >
          {section.name || "Menu"}
        </h2>
        {section.description?.trim() && (
          <p className="-mt-2 mb-3 text-sm text-fg-muted">{section.description}</p>
        )}
        <ul className="divide-y divide-border">
          {section.items.map((item, j) => (
            <li key={j} className="flex gap-3 py-3">
              {item.photo && (
                <ViewerThumb
                  index={photoAt++}
                  label={`Photo of ${item.name}`}
                  className="size-16 shrink-0 overflow-hidden rounded-(--pg-radius)"
                >
                  <MediaImage
                    media={item.photo}
                    alt={preview ? item.name : ""}
                    className={cn("size-full object-cover", item.soldOut && "opacity-50")}
                  />
                </ViewerThumb>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold [overflow-wrap:anywhere]">
                  {/* Sold out greys the name rather than fading it, so it stays readable. */}
                  <span className={item.soldOut ? "text-fg-muted" : "text-fg"}>{item.name}</span>
                  {item.popular && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-(--page-accent) px-2 py-0.5 text-xs font-semibold text-(--page-accent-fg)">
                      <Star aria-hidden className="size-3" /> Popular
                    </span>
                  )}
                  {item.soldOut && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-fg-muted">
                      Sold out
                    </span>
                  )}
                </p>
                {item.description.trim() && (
                  <p className="mt-0.5 text-sm text-fg-muted">{item.description}</p>
                )}
                {item.labels?.length > 0 && (
                  <ul aria-label="Dietary" className="mt-1.5 flex flex-wrap gap-1">
                    {item.labels.map((id) => (
                      <li key={id}>
                        <DietMark id={id} />
                      </li>
                    ))}
                  </ul>
                )}
                {item.tags?.trim() && <p className="mt-1 text-xs text-fg-muted">{item.tags}</p>}
              </div>
              <DishPrice item={item} currency={page.currency} />
            </li>
          ))}
        </ul>
      </PageCard>
    ))
  ) : (
    <EmptyNote>Dishes you add appear here.</EmptyNote>
  );
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout={look.header}
        image={page.logo}
        imageAlt={`${page.name} logo`}
        art
        title={page.name || "Your menu"}
        sub={page.description || undefined}
      />
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
      {!preview && photos.length ? <ViewerGroup images={photos}>{body}</ViewerGroup> : body}
      {page.note.trim() && <Prose text={page.note} className="px-1 text-center text-sm" />}
    </PageFrame>
  );
}

/** A dish's price, or its options in its place (spec item 24); struck through when sold out. */
function DishPrice({ item, currency }: { item: MenuItem; currency: string }) {
  const options = (item.options ?? []).filter((o) => o.label.trim() && o.price.trim());
  const style = cn(
    "shrink-0 text-right font-semibold tabular-nums",
    item.soldOut ? "text-fg-muted line-through" : "text-fg",
  );
  if (options.length) {
    return (
      <ul className={cn(style, "max-w-[45%] text-sm [overflow-wrap:anywhere]")}>
        {options.map((o, k) => (
          <li key={k}>{`${o.label.trim()} ${priceText(o.price, currency)}`}</li>
        ))}
      </ul>
    );
  }
  return item.price.trim() ? <p className={style}>{priceText(item.price, currency)}</p> : null;
}

function CouponView({ page, preview }: ViewProps<CouponPage>) {
  const look = page.look;
  const code = page.code.trim();
  const badge = page.badge?.trim();
  const headline = page.headline.trim();
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout="banner"
        image={page.image}
        imageAlt=""
        eyebrow={page.business.trim() || undefined}
        title={headline || page.offer.trim() || "Your offer"}
      />
      <PageCard
        className={cn("relative flex flex-col items-center gap-4 text-center", badge && "pt-9")}
      >
        {/* A stamp on the coupon's top corner (spec item 28). */}
        {badge && (
          <span className="absolute -top-4 right-4 rotate-3 rounded-full bg-(--page-accent) px-4 py-1.5 font-page-heading text-xl font-bold text-(--page-accent-fg) shadow-card">
            {badge}
          </span>
        )}
        {headline && page.offer.trim() && (
          <p className="font-page-heading text-5xl font-bold tracking-tight text-[var(--page-accent)]">
            {page.offer}
          </p>
        )}
        {page.description.trim() && <Prose text={page.description} />}
        {code && (
          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-sm text-fg-muted">Use this code</p>
            {page.scan && page.scan !== "text" && <ScanCode kind={page.scan} value={code} />}
            <div className="w-full">
              <CopyCode code={code} />
            </div>
          </div>
        )}
        <CouponDeadline validUntil={page.validUntil} />
        {page.buttonUrl.trim() && (
          <PageLink href={safeHref(page.buttonUrl)} preview={preview}>
            {page.buttonLabel.trim() || "Redeem now"}
          </PageLink>
        )}
      </PageCard>
      {page.terms.trim() && (
        <details className="rounded-(--pg-radius) border border-border bg-surface px-5 py-3 text-sm text-fg-muted">
          <summary className="cursor-pointer font-semibold text-fg">Terms and conditions</summary>
          <Prose text={page.terms} className="mt-2 text-sm" />
        </details>
      )}
    </PageFrame>
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
  const look = page.look;
  // Drawn as given, so an event without the newer fields reads as before.
  const agenda = (page.agenda ?? []).filter((a) => a.title.trim());
  const hosts = (page.hosts ?? []).filter((h) => h.name.trim());
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout="banner"
        image={page.image}
        imageAlt=""
        eyebrow={page.organizer.trim() || undefined}
        title={page.title || "Your event"}
      />
      <PageCard className="flex flex-col gap-4">
        <EventCountdown event={page} />
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
          {page.online && (
            <li className="flex gap-3">
              <Video aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--page-accent)]" />
              <span className="font-medium text-fg">Online event</span>
            </li>
          )}
          {page.location.trim() && (
            <li className="flex gap-3">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--page-accent)]" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-medium [overflow-wrap:anywhere] text-fg">
                  {page.location}
                </span>
                {/* One clear way to the map (spec item 30, ruling 11). */}
                <a
                  href={preview ? undefined : mapsHref(page.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-[var(--page-accent)] underline-offset-4 hover:underline sm:min-h-0"
                >
                  Directions
                </a>
              </span>
            </li>
          )}
        </ul>
        <div className="flex flex-col gap-2">
          <JoinButton event={page} preview={preview} />
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
          <h2 className="mb-2 font-page-heading text-lg font-bold text-fg">About this event</h2>
          <Prose text={page.description} />
        </PageCard>
      )}
      {agenda.length > 0 && (
        <PageCard>
          <section aria-label="Agenda">
            <h2 className="mb-3 font-page-heading text-lg font-bold text-fg">Agenda</h2>
            <ol className="divide-y divide-border">
              {agenda.map((a, i) => (
                <li key={i} className="grid grid-cols-[5rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="font-semibold text-fg tabular-nums">
                    {a.time && formatTime(a.time)}
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block font-medium text-fg">{a.title}</span>
                    {a.note.trim() && <span className="block text-sm text-fg-muted">{a.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </PageCard>
      )}
      {hosts.length > 0 && (
        <PageCard>
          <section aria-label="Hosts">
            <h2 className="mb-3 font-page-heading text-lg font-bold text-fg">Hosts</h2>
            <ul className="grid grid-cols-1 gap-4 min-[22rem]:grid-cols-2">
              {hosts.map((h, i) => (
                <li key={i} className="flex min-w-0 items-center gap-3">
                  {h.photo ? (
                    <MediaImage
                      media={h.photo}
                      alt=""
                      className="size-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-2 font-semibold text-fg-muted"
                    >
                      {h.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block font-semibold text-fg">{h.name}</span>
                    {h.role.trim() && <span className="block text-sm text-fg-muted">{h.role}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </PageCard>
      )}
    </PageFrame>
  );
}

function FeedbackView({ page, slug, preview }: ViewProps<FeedbackPage>) {
  const look = page.look;
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout={look.header}
        image={page.logo}
        imageAlt={`${page.business} logo`}
        art
        title={page.business || "Your business"}
      />
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
    </PageFrame>
  );
}

function PdfView({ page, preview }: ViewProps<PdfPage>) {
  const href = page.file ? mediaUrl(page.file.path) : null;
  const look = page.look;
  return (
    <PageFrame look={look} preview={preview}>
      <span className="grid size-20 place-items-center self-center rounded-(--pg-radius) bg-[var(--page-accent)] text-[var(--page-accent-fg)]">
        <FileText aria-hidden className="size-10" />
      </span>
      <PageHeader
        look={look}
        layout="classic"
        image={null}
        imageAlt=""
        title={page.title || page.file?.name || "Document"}
        sub={page.description || undefined}
      />
      <PageCard className="flex flex-col items-center gap-4 text-center">
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
    </PageFrame>
  );
}

function ImagesView({ page, preview }: ViewProps<ImagesPage>) {
  const look = page.look;
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout="classic"
        image={null}
        imageAlt=""
        title={page.title || "Gallery"}
        sub={page.description || undefined}
      />
      {page.images.length ? (
        <ul className="grid grid-cols-2 gap-2">
          {page.images.map(({ image }, i) => (
            <li
              key={image.path}
              className={page.images.length % 2 === 1 && i === 0 ? "col-span-2" : undefined}
            >
              <a
                href={preview ? undefined : mediaUrl(image.path)}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-(--pg-radius) bg-surface-2"
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
    </PageFrame>
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
  const embed = videoEmbed(page.url);
  const link = !embed ? safeHref(page.url) : null;
  const look = page.look;
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout="classic"
        image={null}
        imageAlt=""
        title={page.title || "Video"}
      />
      <PageCard className="flex flex-col gap-4">
        {/* The player sits inside the card's padding: no overhang on phones. */}
        <div className="overflow-hidden rounded-(--pg-radius) bg-black">
          {preview && embed ? (
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
          ) : (
            <div className="grid aspect-video place-items-center text-white/80">
              <Play aria-hidden className="size-14" />
            </div>
          )}
        </div>
        {page.description.trim() && <Prose text={page.description} />}
        {link && (
          <PageLink href={link} preview={preview}>
            <Play aria-hidden /> Watch video
          </PageLink>
        )}
      </PageCard>
    </PageFrame>
  );
}

function AudioView({ page, preview }: ViewProps<AudioPage>) {
  const link = safeHref(page.link);
  const look = page.look;
  return (
    <PageFrame look={look} preview={preview}>
      {!page.cover && (
        <span className="grid size-56 place-items-center self-center rounded-(--pg-radius) bg-[var(--page-accent)] text-[var(--page-accent-fg)]">
          <Music aria-hidden className="size-16" />
        </span>
      )}
      <PageHeader
        look={look}
        layout={look.header}
        image={page.cover}
        imageAlt={`${page.title} cover art`}
        art
        large
        title={page.title || "Audio"}
        sub={page.artist || undefined}
      />
      <PageCard className="flex flex-col items-center gap-4 text-center">
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
    </PageFrame>
  );
}

function AppView({ page, preview }: ViewProps<AppPage>) {
  const ios = safeHref(page.iosUrl);
  const android = safeHref(page.androidUrl);
  const web = safeHref(page.webUrl);
  const look = page.look;
  return (
    <PageFrame look={look} preview={preview}>
      {!page.icon && (
        <span className="grid size-24 place-items-center self-center rounded-[1.6rem] bg-[var(--page-accent)] text-[var(--page-accent-fg)]">
          <Smartphone aria-hidden className="size-12" />
        </span>
      )}
      <PageHeader
        look={look}
        layout="classic"
        image={page.icon}
        imageAlt={`${page.name} icon`}
        art
        title={page.name || "Your app"}
        sub={page.description || undefined}
      />
      <PageCard className="flex flex-col items-center gap-4 text-center">
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
    </PageFrame>
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
