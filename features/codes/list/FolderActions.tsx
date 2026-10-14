"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { withWorkspace } from "@/components/app/nav";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteFolder, MAX_FOLDER_NAME, renameFolder } from "@/features/folders/api";
import type { FolderRow } from "@/types/supabase";

import { announceCodesChanged } from "./events";

/** Rename and Delete for the folder being shown, in the page header. */
export function FolderActions({ folder, teamId }: { folder: FolderRow; teamId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  async function rename(name: string): Promise<string | void> {
    const result = await renameFolder(folder.id, name);
    if (!result.ok) return result.error;
    setRenaming(false);
    toast(`Renamed to “${result.value.name}”`);
    announceCodesChanged();
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const result = await deleteFolder(folder.id);
    setPending(false);
    if (!result.ok) return toast(result.error, "error");
    setDeleting(false);
    toast(`Deleted the folder “${folder.name}”`);
    announceCodesChanged();
    router.push(withWorkspace("/codes", teamId));
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setRenaming(true)}>
        <Pencil aria-hidden /> Rename folder
      </Button>
      <Button variant="ghost" onClick={() => setDeleting(true)}>
        <Trash2 aria-hidden /> Delete folder
      </Button>
      <PromptDialog
        open={renaming}
        title="Rename folder"
        label="Folder name"
        initialValue={folder.name}
        confirmLabel="Rename"
        maxLength={MAX_FOLDER_NAME}
        onSubmit={rename}
        onClose={() => setRenaming(false)}
      />
      <ConfirmDialog
        open={deleting}
        title={`Delete the folder “${folder.name}”?`}
        description="The codes in it aren’t deleted. They move out of the folder."
        confirmLabel="Delete folder"
        danger
        pending={pending}
        onConfirm={remove}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}
