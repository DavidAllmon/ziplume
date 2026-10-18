"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Copy, MoreHorizontal, Pencil, Plus, SquarePen, Star, StarOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { menuItemClass, menuPanelClass } from "@/components/app/nav";
import { PageHeader } from "@/components/app/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { useToast } from "@/components/ui/Toast";
import { sanitizeDesign } from "@/features/generator/state/sanitize";
import { DesignPreview } from "@/features/generator/style/TemplatesSection";
import type { DesignTemplateRow } from "@/types/supabase";

import { deleteTemplate, duplicateTemplate, renameTemplate, setDefaultTemplate } from "./api";

/** Saved designs (redesign spec 4.5). One can be the default that every new code starts from. */
export function TemplatesPage({ templates: initial }: { templates: DesignTemplateRow[] }) {
  const toast = useToast();
  const router = useRouter();
  // After each change the server's copy of this page is refreshed too, so Back can't show it stale.
  const refresh = () => router.refresh();
  const [templates, setTemplates] = useState(initial);
  const [renaming, setRenaming] = useState<DesignTemplateRow | null>(null);
  const [deleting, setDeleting] = useState<DesignTemplateRow | null>(null);
  const [pending, setPending] = useState(false);

  async function makeDefault(template: DesignTemplateRow | null) {
    const result = await setDefaultTemplate(template?.id ?? null);
    if (!result.ok) return toast(result.error, "error");
    setTemplates((list) => list.map((t) => ({ ...t, is_default: t.id === template?.id })));
    refresh();
    toast(
      template ? `New codes now start from “${template.name}”` : "New codes now start from Classic",
    );
  }

  async function duplicate(template: DesignTemplateRow) {
    const result = await duplicateTemplate(template);
    if (!result.ok) return toast(result.error, "error");
    setTemplates((list) => [result.value, ...list]);
    refresh();
    toast(`Duplicated as “${result.value.name}”`);
  }

  async function rename(name: string) {
    if (!renaming) return;
    const result = await renameTemplate(renaming.id, name);
    if (!result.ok) return result.error;
    setTemplates((list) => list.map((t) => (t.id === renaming.id ? result.value : t)));
    // The dialog leaves closing to its caller, so it can stay open with an error.
    setRenaming(null);
    refresh();
  }

  async function remove() {
    if (!deleting) return;
    setPending(true);
    const result = await deleteTemplate(deleting.id);
    setPending(false);
    if (!result.ok) return toast(result.error, "error");
    setTemplates((list) => list.filter((t) => t.id !== deleting.id));
    refresh();
    toast(`Deleted “${deleting.name}”`);
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Templates"
        description="Saved designs. Your default one starts every new code."
        actions={
          <Link href="/templates/new" className={buttonClasses("primary")}>
            <Plus aria-hidden /> New template
          </Link>
        }
      />
      {templates.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-fg-muted">
          No templates yet. Make one here, or save a code’s design from its Design section.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {templates.map((template) => (
            <li
              key={template.id}
              aria-label={template.name}
              className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface p-2.5 sm:p-3"
            >
              <DesignPreview design={sanitizeDesign(template.design)} />
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 pt-1">
                  <p className="truncate text-sm font-semibold text-fg">{template.name}</p>
                  {template.is_default && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-fg">
                      <Star aria-hidden className="size-3" /> Default
                    </p>
                  )}
                </div>
                <Menu as="div" className="relative shrink-0">
                  <MenuButton
                    aria-label={`Actions for ${template.name}`}
                    className="grid size-11 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg data-focus:outline-2 data-focus:outline-ring sm:size-9"
                  >
                    <MoreHorizontal aria-hidden className="size-5" />
                  </MenuButton>
                  <MenuItems
                    anchor={{ to: "bottom end", gap: 4 }}
                    transition
                    className={menuPanelClass}
                  >
                    <MenuItem>
                      <Link href={`/templates/${template.id}/edit`} className={menuItemClass}>
                        <SquarePen aria-hidden /> Edit
                      </Link>
                    </MenuItem>
                    <MenuItem>
                      {template.is_default ? (
                        <button
                          type="button"
                          className={menuItemClass}
                          onClick={() => void makeDefault(null)}
                        >
                          <StarOff aria-hidden /> Stop using as default
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={menuItemClass}
                          onClick={() => void makeDefault(template)}
                        >
                          <Star aria-hidden /> Set as default
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      <button
                        type="button"
                        className={menuItemClass}
                        onClick={() => setRenaming(template)}
                      >
                        <Pencil aria-hidden /> Rename
                      </button>
                    </MenuItem>
                    <MenuItem>
                      <button
                        type="button"
                        className={menuItemClass}
                        onClick={() => void duplicate(template)}
                      >
                        <Copy aria-hidden /> Duplicate
                      </button>
                    </MenuItem>
                    <MenuItem>
                      <button
                        type="button"
                        className={menuItemClass}
                        onClick={() => setDeleting(template)}
                      >
                        <Trash2 aria-hidden /> Delete
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PromptDialog
        open={renaming !== null}
        title="Rename template"
        label="Name"
        initialValue={renaming?.name ?? ""}
        confirmLabel="Rename"
        maxLength={60}
        onSubmit={rename}
        onClose={() => setRenaming(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description={
          deleting?.is_default
            ? "It’s your default, so new codes will start from Classic. Codes already made with it don’t change."
            : "Codes already made with it don’t change."
        }
        confirmLabel="Delete template"
        danger
        pending={pending}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
