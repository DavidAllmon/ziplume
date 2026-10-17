"use client";

import { DIET, newDish } from "@/lib/pages/menu";
import { LIMITS, type MenuItem, type MenuPage } from "@/lib/pages/types";

import { AreaField, MediaField, MoreOptions, rowName, ShowSwitch, TextField } from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
import type { EditorProps } from "./shared";

/** What a dish's More options holds, for its closed button: "Photo, Vegan, 2 prices". */
const dishSummary = (item: MenuItem) =>
  [
    item.photo && "Photo",
    ...DIET.filter((d) => item.labels.includes(d.id)).map((d) => d.label),
    item.tags.trim() && "Notes",
    item.options.length &&
      `${item.options.length} ${item.options.length === 1 ? "price" : "prices"}`,
  ]
    .filter(Boolean)
    .join(", ");

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
              <TextField
                path={`sections.${s}.description`}
                errors={errors}
                label="Section description"
                optional
                placeholder="Served all day"
                value={section.description}
                onChange={(description) => update({ description })}
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
                off={(item) => !item.on}
                rowActions={(item, updateItem, i) => (
                  <ShowSwitch
                    checked={item.on}
                    onChange={(on) => updateItem({ on })}
                    label={`Show ${rowName("item", item.name, i)} on the page`}
                  />
                )}
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
                        hint={item.options.length ? "Your price options show instead" : undefined}
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
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <label className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-0">
                        <input
                          type="checkbox"
                          className="size-5 accent-primary"
                          checked={item.soldOut}
                          onChange={(event) => updateItem({ soldOut: event.target.checked })}
                        />
                        Sold out
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-0">
                        <input
                          type="checkbox"
                          className="size-5 accent-primary"
                          checked={item.popular}
                          onChange={(event) => updateItem({ popular: event.target.checked })}
                        />
                        Popular
                      </label>
                    </div>
                    <MoreOptions
                      name={rowName("item", item.name, i)}
                      summary={dishSummary(item)}
                      problem={item.options.some(
                        (_, o) =>
                          errors.error(`sections.${s}.items.${i}.options.${o}.label`) ||
                          errors.error(`sections.${s}.items.${i}.options.${o}.price`),
                      )}
                    >
                      <MediaField
                        label="Photo"
                        kind="image"
                        maxSide={800}
                        hint="Shown as a small square; tapping it shows it full size."
                        value={item.photo}
                        onChange={(photo) => updateItem({ photo })}
                      />
                      <fieldset className="flex flex-col gap-2">
                        <legend className="mb-1 text-sm font-medium text-fg">Dietary labels</legend>
                        <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
                          {DIET.map((d) => (
                            <label
                              key={d.id}
                              className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-9"
                            >
                              <input
                                type="checkbox"
                                className="size-5 accent-primary"
                                checked={item.labels.includes(d.id)}
                                onChange={(event) =>
                                  updateItem({
                                    // In the list's order, whatever order they're ticked in.
                                    labels: DIET.filter((x) =>
                                      x.id === d.id
                                        ? event.target.checked
                                        : item.labels.includes(x.id),
                                    ).map((x) => x.id),
                                  })
                                }
                              />
                              {d.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <TextField
                        path={`sections.${s}.items.${i}.tags`}
                        errors={errors}
                        label="Other notes"
                        optional
                        hint="Anything the labels don’t cover, like contains egg"
                        value={item.tags}
                        onChange={(tags) => updateItem({ tags })}
                      />
                      <SortableList
                        label="Price options"
                        items={item.options}
                        onChange={(options) => updateItem({ options })}
                        max={LIMITS.options}
                        addLabel="Add price option"
                        addAt="end"
                        newRowFocus="input[data-field$='.label']"
                        path={`sections.${s}.items.${i}.options`}
                        errors={errors}
                        itemLabel={(o, k) => rowName("option", o.label, k)}
                        newItem={() => ({ label: "", price: "" })}
                        render={(o, updateOption, k) => (
                          <div className="grid grid-cols-[1fr_6rem] gap-3">
                            <TextField
                              path={`sections.${s}.items.${i}.options.${k}.label`}
                              errors={errors}
                              label="Option name"
                              placeholder="Small"
                              value={o.label}
                              onChange={(label) => updateOption({ label })}
                            />
                            <TextField
                              path={`sections.${s}.items.${i}.options.${k}.price`}
                              errors={errors}
                              label="Option price"
                              inputMode="decimal"
                              placeholder="8"
                              value={o.price}
                              onChange={(price) => updateOption({ price })}
                            />
                          </div>
                        )}
                      />
                    </MoreOptions>
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
