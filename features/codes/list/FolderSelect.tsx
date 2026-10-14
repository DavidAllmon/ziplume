"use client";

import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { withWorkspace } from "@/components/app/nav";
import { IconButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/inputs";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { createFolder, MAX_FOLDER_NAME } from "@/features/folders/api";
import type { FolderRow } from "@/types/supabase";

import { announceCodesChanged } from "./events";

/** Folders on phones, where the sidebar (and its folder list) is hidden. */
export function FolderSelect({
  folders,
  current,
  ownerId,
  teamId,
  canEdit,
}: {
  folders: FolderRow[];
  /** The folder being shown, or null for all codes. */
  current: string | null;
  ownerId: string;
  teamId: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const selectId = useId();
  const [naming, setNaming] = useState(false);
  const open = (folderId: string) =>
    router.push(withWorkspace(folderId ? `/codes?folder=${folderId}` : "/codes", teamId));

  async function create(name: string): Promise<string | void> {
    const result = await createFolder(ownerId, name);
    if (!result.ok) return result.error;
    setNaming(false);
    announceCodesChanged();
    open(result.value.id);
  }

  return (
    <div className="flex items-end gap-2 sm:hidden">
      <div className="min-w-0 flex-1">
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-fg">
          Folder
        </label>
        <Select id={selectId} value={current ?? ""} onChange={(e) => open(e.target.value)}>
          <option value="">All codes</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </Select>
      </div>
      {canEdit && (
        <IconButton label="New folder" variant="outline" onClick={() => setNaming(true)}>
          <FolderPlus aria-hidden />
        </IconButton>
      )}
      <PromptDialog
        open={naming}
        title="New folder"
        label="Folder name"
        confirmLabel="Create folder"
        maxLength={MAX_FOLDER_NAME}
        onSubmit={create}
        onClose={() => setNaming(false)}
      />
    </div>
  );
}
