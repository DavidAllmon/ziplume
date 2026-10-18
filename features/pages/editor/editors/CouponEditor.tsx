"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { type CouponPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField, ToggleField } from "../fields";
import { FormCard } from "../FormCard";
import { Labeled } from "../Labeled";
import type { EditorProps } from "./shared";

export function CouponEditor({ page, set, errors }: EditorProps<CouponPage>) {
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
          path="business"
          errors={errors}
          label="Business"
          optional
          value={page.business}
          onChange={(business) => set({ business })}
        />
      </FormCard>
      <FormCard title="Offer">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Offer"
            value={page.offer}
            onChange={(offer) => set({ offer })}
            path="offer"
            errors={errors}
            placeholder="20% OFF"
          />
          <TextField
            path="code"
            errors={errors}
            label="Coupon code"
            optional
            value={page.code}
            onChange={(code) => set({ code })}
            placeholder="SPRING20"
          />
        </div>
        <Labeled label="Show the code as">
          <SegmentedControl
            aria-label="Show the code as"
            size="touch"
            value={page.scan}
            onChange={(scan) => set({ scan })}
            options={[
              { value: "text", label: "Text" },
              { value: "qr", label: "QR code" },
              { value: "barcode", label: "Barcode" },
            ]}
          />
        </Labeled>
        {page.scan !== "text" && (
          <p className="text-sm text-fg-muted">
            Shown with the code, for scanning at the till. Turn your screen brightness up.
          </p>
        )}
        <TextField
          path="headline"
          errors={errors}
          label="Headline"
          optional
          value={page.headline}
          onChange={(headline) => set({ headline })}
          placeholder="On your next visit"
        />
        <TextField
          path="badge"
          errors={errors}
          label="Badge"
          optional
          placeholder="NEW"
          hint="A short stamp on the coupon’s corner"
          value={page.badge}
          onChange={(badge) => set({ badge })}
        />
        <AreaField
          path="description"
          errors={errors}
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
        />
      </FormCard>
      <FormCard title="At the till">
        <ToggleField
          label="Mark as used button"
          description="Each phone can mark the coupon used once. You’ll see how many were used on this code’s page."
          checked={page.markUsed}
          onChange={(markUsed) => set({ markUsed })}
        />
      </FormCard>
      <FormCard title="Button">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            path="buttonLabel"
            errors={errors}
            label="Button text"
            optional
            value={page.buttonLabel}
            onChange={(buttonLabel) => set({ buttonLabel })}
            placeholder="Shop now"
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
          />
        </div>
      </FormCard>
      <FormCard title="Terms">
        <AreaField
          path="terms"
          errors={errors}
          label="Terms and conditions"
          value={page.terms}
          onChange={(terms) => set({ terms })}
        />
      </FormCard>
    </>
  );
}
