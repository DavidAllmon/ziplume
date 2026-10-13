"use client";

import { InfoTip } from "@/components/ui/InfoTip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ErrorCorrection } from "@/lib/qr/types";

import type { DesignState, GeneratorAction } from "../state/types";

export const EC_LEVELS = [
  {
    value: "L",
    label: "Low",
    description: "Smallest code. Best for clean screens and short links.",
  },
  { value: "M", label: "Medium", description: "A good default for most uses." },
  { value: "Q", label: "Quartile", description: "For prints that might get scuffed or dirty." },
  { value: "H", label: "High", description: "Most robust. Use it with logos or rough surfaces." },
] as const satisfies readonly { value: ErrorCorrection; label: string; description: string }[];

interface ErrorCorrectionSectionProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

export function ErrorCorrectionSection({ design, dispatch }: ErrorCorrectionSectionProps) {
  const level = EC_LEVELS.find((l) => l.value === design.errorCorrection) ?? EC_LEVELS[1];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="text-sm font-medium text-fg">
          Error correction
        </span>
        <InfoTip label="What is error correction?">
          QR codes store extra recovery data so they still scan when part of the code is damaged or
          covered. Higher levels recover more (Low 7%, Medium 15%, Quartile 25%, High 30%) but make
          the pattern denser.
        </InfoTip>
      </div>
      <SegmentedControl
        aria-label="Error correction"
        value={design.errorCorrection}
        onChange={(errorCorrection) => dispatch({ type: "setDesign", patch: { errorCorrection } })}
        options={EC_LEVELS}
      />
      <p className="text-sm text-fg-muted" aria-live="polite">
        {level.description}
      </p>
    </div>
  );
}
