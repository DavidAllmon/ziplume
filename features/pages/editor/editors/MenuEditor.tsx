"use client";

import { newDish } from "@/lib/pages/menu";
import { LIMITS, type MenuPage } from "@/lib/pages/types";

import { AreaField, MediaField, rowName, TextField } from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
import type { EditorProps } from "./shared";

export function MenuEditor({ page, set, errors }: EditorProps<MenuPage>) {
  return (
    <>
      <FormCard title="Header" note="At the top of your page">
        <MediaField
          label="Logo"
          kind="image"
          maxSide={512}
          value={page.logo}
          onChange={(logo) => set({ logo })}
        />
        <TextField
          label="Restaurant name"
          value={page.name}
          onChange={(name) => set({ name })}
          path="name"
          errors={errors}
        />
        <AreaField
          path="description"
          errors={errors}
          label="Description"
          value={page.description}
          onChange={(description) => set({ description })}
        />
      </FormCard>
      <FormCard title="Sections and dishes">
        <SortableList
          label="Sections"
          showLabel={false}
          items={page.sections}
          onChange={(sections) => set({ sections })}
          max={LIMITS.sections}
          addLabel="Add section"
          addAt="end"
          path="sections"
          errors={errors}
          itemLabel={(section, s) => rowName("section", section.name, s)}
          newItem={() => ({ name: "", description: "", items: [newDish()] })}
          render={(section, update, s) => (
            <>
              <TextField
                path={`sections.${s}.name`}
                errors={errors}
                label="Section name"
                value={section.name}
                onChange={(name) => update({ name })}
                placeholder="Mains"
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
                newItem={newDish}
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
                        path={`sections.${s}.items.${i}.price`}
                        errors={errors}
                        label="Price"
                        value={item.price}
                        onChange={(price) => updateItem({ price })}
                        inputMode="decimal"
                        placeholder="12"
                      />
                    </div>
                    <TextField
                      path={`sections.${s}.items.${i}.description`}
                      errors={errors}
                      label="Description"
                      optional
                      value={item.description}
                      onChange={(description) => updateItem({ description })}
                    />
                    <TextField
                      path={`sections.${s}.items.${i}.tags`}
                      errors={errors}
                      label="Tags"
                      optional
                      hint="Comma separated, e.g. vegan, gluten-free"
                      value={item.tags}
                      onChange={(tags) => updateItem({ tags })}
                    />
                  </>
                )}
              />
            </>
          )}
        />
      </FormCard>
      <FormCard title="Currency and note">
        <div className="max-w-32">
          <TextField
            path="currency"
            errors={errors}
            label="Currency"
            value={page.currency}
            onChange={(currency) => set({ currency })}
            placeholder="$"
          />
        </div>
        <AreaField
          path="note"
          errors={errors}
          label="Note"
          value={page.note}
          onChange={(note) => set({ note })}
          placeholder="Prices include tax. Ask us about allergens."
        />
      </FormCard>
    </>
  );
}
