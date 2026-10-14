"use client";

import {
  Frame,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  RotateCcw,
  Shapes,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import type { DesignState, GeneratorAction } from "@/features/generator/state/types";
import { ColorsSection } from "@/features/generator/style/ColorsSection";
import {
  EC_LEVELS,
  ErrorCorrectionSection,
} from "@/features/generator/style/ErrorCorrectionSection";
import { FRAME_STYLES, FrameSection } from "@/features/generator/style/FrameSection";
import { LogoSection } from "@/features/generator/style/LogoSection";
import { DOT_STYLES, ShapeSection } from "@/features/generator/style/ShapeSection";
import { Swatches } from "@/features/generator/style/StyleCard";
import { TemplatesSection } from "@/features/generator/style/TemplatesSection";
import { LOGO_ICONS } from "@/lib/qr/logo-icons";

/** Step 3: start from a style, then colors, shape, logo and frame (several can be open). */
export function DesignSection({
  design,
  dispatch,
  onResetToStyle,
}: {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
  onResetToStyle: () => void;
}) {
  const logo = design.logo
    ? "Your image"
    : design.logoIcon
      ? `${LOGO_ICONS.find((icon) => icon.id === design.logoIcon)?.label} icon`
      : "None";
  return (
    <Card aria-labelledby="design-heading">
      <CardHeader
        id="design-heading"
        step={3}
        title="Design"
        description="Start from a style, then make it yours. The preview updates as you go."
        action={
          <Button variant="ghost" size="sm" onClick={onResetToStyle}>
            <RotateCcw aria-hidden />
            <span className="max-sm:sr-only">Reset to style</span>
          </Button>
        }
      />
      <div className="mt-4">
        <Section
          title="Start from a style"
          icon={<LayoutTemplate />}
          summary="Styles and your templates"
          defaultOpen
        >
          <TemplatesSection design={design} dispatch={dispatch} />
        </Section>
        <Section title="Colors" icon={<Palette />} summary={<Swatches design={design} />}>
          <ColorsSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="Shape"
          icon={<Shapes />}
          summary={DOT_STYLES.find((style) => style.value === design.dotStyle)?.label}
        >
          <ShapeSection design={design} dispatch={dispatch} />
        </Section>
        <Section title="Logo" icon={<ImageIcon />} summary={logo}>
          <LogoSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="Frame"
          icon={<Frame />}
          summary={FRAME_STYLES.find((frame) => frame.value === design.frame)?.label}
        >
          <FrameSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="More design options"
          icon={<SlidersHorizontal />}
          summary={`Scan reliability: ${EC_LEVELS.find((level) => level.value === design.errorCorrection)?.label}`}
        >
          <p className="text-sm text-fg-muted">
            Scan reliability rises on its own when you add a logo. Change it here only if you need
            to.
          </p>
          <ErrorCorrectionSection design={design} dispatch={dispatch} />
        </Section>
      </div>
    </Card>
  );
}
