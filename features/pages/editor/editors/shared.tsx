"use client";

import type { ErrorsApi } from "../fields";

export interface EditorProps<T> {
  page: T;
  set: (patch: Partial<T>) => void;
  errors: ErrorsApi;
}
