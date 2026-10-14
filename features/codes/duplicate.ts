import { isHostedPage } from "@/features/dashboard/codeRender";
import type { QrCodeRow } from "@/types/supabase";

import { duplicateCode, type Result } from "./api";
import { copyCodeMedia } from "./copyMedia";

/**
 * Copies a code into your own codes. Your own code keeps its folder. A teammate's hosted page
 * gets its own copies of the page's files first, so your copy never depends on their account.
 */
export async function copyToMyCodes(
  code: QrCodeRow,
  { fromTeammate }: { fromTeammate: boolean },
): Promise<Result<QrCodeRow>> {
  let source = code;
  if (fromTeammate && isHostedPage(code)) {
    const media = await copyCodeMedia(code.id);
    if (!media.ok) return { ok: false, error: media.error };
    source = { ...code, content: media.content as QrCodeRow["content"] };
  }
  return duplicateCode(source, { keepFolder: !fromTeammate });
}
