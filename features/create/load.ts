import { initialState } from "@/features/generator/state/defaults";
import { generatorReducer } from "@/features/generator/state/reducer";
import { readUtm, withUtm, type UtmParams } from "@/lib/dynamic/utm";
import { isPageType, isStaticType, type CodeTypeId } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

import { DEFAULT_SETTINGS, type CreateState } from "./state";
import { isoToLocalInput } from "@/lib/time/local";

const NO_UTM: UtmParams = { source: "", medium: "", campaign: "", term: "", content: "" };

export { isoToLocalInput };

/** A trackable link's saved address, split into the link and its campaign tags. */
export function splitDestination(destination: string): { url: string; utm: UtmParams } {
  const utm = readUtm(destination);
  if (!Object.values(utm).some(Boolean)) return { url: destination, utm: { ...NO_UTM } };
  try {
    return { url: withUtm(destination, NO_UTM), utm };
  } catch {
    return { url: destination, utm: { ...NO_UTM } };
  }
}

/** Types the editor can open. A code saved with any other type stays on its code page. */
export const isEditableType = (type: string): type is CodeTypeId =>
  isStaticType(type) || isPageType(type);

/**
 * A saved code as editor state, so the Create editor can open it. Check isEditableType first.
 * Dates come out in this browser's time zone, so call it in the browser, not on the server.
 */
export function fromSavedCode(row: QrCodeRow): CreateState {
  const type = row.qr_type as CodeTypeId;
  const link = row.is_dynamic && type === "url";
  const { url, utm } = link
    ? splitDestination(row.destination ?? "")
    : { url: "", utm: { ...NO_UTM } };
  const loaded = generatorReducer(initialState(), {
    type: "loadCode",
    qrType: type,
    content: link ? { url } : row.content,
    design: row.design,
  });
  const code = { ...loaded, name: row.name };
  return {
    code,
    settings: {
      ...DEFAULT_SETTINGS,
      trackable: row.is_dynamic,
      startsAt: isoToLocalInput(row.active_from),
      endsAt: isoToLocalInput(row.active_until),
      slug: row.slug ?? "",
      utm,
      isPrivate: row.is_private,
    },
    folderId: row.folder_id,
    styleDesign: code.design,
  };
}
