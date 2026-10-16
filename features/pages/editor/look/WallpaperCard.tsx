"use client";

import { Loader2, Upload } from "lucide-react";
import { useContext, useId, useRef, useState } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { ColorField } from "@/components/ui/ColorField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Slider } from "@/components/ui/Slider";
import { MediaOwnerContext } from "@/features/pages/editor/MediaOwner";
import { ACCEPT, uploadMedia } from "@/features/pages/editor/upload";
import { averageColor } from "@/features/pages/look/average";
import { mix } from "@/features/pages/look/resolve";
import type { LookChange, PageLook, Wallpaper } from "@/lib/pages/look";

import { Swatches } from "./Swatches";

const COLORS = [
  "#F6F5F1",
  "#FFFFFF",
  "#F3E8D8",
  "#FCE7F3",
  "#E0F2FE",
  "#14532D",
  "#0A1330",
  "#070B1A",
  "#7C2D12",
  "#881337",
];

/** The wallpaper's first color, whatever its kind. */
const mainColor = (w: Wallpaper) =>
  w.kind === "solid" ? w.color : w.kind === "gradient" ? w.from : w.color;

/** Color, Gradient or Photo (spec 6.1). */
export function WallpaperCard({
  look,
  onLook,
}: {
  look: PageLook;
  onLook: (change: LookChange) => void;
}) {
  const inputId = useId();
  const ownerId = useContext(MediaOwnerContext);
  const w = look.wallpaper;
  // Picking Photo shows the upload; the wallpaper changes once a photo is in.
  const [wantPhoto, setWantPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Counts uploads, so one still running is dropped when another wallpaper is picked.
  const uploads = useRef(0);
  const kind = wantPhoto ? "image" : w.kind;
  const set = (wallpaper: Wallpaper) => onLook({ ...look, wallpaper });

  function pickKind(next: Wallpaper["kind"]) {
    setProblem(null);
    if (next === "image") {
      setWantPhoto(w.kind !== "image");
      return;
    }
    uploads.current++;
    setBusy(false);
    setWantPhoto(false);
    const color = mainColor(w);
    if (next === "solid") set({ kind: "solid", color });
    else if (w.kind !== "gradient") {
      set({ kind: "gradient", from: color, to: mix(color, "#000000", 0.35), direction: "down" });
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    const run = ++uploads.current;
    setBusy(true);
    setProblem(null);
    const [average, result] = await Promise.all([
      averageColor(file),
      uploadMedia(file, "image", { maxSide: 2400, ownerId }),
    ]);
    if (run !== uploads.current) return;
    setBusy(false);
    if (!result.ok) {
      setProblem(result.error);
      return;
    }
    setWantPhoto(false);
    const image = result.media;
    // From the latest look: other changes made while it uploaded stay.
    onLook((latest) => ({
      ...latest,
      wallpaper: { kind: "image", image, dim: 30, color: average ?? mainColor(latest.wallpaper) },
    }));
  }

  return (
    <Card aria-labelledby="look-wallpaper">
      <CardHeader id="look-wallpaper" title="Wallpaper" />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <SegmentedControl
          aria-label="Wallpaper"
          size="touch"
          value={kind}
          onChange={pickKind}
          options={[
            { value: "solid", label: "Color" },
            { value: "gradient", label: "Gradient" },
            { value: "image", label: "Photo" },
          ]}
        />
        {kind === "solid" && w.kind === "solid" && (
          <>
            <Swatches
              name="Wallpaper"
              colors={COLORS}
              value={w.color}
              onPick={(color) => set({ kind: "solid", color })}
            />
            <div className="max-w-56">
              <ColorField
                label="Wallpaper color"
                value={w.color}
                onChange={(color) => set({ kind: "solid", color })}
              />
            </div>
          </>
        )}
        {kind === "gradient" && w.kind === "gradient" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Top color"
                value={w.from}
                onChange={(from) => set({ ...w, from })}
              />
              <ColorField label="Bottom color" value={w.to} onChange={(to) => set({ ...w, to })} />
            </div>
            <SegmentedControl
              aria-label="Direction"
              size="touch"
              value={w.direction}
              onChange={(direction) => set({ ...w, direction })}
              options={[
                { value: "down", label: "Down" },
                { value: "diagonal", label: "Diagonal" },
                { value: "across", label: "Across" },
              ]}
            />
          </>
        )}
        {kind === "image" && (
          <>
            <label
              htmlFor={inputId}
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border-2 border-dashed border-field-border px-4 py-4 text-sm font-semibold text-fg hover:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
            >
              {busy ? (
                <Loader2 aria-hidden className="size-5 animate-spin" />
              ) : (
                <Upload aria-hidden className="size-5" />
              )}
              {busy ? "Uploading…" : w.kind === "image" ? "Replace photo" : "Upload a photo"}
              <input
                id={inputId}
                type="file"
                accept={ACCEPT.image}
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  void upload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {problem && (
              <p role="alert" className="text-sm text-danger">
                {problem}
              </p>
            )}
            {w.kind === "image" && (
              <Slider
                label="Darken"
                value={w.dim}
                min={0}
                max={80}
                step={5}
                onChange={(dim) => set({ ...w, dim })}
                formatValue={(value) => `${value}%`}
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
}
