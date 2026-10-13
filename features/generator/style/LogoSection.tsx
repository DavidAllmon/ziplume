"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { createElement, useId, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";
import { LOGO_ACCEPT, loadLogo, validateLogoFile } from "@/lib/image/logo";
import { LOGO_ICONS } from "@/lib/qr/logo-icons";

import { MAX_LOGO_SIZE, MIN_LOGO_SIZE } from "../state/defaults";
import type { DesignState, GeneratorAction } from "../state/types";

interface LogoSectionProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

/** A preset icon drawn from its 24×24 outline data. */
function PresetIcon({ nodes }: { nodes: (typeof LOGO_ICONS)[number]["nodes"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {nodes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

function IconPicker({ design, dispatch }: LogoSectionProps) {
  return (
    <div role="group" aria-label="Icons" className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {LOGO_ICONS.map((icon) => {
        const active = design.logoIcon === icon.id;
        return (
          <button
            key={icon.id}
            type="button"
            aria-pressed={active}
            aria-label={`${icon.label} icon`}
            title={icon.label}
            onClick={() => dispatch({ type: "setLogoIcon", icon: active ? null : icon.id })}
            className={cn(
              "grid aspect-square place-items-center rounded-control border text-fg-muted focus-ring transition-colors hover:border-field-border hover:text-fg",
              active
                ? "border-primary bg-primary-soft text-primary-soft-fg"
                : "border-border bg-surface",
            )}
          >
            <PresetIcon nodes={icon.nodes} />
          </button>
        );
      })}
    </div>
  );
}

export function LogoSection({ design, dispatch }: LogoSectionProps) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"upload" | "icon">(design.logoIcon ? "icon" : "upload");
  const hasLogo = Boolean(design.logo || design.logoIcon);

  async function accept(file: File | undefined) {
    if (!file) return;
    const problem = validateLogoFile(file);
    setError(problem);
    if (problem) return;
    setLoading(true);
    try {
      dispatch({ type: "setLogo", logo: await loadLogo(file) });
    } catch {
      setError("That image couldn't be read. Try a PNG or JPG.");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void accept(event.dataTransfer.files[0]);
  }

  return (
    <>
      <SegmentedControl
        aria-label="Logo source"
        value={source}
        onChange={setSource}
        options={[
          { value: "upload", label: "Your image" },
          { value: "icon", label: "Icon" },
        ]}
      />
      {source === "icon" ? (
        <>
          <IconPicker design={design} dispatch={dispatch} />
          <p className="text-sm text-fg-muted">
            Icons are drawn in your code color on a tile that matches the background.
          </p>
        </>
      ) : design.logo ? (
        <div className="flex items-center gap-4 rounded-control border border-border bg-surface-2 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
          <img
            src={design.logo}
            alt="Your logo"
            className="size-14 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
          />
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <label
              htmlFor={inputId}
              className="inline-flex h-9 cursor-pointer items-center rounded-control border border-border bg-surface px-3 text-sm font-semibold text-fg focus-ring hover:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
            >
              Replace
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: "setLogo", logo: null })}
            >
              <Trash2 aria-hidden /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-control border-2 border-dashed px-4 py-7 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
            dragging ? "border-primary bg-primary-soft" : "border-field-border hover:bg-surface-2",
          )}
        >
          <ImagePlus aria-hidden className="size-7 text-primary dark:text-link" />
          <span className="text-sm font-semibold text-fg">
            {loading ? "Loading…" : "Add a logo"}
          </span>
          <span className="text-sm text-fg-muted">
            Drop an image or click to browse · PNG, JPG, SVG up to 5 MB
          </span>
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept={LOGO_ACCEPT.join(",")}
        className="sr-only"
        onChange={(event) => {
          void accept(event.target.files?.[0]);
          // Reset so picking the same file again still triggers a change.
          event.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {hasLogo && (
        <>
          <Slider
            label="Logo size"
            min={MIN_LOGO_SIZE}
            max={MAX_LOGO_SIZE}
            step={0.01}
            value={design.logoSize}
            formatValue={(value) => `${Math.round(value * 100)}%`}
            onChange={(logoSize) => dispatch({ type: "setDesign", patch: { logoSize } })}
          />
          <Toggle
            label="Clear space behind logo"
            description="Removes the pattern under the logo so it stands out."
            checked={design.logoClearSpace}
            onChange={(logoClearSpace) =>
              dispatch({ type: "setDesign", patch: { logoClearSpace } })
            }
          />
          {design.errorCorrection === "H" && (
            <p className="rounded-control bg-primary-soft px-3 py-2.5 text-sm text-primary-soft-fg">
              Error correction is set to High so the code still scans with your logo on top.
            </p>
          )}
        </>
      )}
    </>
  );
}
