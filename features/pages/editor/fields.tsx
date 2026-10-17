"use client";

import { arrayMove, useSortable } from "@dnd-kit/sortable";
import { Switch } from "@headlessui/react";
import {
  ChevronRight,
  FileAudio,
  FileText,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { ColorField } from "@/components/ui/ColorField";
import { Field } from "@/components/ui/Field";
import { Select, Textarea, TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";
import { DAY_NAMES } from "@/lib/pages/hours";
import { newHeader, newLink, scheduleNote } from "@/lib/pages/links";
import type { DayHours, LinkItem, LinkType, Media, SocialItem } from "@/lib/pages/types";
import { SOCIAL_NETWORKS } from "@/lib/pages/types";
import { mediaUrl } from "@/lib/pages/urls";
import { isoToLocalInput, localToIso } from "@/lib/time/local";

import { fileSize, SocialIcon, socialLabel } from "../parts";
import { Labeled } from "./Labeled";
import { MediaOwnerContext } from "./MediaOwner";
import { RowMenu } from "./sortable/RowMenu";
import { SortableArea } from "./sortable/SortableArea";
import { SortableList } from "./sortable/SortableList";
import { limitNote, useLimit } from "./limits";
import { ACCEPT, uploadMedia, type MediaKind } from "./upload";

/** Shows a field's error once it has been left (or after a save attempt). */
export interface ErrorsApi {
  error: (path: string) => string | undefined;
  touch: (path: string) => void;
  /** A list under `prefix` changed order: `order[newIndex]` is each row's old index (-1: new). */
  reorder?: (prefix: string, order: number[]) => void;
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The field's place in the page ("bio", "links.3.label"); its limit comes from the schema. */
  path: string;
  errors?: ErrorsApi;
  hint?: ReactNode;
  optional?: boolean;
  placeholder?: string;
  type?: "text" | "url" | "email" | "tel" | "date" | "datetime-local" | "time";
  inputMode?: "text" | "url" | "email" | "tel" | "decimal";
  autoComplete?: string;
  /** See Field. */
  hideLabel?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  path,
  errors,
  hint,
  optional,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  hideLabel,
}: TextFieldProps) {
  const limit = useLimit(path);
  // Dates and times have a fixed shape; they need no counter.
  const plain = !["date", "datetime-local", "time"].includes(type);
  const note = limitNote(value.length, plain ? limit : null, false);
  return (
    <Field
      label={label}
      hint={hint}
      optional={optional}
      hideLabel={hideLabel}
      error={note.error ?? errors?.error(path)}
      counter={note.counter}
    >
      {(control) => (
        <TextInput
          {...control}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete ?? "off"}
          autoCapitalize={type === "url" || type === "email" ? "none" : undefined}
          spellCheck={type === "url" || type === "email" ? false : undefined}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => errors?.touch(path)}
          data-field={path}
        />
      )}
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  path,
  errors,
  hint,
  optional = true,
  placeholder,
  rows = 3,
  hideLabel,
}: Omit<TextFieldProps, "type"> & { rows?: number }) {
  const note = limitNote(value.length, useLimit(path), true);
  return (
    <Field
      label={label}
      hint={hint}
      optional={optional}
      hideLabel={hideLabel}
      error={note.error ?? errors?.error(path)}
      counter={note.counter}
    >
      {(control) => (
        <Textarea
          {...control}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => errors?.touch(path)}
          data-field={path}
        />
      )}
    </Field>
  );
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return <Toggle label={label} description={description} checked={checked} onChange={onChange} />;
}

const ACCENTS = [
  "#0A1330",
  "#0B6E8C",
  "#4F46E5",
  "#0F766E",
  "#B45309",
  "#BE123C",
  "#7C3AED",
  "#15803D",
];

export function AccentField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-sm font-medium text-fg">
        Page color
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-2">
        {ACCENTS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Use ${color}`}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            className={cn(
              "size-9 rounded-full border-2 focus-ring",
              value === color ? "border-fg" : "border-transparent",
            )}
            style={{ background: color }}
          />
        ))}
      </div>
      <div className="max-w-56">
        <ColorField label="Custom color" value={value} onChange={onChange} />
      </div>
    </div>
  );
}

const KIND_ICON = { pdf: FileText, audio: FileAudio, image: FileText };
const KIND_LABEL: Record<MediaKind, string> = {
  image: "image",
  pdf: "PDF",
  audio: "audio file",
};

interface MediaFieldProps {
  label: string;
  kind: MediaKind;
  value: Media | null;
  onChange: (value: Media | null) => void;
  hint?: string;
  /** Longest side for images, in pixels. */
  maxSide?: number;
  round?: boolean;
  error?: string;
  /** Marks the file input for "Show me". */
  field?: string;
}

/** Upload, preview, replace and remove one file. */
export function MediaField({
  label,
  kind,
  value,
  onChange,
  hint,
  maxSide,
  round,
  error,
  field,
}: MediaFieldProps) {
  const inputId = useId();
  const ownerId = useContext(MediaOwnerContext);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const Icon = KIND_ICON[kind];

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setProblem(null);
    const result = await uploadMedia(file, kind, { maxSide, ownerId });
    setBusy(false);
    if (result.ok) onChange(result.media);
    else setProblem(result.error);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg">{label}</span>
      <div className="flex items-center gap-3 rounded-control border border-border bg-surface-2 p-3">
        {value && kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded file preview
          <img
            src={mediaUrl(value.path)}
            alt=""
            className={cn(
              "size-14 shrink-0 bg-white object-cover",
              round ? "rounded-full" : "rounded-lg",
            )}
          />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface text-fg-muted">
            {busy ? (
              <Loader2 aria-hidden className="size-6 animate-spin" />
            ) : value ? (
              <Icon aria-hidden className="size-6" />
            ) : (
              <Upload aria-hidden className="size-6" />
            )}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {value ? (
            <span className="truncate text-sm text-fg">
              {value.name} <span className="text-fg-muted">· {fileSize(value.size)}</span>
            </span>
          ) : (
            <span className="text-sm text-fg-muted">
              {busy ? "Uploading…" : `No ${KIND_LABEL[kind]} yet`}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={inputId}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-sm font-semibold text-fg hover:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
            >
              {value ? "Replace" : "Upload"}
              <input
                id={inputId}
                type="file"
                accept={ACCEPT[kind]}
                data-field={field}
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  void pick(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {value && (
              <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                <Trash2 aria-hidden /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {(problem || error) && (
        <p role="alert" className="text-sm text-danger">
          {problem ?? error}
        </p>
      )}
      {hint && !problem && !error && <p className="text-sm text-fg-muted">{hint}</p>}
    </div>
  );
}

/** Several images, uploaded one or many at a time. */
export function ImagesField({
  value,
  onChange,
  onAdd,
  max,
  error,
  field,
}: {
  value: Media[];
  onChange: (value: Media[]) => void;
  /** Adds an uploaded image to the latest list, so moves and removals made meanwhile stay. */
  onAdd: (media: Media) => void;
  max: number;
  error?: string;
  /** Marks the file input for "Show me". */
  field?: string;
}) {
  const inputId = useId();
  const ownerId = useContext(MediaOwnerContext);
  const [busy, setBusy] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const room = max - value.length;
    const chosen = Array.from(files).slice(0, room);
    setProblem(files.length > room ? `You can add up to ${max} images.` : null);
    setBusy(chosen.length);
    for (const file of chosen) {
      const result = await uploadMedia(file, "image", { ownerId });
      setBusy((n) => n - 1);
      if (result.ok) onAdd(result.media);
      else setProblem(result.error);
    }
  }

  const ids = value.map((media) => media.path);
  const names = value.map((_, i) => `image ${i + 1}`);
  const grid = useRef<HTMLUListElement>(null);
  // After a move or remove from a ⋯ menu, focus goes to that place's ⋯ (or, once the last
  // image is gone, to Add images) instead of falling back to the top of the page.
  const focusAt = useRef<number | null>(null);
  useLayoutEffect(() => {
    const at = focusAt.current;
    if (at === null) return;
    focusAt.current = null;
    const menus = grid.current?.querySelectorAll<HTMLElement>("[data-row-menu]");
    const target = menus?.length
      ? menus[Math.min(at, menus.length - 1)]
      : document.getElementById(inputId);
    target?.focus();
  });
  const moveImage = (from: number, to: number) => {
    if (to >= 0 && to < value.length) onChange(arrayMove(value, from, to));
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length < max && (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center gap-1 rounded-control border-2 border-dashed border-field-border px-4 py-6 text-center hover:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
        >
          {busy ? (
            <Loader2 aria-hidden className="size-6 animate-spin text-fg-muted" />
          ) : (
            <Plus aria-hidden className="size-6 text-primary dark:text-link" />
          )}
          <span className="text-sm font-semibold text-fg">
            {busy ? `Uploading ${busy}…` : "Add images"}
          </span>
          <span className="text-sm text-fg-muted">
            PNG, JPG, WebP or GIF · {value.length}/{max}
          </span>
          <input
            id={inputId}
            type="file"
            multiple
            data-field={field}
            accept={ACCEPT.image}
            className="sr-only"
            disabled={busy > 0}
            onChange={(event) => {
              void pick(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {value.length > 0 && (
        <SortableArea ids={ids} names={names} grid onMove={moveImage}>
          <ul ref={grid} aria-label="Images" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {value.map((media, i) => (
              <ImageTile
                key={media.path}
                id={media.path}
                name={names[i]!}
                src={mediaUrl(media.path)}
              >
                <RowMenu
                  layout="grid"
                  name={names[i]!}
                  first={i === 0}
                  last={i === value.length - 1}
                  onMove={(by) => {
                    focusAt.current = i + by;
                    moveImage(i, i + by);
                  }}
                  onRemove={() => {
                    focusAt.current = i;
                    onChange(value.filter((_, j) => j !== i));
                  }}
                />
              </ImageTile>
            ))}
          </ul>
        </SortableArea>
      )}
      {(problem || error) && (
        <p role="alert" className="text-sm text-danger">
          {problem ?? error}
        </p>
      )}
    </div>
  );
}

/** One uploaded image in the grid: a drag handle on top, its ⋯ menu below. */
function ImageTile({
  id,
  name,
  src,
  children,
}: {
  id: string;
  name: string;
  src: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
          : undefined,
        transition,
      }}
      className={cn("relative", isDragging && "z-10")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded file preview */}
      <img
        src={src}
        alt={name.replace(/^i/, "I")}
        className="aspect-square w-full rounded-lg object-cover"
      />
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${name}`}
        className="absolute top-1 left-1 grid size-9 cursor-grab touch-none place-items-center rounded-control bg-surface/90 text-fg shadow-sm focus-ring active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-4" />
      </button>
      <div className="absolute right-1 bottom-1 rounded-control bg-surface/90 shadow-sm">
        {children}
      </div>
    </li>
  );
}

/** How a row is named in its controls: link “Shop”, or link 2 while it has no text. */
export const rowName = (kind: string, text: string, index: number) =>
  text.trim() ? `${kind} “${text.trim()}”` : `${kind} ${index + 1}`;

/** Shows or hides one link or button on the page; off keeps it in the editor. */
export function ShowSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="group relative mt-1.5 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-field-border bg-surface-2 transition-colors data-checked:border-primary data-checked:bg-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
    >
      <span
        aria-hidden
        className="ml-0.5 size-5.5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform group-data-checked:translate-x-5"
      />
    </Switch>
  );
}

const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: "web", label: "Website" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "sms", label: "Text message" },
];

const ADDRESS: Record<
  LinkType,
  { label: string; type: "url" | "email" | "tel"; placeholder: string }
> = {
  web: { label: "Link", type: "url", placeholder: "example.com" },
  email: { label: "Email address", type: "email", placeholder: "hi@example.com" },
  phone: { label: "Phone number", type: "tel", placeholder: "+1 555 010 2030" },
  sms: { label: "Phone number", type: "tel", placeholder: "+1 555 010 2030" },
};

function LinkTypeSelect({
  value,
  onChange,
}: {
  value: LinkType;
  onChange: (type: LinkType) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        Link type
      </label>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value as LinkType)}>
        {LINK_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

const noSubscribe = () => () => {};

/** When a scheduled link shows. The time is in this browser's zone, so it's drawn after hydration. */
function ScheduleChip({ link }: { link: LinkItem }) {
  const inBrowser = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">
      {(inBrowser && scheduleNote(link, new Date())) || "Scheduled"}
    </span>
  );
}

/** A link's less-used settings, folded away under its fields. */
function MoreOptions({
  name,
  problem = false,
  children,
}: {
  name: string;
  /** Something inside needs fixing: stay open so the person (and Show me) can reach it. */
  problem?: boolean;
  children: ReactNode;
}) {
  const [toggled, setOpen] = useState(false);
  const open = toggled || problem;
  const panel = useId();
  return (
    <div className="rounded-control border border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        aria-label={`More options for ${name}`}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-fg focus-ring hover:bg-surface-2"
      >
        <ChevronRight
          aria-hidden
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-90")}
        />
        More options
      </button>
      {open && (
        <div id={panel} className="flex flex-col gap-4 border-t border-border px-3 pt-3 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export function LinksField({
  label = "Links",
  items,
  onChange,
  max,
  errors,
  prefix = "links",
  itemName = "link",
  extras = false,
  presets = false,
}: {
  label?: string;
  items: LinkItem[];
  onChange: (items: LinkItem[]) => void;
  max: number;
  errors: ErrorsApi;
  prefix?: string;
  /** "link", or "button" on a Business page. */
  itemName?: string;
  /** The Link list's extras: types, icons, featured, schedules and headers. */
  extras?: boolean;
  /** Business's ready-made buttons: Google review, Yelp, Book now, Order online (spec item 19). */
  presets?: boolean;
}) {
  const name = (item: LinkItem, i: number) =>
    rowName(item.kind === "header" ? "header" : itemName, item.label, i);
  // A ready-made button already has its text, so the cursor goes to its link instead.
  const [focusUrl, setFocusUrl] = useState(false);
  const full = items.length >= max;
  return (
    <SortableList
      label={label}
      showLabel={false}
      items={items}
      onChange={onChange}
      max={max}
      addLabel={`Add ${itemName}`}
      path={prefix}
      errors={errors}
      itemLabel={name}
      newItem={newLink}
      // A new link or header starts at its text, not the type picker above it.
      newRowFocus={focusUrl ? "input[data-field$='.url']" : "input[data-field$='.label']"}
      off={(item) => !item.on}
      adder={
        presets
          ? ({ add }) => (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => {
                      setFocusUrl(false);
                      add(newLink());
                    }}
                    className={buttonClasses("outline", "md")}
                  >
                    <Plus aria-hidden /> Add {itemName}
                  </button>
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={full}
                      onClick={() => {
                        setFocusUrl(true);
                        add({ ...newLink(), label: preset.label, icon: preset.icon });
                      }}
                      className={buttonClasses("outline", "md")}
                    >
                      <Plus aria-hidden /> Add {preset.name}
                    </button>
                  ))}
                </div>
                {full && (
                  <p className="text-sm text-fg-muted">
                    You can add up to {max} {itemName}s.
                  </p>
                )}
              </div>
            )
          : extras
            ? ({ add }) => (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={items.length >= max}
                      onClick={() => add(newLink())}
                      className={buttonClasses("outline", "md")}
                    >
                      <Plus aria-hidden /> Add {itemName}
                    </button>
                    <button
                      type="button"
                      disabled={items.length >= max}
                      onClick={() => add(newHeader())}
                      className={buttonClasses("outline", "md")}
                    >
                      <Plus aria-hidden /> Add header
                    </button>
                  </div>
                  {items.length >= max && (
                    <p className="text-sm text-fg-muted">
                      You can add up to {max} links and headers.
                    </p>
                  )}
                </div>
              )
            : undefined
      }
      rowActions={(item, update, i) =>
        item.kind === "header" ? null : (
          <>
            {extras && (item.showFrom || item.showUntil) && <ScheduleChip link={item} />}
            <ShowSwitch
              checked={item.on}
              onChange={(on) => update({ on })}
              label={`Show ${name(item, i)} on the page`}
            />
          </>
        )
      }
      render={(item, update, i) => {
        if (item.kind === "header") {
          return (
            <TextField
              label="Header text"
              value={item.label}
              onChange={(labelText) => update({ label: labelText })}
              path={`${prefix}.${i}.label`}
              errors={errors}
              placeholder="Shop"
            />
          );
        }
        const type = extras ? (item.type ?? "web") : "web";
        const address = ADDRESS[type];
        return (
          <>
            {extras && <LinkTypeSelect value={type} onChange={(next) => update({ type: next })} />}
            <TextField
              label="Button text"
              value={item.label}
              onChange={(labelText) => update({ label: labelText })}
              path={`${prefix}.${i}.label`}
              errors={errors}
              placeholder="My website"
            />
            <TextField
              label={address.label}
              type={address.type}
              inputMode={address.type}
              value={item.url}
              onChange={(url) => update({ url })}
              path={`${prefix}.${i}.url`}
              errors={errors}
              placeholder={address.placeholder}
            />
            {extras && (
              <MoreOptions
                name={name(item, i)}
                problem={Boolean(
                  errors.error(`${prefix}.${i}.showFrom`) ||
                  errors.error(`${prefix}.${i}.showUntil`),
                )}
              >
                <Labeled label="Icon">
                  <SegmentedControl
                    aria-label="Link icon"
                    size="touch"
                    value={item.icon ?? "auto"}
                    onChange={(icon) => update({ icon })}
                    options={[
                      { value: "auto", label: "Auto" },
                      { value: "image", label: "Image" },
                      { value: "none", label: "None" },
                    ]}
                  />
                </Labeled>
                {item.icon === "image" && (
                  <MediaField
                    label="Icon image"
                    kind="image"
                    value={item.image}
                    onChange={(image) => update({ image })}
                    maxSide={256}
                  />
                )}
                <ToggleField
                  label="Featured"
                  description="Drawn taller, in the accent color."
                  checked={item.featured}
                  onChange={(on) =>
                    onChange(items.map((l, j) => ({ ...l, featured: j === i ? on : false })))
                  }
                />
                <div className="grid gap-4 @min-[28rem]:grid-cols-2">
                  <TextField
                    label="Show from"
                    type="datetime-local"
                    value={isoToLocalInput(item.showFrom)}
                    onChange={(value) => update({ showFrom: localToIso(value) ?? "" })}
                    path={`${prefix}.${i}.showFrom`}
                    errors={errors}
                    optional
                  />
                  <TextField
                    label="Show until"
                    type="datetime-local"
                    value={isoToLocalInput(item.showUntil)}
                    onChange={(value) => update({ showUntil: localToIso(value) ?? "" })}
                    path={`${prefix}.${i}.showUntil`}
                    errors={errors}
                    optional
                  />
                </div>
                <p className="text-sm text-fg-muted">
                  Times are in your time zone. Leave them blank to always show the link.
                </p>
              </MoreOptions>
            )}
          </>
        );
      }}
    />
  );
}

/** Social profiles: pick a network's icon to add its address; drag to reorder. */
export function SocialsField({
  items,
  onChange,
  max,
  errors,
}: {
  items: SocialItem[];
  onChange: (items: SocialItem[]) => void;
  max: number;
  errors: ErrorsApi;
}) {
  return (
    <SortableList
      label="Social icons"
      showLabel={false}
      items={items}
      onChange={onChange}
      max={max}
      addLabel="Add profile"
      addAt="end"
      path="socials"
      errors={errors}
      itemLabel={(item) => socialLabel(item.network)}
      newItem={(): SocialItem => ({ network: "instagram", url: "" })}
      adder={({ add, focus }) => (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
            {SOCIAL_NETWORKS.map((network) => {
              const at = items.findIndex((item) => item.network === network);
              const name = socialLabel(network);
              return (
                <button
                  key={network}
                  type="button"
                  title={name}
                  aria-label={at === -1 ? `Add ${name}` : `Edit ${name}`}
                  disabled={at === -1 && items.length >= max}
                  onClick={() => (at === -1 ? add({ network, url: "" }) : focus(at))}
                  className={cn(
                    "grid size-11 place-items-center rounded-control border focus-ring disabled:cursor-not-allowed disabled:opacity-40",
                    at === -1
                      ? "border-border text-fg hover:bg-surface-2"
                      : "border-primary bg-primary-soft text-primary-soft-fg",
                  )}
                >
                  <SocialIcon network={network} className="size-5" />
                </button>
              );
            })}
          </div>
          {items.length >= max && (
            <p className="text-sm text-fg-muted">
              You can add up to {max} {max === 1 ? "profile" : "profiles"}.
            </p>
          )}
        </div>
      )}
      render={(item, update, i) => (
        <div className="flex items-start gap-3">
          <SocialIcon network={item.network} className="mt-9 size-5 shrink-0 text-fg-muted" />
          <div className="min-w-0 flex-1">
            <TextField
              label={socialLabel(item.network)}
              value={item.url}
              onChange={(url) => update({ url })}
              path={`socials.${i}.url`}
              errors={errors}
              placeholder={item.network === "website" ? "example.com" : "Profile link or @handle"}
            />
          </div>
        </div>
      )}
    />
  );
}

// The Business page's ready-made buttons: their text and icon; the owner adds the link.
const PRESETS = [
  { name: "Google review", label: "Leave a Google review", icon: "review" },
  { name: "Yelp", label: "Review us on Yelp", icon: "review" },
  { name: "Book now", label: "Book now", icon: "book" },
  { name: "Order online", label: "Order online", icon: "order" },
] as const;

export function HoursField({
  hours,
  onChange,
  errors,
}: {
  hours: DayHours[];
  onChange: (hours: DayHours[]) => void;
  errors: ErrorsApi;
}) {
  const update = (i: number, patch: Partial<DayHours>) =>
    onChange(hours.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Opening hours</legend>
      {hours.map((h, i) => (
        <div key={DAY_NAMES[i]} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex w-32 items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={h.open}
                onChange={(event) => update(i, { open: event.target.checked })}
                className="size-4 accent-primary"
              />
              {DAY_NAMES[i]}
            </label>
            {h.open ? (
              <>
                <input
                  type="time"
                  aria-label={`${DAY_NAMES[i]} opens`}
                  value={h.from}
                  onChange={(event) => update(i, { from: event.target.value })}
                  className="h-10 rounded-control border border-field-border bg-surface px-2 text-sm text-fg"
                />
                <span className="text-fg-muted">–</span>
                <input
                  type="time"
                  aria-label={`${DAY_NAMES[i]} closes`}
                  value={h.to}
                  onChange={(event) => update(i, { to: event.target.value })}
                  className="h-10 rounded-control border border-field-border bg-surface px-2 text-sm text-fg"
                />
                {!(h.from2 || h.to2) && (
                  <button
                    type="button"
                    aria-label={`Add second hours for ${DAY_NAMES[i]}`}
                    onClick={() => update(i, { from2: "13:00", to2: "17:00" })}
                    className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-sm font-medium text-primary focus-ring hover:bg-surface-2 sm:min-h-0 sm:py-2"
                  >
                    <Plus aria-hidden className="size-4" /> Add hours
                  </button>
                )}
              </>
            ) : (
              <span className="text-sm text-fg-muted">Closed</span>
            )}
          </div>
          {/* A second range the same day, like a lunch break (spec item 17). */}
          {h.open && (h.from2 || h.to2) && (
            <div className="flex flex-wrap items-center gap-2 sm:pl-34">
              <input
                type="time"
                aria-label={`${DAY_NAMES[i]} opens again`}
                value={h.from2}
                onChange={(event) => update(i, { from2: event.target.value })}
                className="h-10 rounded-control border border-field-border bg-surface px-2 text-sm text-fg"
              />
              <span className="text-fg-muted">–</span>
              <input
                type="time"
                aria-label={`${DAY_NAMES[i]} closes again`}
                value={h.to2}
                onChange={(event) => update(i, { to2: event.target.value })}
                className="h-10 rounded-control border border-field-border bg-surface px-2 text-sm text-fg"
              />
              <button
                type="button"
                aria-label={`Remove second hours for ${DAY_NAMES[i]}`}
                onClick={() => update(i, { from2: "", to2: "" })}
                className="inline-flex min-h-11 items-center rounded-control px-2 text-sm font-medium text-fg-muted focus-ring hover:bg-surface-2 sm:min-h-0 sm:py-2"
              >
                Remove
              </button>
            </div>
          )}
          {errors.error(`hours.${i}`) && (
            <p className="text-sm text-danger">{errors.error(`hours.${i}`)}</p>
          )}
        </div>
      ))}
    </fieldset>
  );
}

/** IANA time zones from the browser, with the user's own first. */
export function TimeZoneField({
  value,
  onChange,
  error,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
}) {
  const zones = (() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC"];
    }
  })();
  return (
    <Field label="Time zone" error={error} hint={hint}>
      {(control) => (
        <Select
          {...control}
          data-field="timeZone"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {!value && <option value="">Choose…</option>}
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
