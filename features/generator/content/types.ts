import type { PageContentMap } from "@/lib/pages/types";
import type { ContentValues, PageTypeId, QrTypeId } from "@/lib/qr/types";

import type { GeneratorState } from "../state/types";

export interface FormProps<K extends QrTypeId> {
  values: ContentValues[K];
  onChange: (field: keyof ContentValues[K] & string, value: string | boolean) => void;
}

/** What the content forms need, so the generator and the Create page can both use them. */
export interface ContentEditor {
  state: Pick<GeneratorState, "activeType" | "content" | "pages">;
  setField: (qrType: QrTypeId, field: string, value: string | boolean) => void;
  setPage: (type: PageTypeId, content: PageContentMap[PageTypeId]) => void;
  pageErrors: Record<string, string>;
  /** Hosted-page media is stored in this workspace; null = the signed-in person's own. */
  workspace: { ownerId: string } | null;
  /** Show every page error now, not only once a field has been left (after "Show me"). */
  revealErrors?: boolean;
}
