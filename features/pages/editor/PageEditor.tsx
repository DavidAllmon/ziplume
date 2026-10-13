"use client";

import { useCallback, useMemo, useState } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  LIMITS,
  type AppPage,
  type AudioPage,
  type BusinessPage,
  type CouponPage,
  type EventPage,
  type FeedbackPage,
  type ImagesPage,
  type LinksPage,
  type MenuPage,
  type PageContentMap,
  type PdfPage,
  type VcardPage,
  type VideoPage,
} from "@/lib/pages/types";
import type { PageErrors } from "@/lib/pages/validate";
import type { PageTypeId } from "@/lib/qr/types";

import {
  AccentField,
  AreaField,
  HoursField,
  ImagesField,
  LinksField,
  ListField,
  MediaField,
  SocialsField,
  TextField,
  TimeZoneField,
  ToggleField,
  type ErrorsApi,
} from "./fields";

interface EditorProps<T> {
  page: T;
  set: (patch: Partial<T>) => void;
  errors: ErrorsApi;
}

function Appearance({ color, set }: { color: string; set: (patch: { color: string }) => void }) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-5">
      <AccentField value={color} onChange={(value) => set({ color: value })} />
    </div>
  );
}

function LinksEditor({ page, set, errors }: EditorProps<LinksPage>) {
  return (
    <>
      <MediaField
        label="Profile picture"
        kind="image"
        round
        maxSide={512}
        value={page.avatar}
        onChange={(avatar) => set({ avatar })}
      />
      <TextField
        label="Title"
        value={page.title}
        onChange={(title) => set({ title })}
        path="title"
        errors={errors}
        placeholder="Your name or brand"
      />
      <AreaField
        label="Bio"
        value={page.bio}
        onChange={(bio) => set({ bio })}
        placeholder="A line or two about you"
      />
      <LinksField
        items={page.links}
        onChange={(links) => set({ links })}
        max={LIMITS.links}
        errors={errors}
      />
      {errors.error("links.0.url") && !page.links.length && (
        <p className="text-sm text-danger">{errors.error("links.0.url")}</p>
      )}
      <SocialsField
        items={page.socials}
        onChange={(socials) => set({ socials })}
        max={LIMITS.socials}
        errors={errors}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function VcardEditor({ page, set, errors }: EditorProps<VcardPage>) {
  return (
    <>
      <MediaField
        label="Photo"
        kind="image"
        round
        maxSide={512}
        value={page.photo}
        onChange={(photo) => set({ photo })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First name"
          value={page.firstName}
          onChange={(firstName) => set({ firstName })}
          path="firstName"
          errors={errors}
          autoComplete="given-name"
          maxLength={60}
        />
        <TextField
          label="Last name"
          value={page.lastName}
          onChange={(lastName) => set({ lastName })}
          autoComplete="family-name"
          maxLength={60}
        />
        <TextField
          label="Job title"
          optional
          value={page.jobTitle}
          onChange={(jobTitle) => set({ jobTitle })}
        />
        <TextField
          label="Company"
          optional
          value={page.company}
          onChange={(company) => set({ company })}
        />
      </div>
      <AreaField label="About" value={page.bio} onChange={(bio) => set({ bio })} />
      <ListField
        label="Phone numbers"
        items={page.phones}
        onChange={(phones) => set({ phones })}
        max={LIMITS.phones}
        addLabel="Add phone"
        itemName="phone"
        newItem={() => ({ label: "Mobile", number: "" })}
        render={(item, update, i) => (
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <TextField
              label="Label"
              value={item.label}
              onChange={(label) => update({ label })}
              maxLength={30}
            />
            <TextField
              label="Number"
              type="tel"
              inputMode="tel"
              value={item.number}
              onChange={(number) => update({ number })}
              path={`phones.${i}.number`}
              errors={errors}
              placeholder="+1 555 010 9999"
              maxLength={40}
            />
          </div>
        )}
      />
      <ListField
        label="Email addresses"
        items={page.emails}
        onChange={(emails) => set({ emails })}
        max={LIMITS.emails}
        addLabel="Add email"
        itemName="email"
        newItem={() => ({ label: "Work", address: "" })}
        render={(item, update, i) => (
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <TextField
              label="Label"
              value={item.label}
              onChange={(label) => update({ label })}
              maxLength={30}
            />
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              value={item.address}
              onChange={(address) => update({ address })}
              path={`emails.${i}.address`}
              errors={errors}
              placeholder="you@example.com"
              maxLength={254}
            />
          </div>
        )}
      />
      <TextField
        label="Website"
        optional
        type="url"
        inputMode="url"
        value={page.website}
        onChange={(website) => set({ website })}
        path="website"
        errors={errors}
        placeholder="example.com"
        maxLength={2048}
      />
      <TextField
        label="Address"
        optional
        value={page.address}
        onChange={(address) => set({ address })}
        autoComplete="street-address"
        maxLength={300}
      />
      <SocialsField
        items={page.socials}
        onChange={(socials) => set({ socials })}
        max={LIMITS.socials}
        errors={errors}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function BusinessEditor({ page, set, errors }: EditorProps<BusinessPage>) {
  return (
    <>
      <TextField
        label="Business name"
        value={page.name}
        onChange={(name) => set({ name })}
        path="name"
        errors={errors}
      />
      <TextField
        label="Tagline"
        optional
        value={page.tagline}
        onChange={(tagline) => set({ tagline })}
        placeholder="Fresh bread, every morning"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <MediaField
          label="Logo"
          kind="image"
          maxSide={512}
          value={page.logo}
          onChange={(logo) => set({ logo })}
        />
        <MediaField
          label="Cover photo"
          kind="image"
          value={page.cover}
          onChange={(cover) => set({ cover })}
        />
      </div>
      <AreaField
        label="About"
        value={page.about}
        onChange={(about) => set({ about })}
        maxLength={2000}
        rows={4}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Phone"
          optional
          type="tel"
          inputMode="tel"
          value={page.phone}
          onChange={(phone) => set({ phone })}
          path="phone"
          errors={errors}
          maxLength={40}
        />
        <TextField
          label="Email"
          optional
          type="email"
          inputMode="email"
          value={page.email}
          onChange={(email) => set({ email })}
          path="email"
          errors={errors}
          maxLength={254}
        />
        <TextField
          label="Website"
          optional
          type="url"
          inputMode="url"
          value={page.website}
          onChange={(website) => set({ website })}
          path="website"
          errors={errors}
          maxLength={2048}
        />
        <TextField
          label="Address"
          optional
          value={page.address}
          onChange={(address) => set({ address })}
          maxLength={300}
        />
      </div>
      <ToggleField
        label="Show opening hours"
        checked={page.showHours}
        onChange={(showHours) => set({ showHours })}
      />
      {page.showHours && (
        <HoursField hours={page.hours} onChange={(hours) => set({ hours })} errors={errors} />
      )}
      <LinksField
        label="Buttons"
        prefix="buttons"
        items={page.buttons}
        onChange={(buttons) => set({ buttons })}
        max={LIMITS.buttons}
        errors={errors}
      />
      <SocialsField
        items={page.socials}
        onChange={(socials) => set({ socials })}
        max={LIMITS.socials}
        errors={errors}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function MenuEditor({ page, set, errors }: EditorProps<MenuPage>) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
        <TextField
          label="Restaurant name"
          value={page.name}
          onChange={(name) => set({ name })}
          path="name"
          errors={errors}
        />
        <TextField
          label="Currency"
          value={page.currency}
          onChange={(currency) => set({ currency })}
          maxLength={4}
          placeholder="$"
        />
      </div>
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <MediaField
        label="Logo"
        kind="image"
        maxSide={512}
        value={page.logo}
        onChange={(logo) => set({ logo })}
      />
      <ListField
        label="Sections"
        items={page.sections}
        onChange={(sections) => set({ sections })}
        max={LIMITS.sections}
        addLabel="Add section"
        itemName="section"
        newItem={() => ({ name: "", items: [{ name: "", description: "", price: "", tags: "" }] })}
        render={(section, update, s) => (
          <>
            <TextField
              label="Section name"
              value={section.name}
              onChange={(name) => update({ name })}
              placeholder="Mains"
              maxLength={80}
            />
            <ListField
              label="Dishes and drinks"
              items={section.items}
              onChange={(items) => update({ items })}
              max={LIMITS.items}
              addLabel="Add item"
              itemName="item"
              newItem={() => ({ name: "", description: "", price: "", tags: "" })}
              render={(item, updateItem, i) => (
                <>
                  <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                    <TextField
                      label="Name"
                      value={item.name}
                      onChange={(name) => updateItem({ name })}
                      path={`sections.${s}.items.${i}.name`}
                      errors={errors}
                    />
                    <TextField
                      label="Price"
                      value={item.price}
                      onChange={(price) => updateItem({ price })}
                      inputMode="decimal"
                      maxLength={20}
                      placeholder="12"
                    />
                  </div>
                  <TextField
                    label="Description"
                    optional
                    value={item.description}
                    onChange={(description) => updateItem({ description })}
                    maxLength={300}
                  />
                  <TextField
                    label="Tags"
                    optional
                    hint="Comma separated, e.g. vegan, gluten-free"
                    value={item.tags}
                    onChange={(tags) => updateItem({ tags })}
                    maxLength={80}
                  />
                </>
              )}
            />
          </>
        )}
      />
      <AreaField
        label="Note"
        value={page.note}
        onChange={(note) => set({ note })}
        placeholder="Prices include tax. Ask us about allergens."
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function CouponEditor({ page, set, errors }: EditorProps<CouponPage>) {
  return (
    <>
      <TextField
        label="Business"
        optional
        value={page.business}
        onChange={(business) => set({ business })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Offer"
          value={page.offer}
          onChange={(offer) => set({ offer })}
          path="offer"
          errors={errors}
          placeholder="20% OFF"
          maxLength={40}
        />
        <TextField
          label="Coupon code"
          optional
          value={page.code}
          onChange={(code) => set({ code })}
          placeholder="SPRING20"
          maxLength={40}
        />
      </div>
      <TextField
        label="Headline"
        optional
        value={page.headline}
        onChange={(headline) => set({ headline })}
        placeholder="On your next visit"
      />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <TextField
        label="Valid until"
        optional
        type="date"
        value={page.validUntil}
        onChange={(validUntil) => set({ validUntil })}
        path="validUntil"
        errors={errors}
        maxLength={10}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Button text"
          optional
          value={page.buttonLabel}
          onChange={(buttonLabel) => set({ buttonLabel })}
          placeholder="Shop now"
          maxLength={40}
        />
        <TextField
          label="Button link"
          optional
          type="url"
          inputMode="url"
          value={page.buttonUrl}
          onChange={(buttonUrl) => set({ buttonUrl })}
          path="buttonUrl"
          errors={errors}
          maxLength={2048}
        />
      </div>
      <AreaField
        label="Terms and conditions"
        value={page.terms}
        onChange={(terms) => set({ terms })}
        maxLength={2000}
      />
      <MediaField
        label="Image"
        kind="image"
        value={page.image}
        onChange={(image) => set({ image })}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function EventEditor({ page, set, errors }: EditorProps<EventPage>) {
  return (
    <>
      <TextField
        label="Event name"
        value={page.title}
        onChange={(title) => set({ title })}
        path="title"
        errors={errors}
      />
      <ToggleField
        label="All-day event"
        checked={page.allDay}
        onChange={(allDay) => set({ allDay })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Starts"
          type="datetime-local"
          value={page.start}
          onChange={(start) => set({ start })}
          path="start"
          errors={errors}
          maxLength={16}
        />
        <TextField
          label="Ends"
          optional
          type="datetime-local"
          value={page.end}
          onChange={(end) => set({ end })}
          path="end"
          errors={errors}
          maxLength={16}
        />
      </div>
      <TimeZoneField
        value={page.timeZone}
        onChange={(timeZone) => set({ timeZone })}
        error={errors.error("timeZone")}
      />
      <TextField
        label="Location"
        optional
        value={page.location}
        onChange={(location) => set({ location })}
        placeholder="Venue name and address"
        maxLength={300}
      />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
        maxLength={2000}
        rows={4}
      />
      <TextField
        label="Organizer"
        optional
        value={page.organizer}
        onChange={(organizer) => set({ organizer })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Ticket button text"
          optional
          value={page.ticketLabel}
          onChange={(ticketLabel) => set({ ticketLabel })}
          maxLength={40}
        />
        <TextField
          label="Ticket link"
          optional
          type="url"
          inputMode="url"
          value={page.ticketUrl}
          onChange={(ticketUrl) => set({ ticketUrl })}
          path="ticketUrl"
          errors={errors}
          maxLength={2048}
        />
      </div>
      <MediaField
        label="Image"
        kind="image"
        value={page.image}
        onChange={(image) => set({ image })}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function FeedbackEditor({ page, set, errors }: EditorProps<FeedbackPage>) {
  return (
    <>
      <TextField
        label="Business name"
        value={page.business}
        onChange={(business) => set({ business })}
        path="business"
        errors={errors}
      />
      <MediaField
        label="Logo"
        kind="image"
        maxSide={512}
        value={page.logo}
        onChange={(logo) => set({ logo })}
      />
      <TextField
        label="Question"
        value={page.question}
        onChange={(question) => set({ question })}
        path="question"
        errors={errors}
      />
      <ToggleField
        label="Ask for a comment"
        checked={page.allowComment}
        onChange={(allowComment) => set({ allowComment })}
      />
      <ToggleField
        label="Ask for contact details"
        description="Optional for the visitor, so you can reply."
        checked={page.askContact}
        onChange={(askContact) => set({ askContact })}
      />
      <AreaField
        label="Thank-you message"
        value={page.thanks}
        onChange={(thanks) => set({ thanks })}
      />
      <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
        Responses appear on this code’s page in My codes.
      </p>
      <Appearance color={page.color} set={set} />
    </>
  );
}

function PdfEditor({ page, set, errors, touched }: EditorProps<PdfPage> & { touched: boolean }) {
  return (
    <>
      <MediaField
        label="PDF"
        kind="pdf"
        value={page.file}
        onChange={(file) =>
          set({ file, title: page.title || file?.name.replace(/\.pdf$/i, "") || "" })
        }
        hint="Up to 50 MB."
        error={touched ? (errors.error("file") ?? undefined) : undefined}
      />
      <TextField label="Title" optional value={page.title} onChange={(title) => set({ title })} />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <ToggleField
        label="Open the PDF straight away"
        description="Skip the page: scanning opens the file directly."
        checked={page.direct}
        onChange={(direct) => set({ direct })}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function ImagesEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<ImagesPage> & { touched: boolean }) {
  return (
    <>
      <TextField
        label="Title"
        optional
        value={page.title}
        onChange={(title) => set({ title })}
        placeholder="Our wedding"
      />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <ImagesField
        value={page.images}
        onChange={(images) => set({ images })}
        max={LIMITS.images}
        error={touched ? errors.error("images") : undefined}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function VideoEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<VideoPage> & { touched: boolean }) {
  return (
    <>
      <SegmentedControl
        aria-label="Video source"
        value={page.source}
        onChange={(source) => set({ source })}
        options={[
          { value: "link", label: "YouTube or Vimeo link" },
          { value: "upload", label: "Upload a video" },
        ]}
      />
      {page.source === "link" ? (
        <TextField
          label="Video link"
          type="url"
          inputMode="url"
          value={page.url}
          onChange={(url) => set({ url })}
          path="url"
          errors={errors}
          placeholder="https://youtu.be/…"
          maxLength={2048}
        />
      ) : (
        <MediaField
          label="Video"
          kind="video"
          value={page.file}
          onChange={(file) => set({ file })}
          hint="MP4, WebM or MOV, up to 50 MB."
          error={touched ? errors.error("file") : undefined}
        />
      )}
      <TextField label="Title" optional value={page.title} onChange={(title) => set({ title })} />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function AudioEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<AudioPage> & { touched: boolean }) {
  return (
    <>
      <MediaField
        label="Audio file"
        kind="audio"
        value={page.file}
        onChange={(file) =>
          set({ file, title: page.title || file?.name.replace(/\.\w+$/, "") || "" })
        }
        hint="MP3, M4A, WAV or OGG, up to 50 MB."
        error={touched ? errors.error("file") : undefined}
      />
      <TextField
        label="Or a link"
        optional
        type="url"
        inputMode="url"
        hint="Spotify, SoundCloud, Apple Podcasts…"
        value={page.link}
        onChange={(link) => set({ link })}
        path="link"
        errors={errors}
        maxLength={2048}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Title" optional value={page.title} onChange={(title) => set({ title })} />
        <TextField
          label="Artist"
          optional
          value={page.artist}
          onChange={(artist) => set({ artist })}
        />
      </div>
      <MediaField
        label="Cover art"
        kind="image"
        maxSide={1000}
        value={page.cover}
        onChange={(cover) => set({ cover })}
      />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}

function AppEditor({ page, set, errors }: EditorProps<AppPage>) {
  return (
    <>
      <TextField
        label="App name"
        value={page.name}
        onChange={(name) => set({ name })}
        path="name"
        errors={errors}
      />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <MediaField
        label="App icon"
        kind="image"
        maxSide={512}
        value={page.icon}
        onChange={(icon) => set({ icon })}
      />
      <TextField
        label="App Store link"
        optional
        type="url"
        inputMode="url"
        value={page.iosUrl}
        onChange={(iosUrl) => set({ iosUrl })}
        path="iosUrl"
        errors={errors}
        placeholder="apps.apple.com/app/…"
        maxLength={2048}
      />
      <TextField
        label="Google Play link"
        optional
        type="url"
        inputMode="url"
        value={page.androidUrl}
        onChange={(androidUrl) => set({ androidUrl })}
        path="androidUrl"
        errors={errors}
        placeholder="play.google.com/store/apps/details?id=…"
        maxLength={2048}
      />
      <TextField
        label="Website"
        optional
        type="url"
        inputMode="url"
        hint="Shown to computers and anyone without a store link."
        value={page.webUrl}
        onChange={(webUrl) => set({ webUrl })}
        path="webUrl"
        errors={errors}
        maxLength={2048}
      />
      <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
        iPhones go straight to the App Store and Android phones to Google Play. Everyone else sees a
        page with both.
      </p>
      <Appearance color={page.color} set={set} />
    </>
  );
}

interface PageEditorProps<K extends PageTypeId> {
  type: K;
  page: PageContentMap[K];
  errors: PageErrors;
  onChange: (page: PageContentMap[K]) => void;
}

/** Form for a hosted page; errors show once a field has been visited. */
export function PageEditor<K extends PageTypeId>({
  type,
  page,
  errors,
  onChange,
}: PageEditorProps<K>) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const touch = useCallback(
    (path: string) =>
      setTouched((current) => (current.has(path) ? current : new Set(current).add(path))),
    [],
  );
  const errorsApi = useMemo<ErrorsApi>(
    () => ({ error: (path) => (touched.has(path) ? errors[path] : undefined), touch }),
    [errors, touched, touch],
  );
  const anyTouched = touched.size > 0;
  const set = (patch: object) => {
    if (!anyTouched) touch("*");
    onChange({ ...page, ...patch } as PageContentMap[K]);
  };
  const props = { set, errors: errorsApi };
  // Required-file problems show once the user has started editing.
  const fileErrors: ErrorsApi = { error: (path) => errors[path], touch };

  const body = (() => {
    switch (type) {
      case "links":
        return <LinksEditor page={page as LinksPage} {...props} />;
      case "vcard":
        return <VcardEditor page={page as VcardPage} {...props} />;
      case "business":
        return <BusinessEditor page={page as BusinessPage} {...props} />;
      case "menu":
        return <MenuEditor page={page as MenuPage} {...props} />;
      case "coupon":
        return <CouponEditor page={page as CouponPage} {...props} />;
      case "event":
        return <EventEditor page={page as EventPage} {...props} />;
      case "feedback":
        return <FeedbackEditor page={page as FeedbackPage} {...props} />;
      case "pdf":
        return (
          <PdfEditor page={page as PdfPage} set={set} errors={fileErrors} touched={anyTouched} />
        );
      case "images":
        return (
          <ImagesEditor
            page={page as ImagesPage}
            set={set}
            errors={fileErrors}
            touched={anyTouched}
          />
        );
      case "video":
        return (
          <VideoEditor
            page={page as VideoPage}
            set={set}
            errors={{
              ...errorsApi,
              error: (p) => (p === "file" ? errors.file : errorsApi.error(p)),
            }}
            touched={anyTouched}
          />
        );
      case "audio":
        return (
          <AudioEditor
            page={page as AudioPage}
            set={set}
            errors={{
              ...errorsApi,
              error: (p) => (p === "file" ? errors.file : errorsApi.error(p)),
            }}
            touched={anyTouched}
          />
        );
      case "app":
        return <AppEditor page={page as AppPage} {...props} />;
      default:
        return null;
    }
  })();

  return <div className="flex flex-col gap-5">{body}</div>;
}
