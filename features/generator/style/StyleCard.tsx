"use client";

import {
  Frame,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  RotateCcw,
  ScanLine,
  Shapes,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

import type { DesignState, GeneratorAction } from "../state/types";
import { ColorsSection } from "./ColorsSection";
import { EC_LEVELS, ErrorCorrectionSection } from "./ErrorCorrectionSection";
import { FRAME_STYLES, FrameSection } from "./FrameSection";
import { LogoSection } from "./LogoSection";
import { DOT_STYLES, ShapeSection } from "./ShapeSection";
import { TemplatesSection } from "./TemplatesSection";
import { LOGO_ICONS } from "@/lib/qr/logo-icons";

interface StyleCardProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

function Swatches({ design }: { design: DesignState }) {
  return (
    <span className="flex items-center">
      <span className="sr-only">
        {design.fgColor} on {design.transparent ? "transparent" : design.bgColor}
      </span>
      <span
        aria-hidden
        className="size-5 rounded-full border border-field-border"
        style={{
          background:
            design.gradientType === "none"
              ? design.fgColor
              : `linear-gradient(135deg, ${design.fgColor}, ${design.gradientColor})`,
        }}
      />
      <span
        aria-hidden
        className={`-ml-1.5 size-5 rounded-full border border-field-border ${design.transparent ? "bg-checker" : ""}`}
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
        description="Colors, shapes, a frame and a logo. Everything updates live."
        action={
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "resetDesign" })}>
            <RotateCcw aria-hidden />
            <span className="max-sm:sr-only">Reset</span>
          </Button>
        }
      />
      <div className="mt-4">
        <Section title="Styles" icon={<LayoutTemplate />} summary="Quick styles & templates">
          <TemplatesSection design={design} dispatch={dispatch} />
        </Section>
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
        <Section
          title="Frame"
          icon={<Frame />}
          summary={FRAME_STYLES.find((f) => f.value === design.frame)?.label}
        >
          <FrameSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="Logo"
          icon={<ImageIcon />}
          summary={
            design.logo
              ? "Your image"
              : design.logoIcon
                ? `${LOGO_ICONS.find((i) => i.id === design.logoIcon)?.label} icon`
                : "None"
          }
        >
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
