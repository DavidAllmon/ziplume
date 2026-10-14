"use client";

import { AccentField, type ErrorsApi } from "../fields";

export interface EditorProps<T> {
  page: T;
  set: (patch: Partial<T>) => void;
  errors: ErrorsApi;
}

export function Appearance({
  color,
  set,
}: {
  color: string;
  set: (patch: { color: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-5">
      <AccentField value={color} onChange={(value) => set({ color: value })} />
    </div>
  );
}
