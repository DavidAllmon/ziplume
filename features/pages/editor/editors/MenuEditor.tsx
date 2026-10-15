"use client";

import { LIMITS, type MenuPage } from "@/lib/pages/types";

import { AreaField, MediaField, rowName, TextField } from "../fields";
import { SortableList } from "../sortable/SortableList";
import type { EditorProps } from "./shared";

export function MenuEditor({ page, set, errors }: EditorProps<MenuPage>) {
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
      <SortableList
        label="Sections"
        items={page.sections}
        onChange={(sections) => set({ sections })}
        max={LIMITS.sections}
        addLabel="Add section"
        addAt="end"
        path="sections"
        errors={errors}
        itemLabel={(section, s) => rowName("section", section.name, s)}
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
            <SortableList
              label="Dishes and drinks"
              items={section.items}
              onChange={(items) => update({ items })}
              max={LIMITS.items}
              addLabel="Add item"
              addAt="end"
              path={`sections.${s}.items`}
              errors={errors}
              itemLabel={(item, i) => rowName("item", item.name, i)}
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
    </>
  );
}
