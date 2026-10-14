import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import type { QrCodeRow } from "@/types/supabase";

/** A saved code as the database returns it: a trackable link unless overridden. Tests only. */
export function savedRow(overrides: Partial<QrCodeRow> = {}): QrCodeRow {
  return {
    id: "c1",
    user_id: "u1",
    name: "Spring menu",
    qr_type: "url",
    content: { url: "https://example.com/menu" },
    design: { ...DEFAULT_DESIGN, fgColor: "#123456" },
    is_dynamic: true,
    slug: "SPRING",
    destination: "https://example.com/menu",
    status: "active",
    scan_count: 0,
    last_scanned_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    folder_id: null,
    active_from: null,
    active_until: null,
    has_password: false,
    is_private: false,
    ...overrides,
  } as unknown as QrCodeRow;
}
