"use client";

import { type EventPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField, TimeZoneField, ToggleField } from "../fields";
import type { EditorProps } from "./shared";

export function EventEditor({ page, set, errors }: EditorProps<EventPage>) {
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
    </>
  );
}
