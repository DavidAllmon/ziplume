"use client";

import { type CouponPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField } from "../fields";
import { Appearance, type EditorProps } from "./shared";

export function CouponEditor({ page, set, errors }: EditorProps<CouponPage>) {
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
