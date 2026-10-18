"use client";

import { LIMITS, type EventPage } from "@/lib/pages/types";

import { AreaField, MediaField, rowName, TextField, TimeZoneField, ToggleField } from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
import type { EditorProps } from "./shared";

export function EventEditor({ page, set, errors }: EditorProps<EventPage>) {
  return (
    <>
      <FormCard title="Header" note="At the top of your page">
        <MediaField
          label="Image"
          kind="image"
          value={page.image}
          onChange={(image) => set({ image })}
        />
        <TextField
          label="Event name"
          value={page.title}
          onChange={(title) => set({ title })}
          path="title"
          errors={errors}
        />
        <TextField
          path="organizer"
          errors={errors}
          label="Organizer"
          optional
          value={page.organizer}
          onChange={(organizer) => set({ organizer })}
        />
      </FormCard>
      <FormCard title="When">
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
          />
          <TextField
            label="Ends"
            optional
            type="datetime-local"
            value={page.end}
            onChange={(end) => set({ end })}
            path="end"
            errors={errors}
          />
        </div>
        <TimeZoneField
          value={page.timeZone}
          onChange={(timeZone) => set({ timeZone })}
          error={errors.error("timeZone")}
        />
      </FormCard>
      <FormCard title="Where">
        <ToggleField
          label="Online event"
          description="Adds a Join button that works from 15 minutes before the start"
          checked={page.online}
          onChange={(online) => set({ online })}
        />
        {page.online && (
          <TextField
            label="Join link"
            type="url"
            inputMode="url"
            value={page.joinUrl}
            onChange={(joinUrl) => set({ joinUrl })}
            path="joinUrl"
            errors={errors}
            placeholder="zoom.us/j/…"
          />
        )}
        <TextField
          path="location"
          errors={errors}
          label="Location"
          optional
          hint={page.online ? "Leave empty for an online-only event" : undefined}
          value={page.location}
          onChange={(location) => set({ location })}
          placeholder="Venue name and address"
        />
      </FormCard>
      <FormCard title="Details">
        <AreaField
          path="description"
          errors={errors}
          label="Description"
          value={page.description}
          onChange={(description) => set({ description })}
          rows={4}
        />
      </FormCard>
      <FormCard title="Agenda">
        <SortableList
          label="Agenda"
          showLabel={false}
          items={page.agenda}
          onChange={(agenda) => set({ agenda })}
          max={LIMITS.agenda}
          addLabel="Add agenda item"
          addAt="end"
          newRowFocus="input[data-field$='.title']"
          path="agenda"
          errors={errors}
          itemLabel={(item, i) => rowName("agenda item", item.title, i)}
          newItem={() => ({ time: "", title: "", note: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <TextField
                  path={`agenda.${i}.time`}
                  errors={errors}
                  label="Time"
                  optional
                  type="time"
                  value={item.time}
                  onChange={(time) => update({ time })}
                />
                <TextField
                  path={`agenda.${i}.title`}
                  errors={errors}
                  label="What’s happening"
                  placeholder="Doors open"
                  value={item.title}
                  onChange={(title) => update({ title })}
                />
              </div>
              <TextField
                path={`agenda.${i}.note`}
                errors={errors}
                label="Note"
                optional
                value={item.note}
                onChange={(note) => update({ note })}
              />
            </div>
          )}
        />
      </FormCard>
      <FormCard title="Hosts and speakers">
        <SortableList
          label="Hosts and speakers"
          showLabel={false}
          items={page.hosts}
          onChange={(hosts) => set({ hosts })}
          max={LIMITS.hosts}
          addLabel="Add host"
          addAt="end"
          newRowFocus="input[data-field$='.name']"
          path="hosts"
          errors={errors}
          itemLabel={(item, i) => rowName("host", item.name, i)}
          newItem={() => ({ photo: null, name: "", role: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <MediaField
                label="Photo"
                kind="image"
                round
                maxSide={400}
                value={item.photo}
                onChange={(photo) => update({ photo })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  path={`hosts.${i}.name`}
                  errors={errors}
                  label="Name"
                  value={item.name}
                  onChange={(name) => update({ name })}
                />
                <TextField
                  path={`hosts.${i}.role`}
                  errors={errors}
                  label="Role"
                  optional
                  placeholder="Keynote speaker"
                  value={item.role}
                  onChange={(role) => update({ role })}
                />
              </div>
            </div>
          )}
        />
      </FormCard>
      <FormCard title="Tickets">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            path="ticketLabel"
            errors={errors}
            label="Ticket button text"
            optional
            value={page.ticketLabel}
            onChange={(ticketLabel) => set({ ticketLabel })}
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
          />
        </div>
      </FormCard>
      <FormCard title="RSVPs">
        <ToggleField
          label="RSVP form"
          description="Visitors tell you they’re coming, with how many guests. You’ll find the list on this code’s page."
          checked={page.rsvp}
          onChange={(rsvp) => set({ rsvp })}
        />
        {page.rsvp && (
          <TextField
            path="rsvpCapacity"
            errors={errors}
            label="Places"
            optional
            inputMode="numeric"
            placeholder="50"
            hint="The most guests in all. Leave it empty for no limit."
            value={page.rsvpCapacity}
            onChange={(rsvpCapacity) => set({ rsvpCapacity })}
          />
        )}
      </FormCard>
    </>
  );
}
