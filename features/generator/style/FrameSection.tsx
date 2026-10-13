"use client";

import { ColorField } from "@/components/ui/ColorField";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import type { FrameStyle } from "@/lib/qr/types";

import { FRAME_TEXT_SUGGESTIONS, MAX_FRAME_TEXT } from "../state/defaults";
import { cleanFrameText } from "../state/sanitize";
import type { DesignState, GeneratorAction } from "../state/types";
import { OptionTiles } from "./OptionTiles";
import { FrameIcon } from "./ShapeIcons";

export const FRAME_STYLES = [
  { value: "none", label: "None" },
  { value: "bottom", label: "Label below" },
  { value: "top", label: "Label above" },
  { value: "badge", label: "Badge" },
  { value: "bubble", label: "Bubble" },
] as const satisfies readonly { value: FrameStyle; label: string }[];

interface FrameSectionProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

export function FrameSection({ design, dispatch }: FrameSectionProps) {
  const setDesign = (patch: Partial<DesignState>) => dispatch({ type: "setDesign", patch });
  return (
    <>
      <OptionTiles
        label="Frame"
        value={design.frame}
        onChange={(frame) => setDesign({ frame })}
        options={FRAME_STYLES.map((o) => ({ ...o, icon: <FrameIcon style={o.value} /> }))}
        className="grid-cols-3 sm:grid-cols-5"
      />
      {design.frame !== "none" && (
        <>
          <Field
            label="Call to action"
            hint={`${design.frameText.length}/${MAX_FRAME_TEXT} characters. Leave empty for a plain frame.`}
          >
            {(control) => (
              <TextInput
                {...control}
                value={design.frameText}
                maxLength={MAX_FRAME_TEXT}
                onChange={(event) => setDesign({ frameText: cleanFrameText(event.target.value) })}
              />
            )}
          </Field>
          <div role="group" aria-label="Suggestions" className="-mt-2 flex flex-wrap gap-2">
            {FRAME_TEXT_SUGGESTIONS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => setDesign({ frameText: text })}
                aria-pressed={design.frameText === text}
                className="h-8 rounded-full border border-border px-3 text-sm text-fg-muted focus-ring transition-colors hover:border-field-border hover:text-fg aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-fg"
              >
                {text}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Frame color"
              value={design.frameColor}
              onChange={(frameColor) => setDesign({ frameColor })}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setDesign({ frameColor: design.cornerColor ?? design.fgColor })}
                className="h-11 rounded-control px-2 text-sm font-medium text-link underline-offset-4 focus-ring hover:underline"
              >
                Match code color
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
