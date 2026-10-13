"use client";

import { Image as ImageIcon, Palette, RotateCcw, ScanLine, Shapes } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

import type { DesignState, GeneratorAction } from "../state/types";
import { ColorsSection } from "./ColorsSection";
import { EC_LEVELS, ErrorCorrectionSection } from "./ErrorCorrectionSection";
import { LogoSection } from "./LogoSection";
import { DOT_STYLES, ShapeSection } from "./ShapeSection";

interface StyleCardProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

function Swatches({ design }: { design: DesignState }) {
  return (
    <span
      className="flex items-center"
      aria-label={`${design.fgColor} on ${design.transparent ? "transparent" : design.bgColor}`}
    >
      <span
        className="size-5 rounded-full border-2 border-surface"
        style={{ background: design.fgColor }}
      />
      <span
        className={`-ml-1.5 size-5 rounded-full ring-2 ring-surface outline outline-1 outline-border ${design.transparent ? "bg-checker" : ""}`}
        style={design.transparent ? undefined : { background: design.bgColor }}
      />
    </span>
  );
}

export function StyleCard({ design, dispatch }: StyleCardProps) {
  return (
    <Card aria-labelledby="style-heading">
      <CardHeader
        id="style-heading"
        step={2}
        title="Make it yours"
        description="Colors, shapes and a logo. Everything updates live."
        action={
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "resetDesign" })}>
            <RotateCcw aria-hidden />
            <span className="max-sm:sr-only">Reset</span>
          </Button>
        }
      />
      <div className="mt-4">
        <Section
          title="Colors"
          icon={<Palette />}
          summary={<Swatches design={design} />}
          defaultOpen
        >
          <ColorsSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="Shape"
          icon={<Shapes />}
          summary={DOT_STYLES.find((s) => s.value === design.dotStyle)?.label}
        >
          <ShapeSection design={design} dispatch={dispatch} />
        </Section>
        <Section title="Logo" icon={<ImageIcon />} summary={design.logo ? "Added" : "None"}>
          <LogoSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="Error correction"
          icon={<ScanLine />}
          summary={EC_LEVELS.find((l) => l.value === design.errorCorrection)?.label}
        >
          <ErrorCorrectionSection design={design} dispatch={dispatch} />
        </Section>
      </div>
    </Card>
  );
}
