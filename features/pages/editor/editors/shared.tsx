"use client";

import type { ErrorsApi } from "../fields";

export interface EditorProps<T> {
  page: T;
  /** A patch, or a patch made from the latest page (for uploads that finish later). */
  set: (patch: Partial<T> | ((page: T) => Partial<T>)) => void;
  errors: ErrorsApi;
}
