"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/inputs";
import { MAX_CODE_NAME } from "@/features/generator/state/defaults";
import type { FolderRow } from "@/types/supabase";

/** Step 5: a name (suggested from the content) and a folder (the one you came from). */
export function NameFolderSection({
  name,
  placeholder,
  onName,
  folderId,
  folders,
  onFolder,
}: {
  name: string;
  placeholder: string;
  onName: (name: string) => void;
  folderId: string | null;
  folders: FolderRow[];
  onFolder: (folderId: string | null) => void;
}) {
  return (
    <Card aria-labelledby="name-heading">
      <CardHeader id="name-heading" step={5} title="Name & folder" />
      <div className="grid gap-4 px-5 pt-4 pb-6 sm:grid-cols-2 sm:px-6">
        <Field label="Code name" hint="Leave it blank to use the suggestion.">
          {(control) => (
            <TextInput
              {...control}
              placeholder={placeholder}
              maxLength={MAX_CODE_NAME}
              value={name}
              onChange={(event) => onName(event.target.value)}
            />
          )}
        </Field>
        <Field label="Folder">
          {(control) => (
            <Select
              {...control}
              value={folderId ?? ""}
              onChange={(event) => onFolder(event.target.value || null)}
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Card>
  );
}
