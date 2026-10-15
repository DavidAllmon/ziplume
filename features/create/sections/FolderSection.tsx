"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/inputs";
import type { FolderRow } from "@/types/supabase";

/** The Settings tab's folder: where the code is filed. */
export function FolderSection({
  folderId,
  folders,
  onChange,
}: {
  folderId: string | null;
  folders: FolderRow[];
  onChange: (folderId: string | null) => void;
}) {
  return (
    // Not labelled by its heading: "Folder" belongs to the select, for screen readers and tests.
    <Card>
      <CardHeader title="Folder" />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <Field label="Folder">
          {(control) => (
            <Select
              {...control}
              value={folderId ?? ""}
              onChange={(event) => onChange(event.target.value || null)}
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
