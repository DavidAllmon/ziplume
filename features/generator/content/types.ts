import type { ContentValues, QrTypeId } from "@/lib/qr/types";

export interface FormProps<K extends QrTypeId> {
  values: ContentValues[K];
  onChange: (field: keyof ContentValues[K] & string, value: string | boolean) => void;
}
