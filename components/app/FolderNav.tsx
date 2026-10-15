"use client";

import { FolderPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PromptDialog } from "@/components/ui/PromptDialog";
import { announceCodesChanged, CODES_CHANGED } from "@/features/codes/list/events";
import { createFolder, MAX_FOLDER_NAME } from "@/features/folders/api";
import { cn } from "@/lib/cn";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { withWorkspace } from "./nav";

interface FolderCounts {
  ownerId: string;
  total: number;
  folders: { id: string; name: string; count: number }[];
}

const folderLinkClass =
  "flex min-h-9 items-center gap-2 rounded-control px-2.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg aria-[current=true]:bg-surface-2 aria-[current=true]:font-semibold aria-[current=true]:text-fg focus-ring max-sm:min-h-11";

/** "All codes" and each folder (with counts) under Codes in the sidebar; one click filters. */
export function FolderNav({
  ownerId,
  teamId,
  canEdit,
  expanded,
  onNavigate,
}: {
  ownerId: string;
  teamId: string | null;
  canEdit: boolean;
  /** False on the collapsed tablet rail, where the folder list is hidden. */
  expanded: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<FolderCounts | null>(null);
  const [version, setVersion] = useState(0);
  const [naming, setNaming] = useState(false);
  const onCodes = pathname === "/codes";
  const currentFolder = onCodes ? searchParams.get("folder") : null;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    void Promise.all([
      supabase.from("folders").select("id, name").eq("user_id", ownerId).order("name"),
      supabase.from("qr_codes").select("folder_id").eq("user_id", ownerId),
    ]).then(([folders, codes]) => {
      if (!active) return;
      const counts = new Map<string, number>();
      for (const code of codes.data ?? []) {
        if (code.folder_id) counts.set(code.folder_id, (counts.get(code.folder_id) ?? 0) + 1);
      }
      setData({
        ownerId,
        total: codes.data?.length ?? 0,
        folders: (folders.data ?? []).map((f) => ({ ...f, count: counts.get(f.id) ?? 0 })),
      });
    });
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(CODES_CHANGED, onChange);
    return () => {
      active = false;
      window.removeEventListener(CODES_CHANGED, onChange);
    };
  }, [ownerId, version, pathname]);

  const shown = data?.ownerId === ownerId ? data : null;

  async function create(name: string): Promise<string | void> {
    const result = await createFolder(ownerId, name);
    if (!result.ok) return result.error;
    setNaming(false);
    announceCodesChanged();
    onNavigate();
    router.push(withWorkspace(`/codes?folder=${result.value.id}`, teamId));
  }

  return (
    <div className={cn("flex flex-col", !expanded && "rail:hidden")}>
      <ul aria-label="Folders" className="ml-4 flex flex-col gap-0.5 border-l border-border pl-2">
        <li>
          <Link
            href={withWorkspace("/codes", teamId)}
            aria-current={onCodes && !currentFolder ? "true" : undefined}
            onClick={onNavigate}
            className={folderLinkClass}
          >
            <span className="min-w-0 flex-1 truncate">All codes</span>
            <span className="tabular-nums">{shown?.total ?? ""}</span>
          </Link>
        </li>
        {shown?.folders.map((folder) => (
          <li key={folder.id}>
            <Link
              href={withWorkspace(`/codes?folder=${folder.id}`, teamId)}
              aria-current={currentFolder === folder.id ? "true" : undefined}
              onClick={onNavigate}
              className={folderLinkClass}
            >
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              <span className="tabular-nums">{folder.count}</span>
            </Link>
          </li>
        ))}
        {canEdit && (
          <li>
            <button
              type="button"
              onClick={() => setNaming(true)}
              className={cn(folderLinkClass, "w-full")}
            >
              <FolderPlus aria-hidden className="size-4" /> New folder
            </button>
          </li>
        )}
      </ul>
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
