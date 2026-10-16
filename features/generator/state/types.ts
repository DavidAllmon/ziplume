import type { PageLook } from "@/lib/pages/look";
import type { PageContentMap } from "@/lib/pages/types";
import type {
  CodeTypeId,
  ContentValues,
  CornerDotStyle,
  CornerStyle,
  DotStyle,
  ErrorCorrection,
  ExportFormat,
  FrameStyle,
  GradientType,
  PageTypeId,
  QrTypeId,
} from "@/lib/qr/types";

export type { CornerDotStyle, CornerStyle, DotStyle, ExportFormat, FrameStyle, GradientType };

export interface DesignState {
  fgColor: string;
  bgColor: string;
  transparent: boolean;
  /** Blend the code color into gradientColor; "none" keeps a solid color. */
  gradientType: GradientType;
  gradientColor: string;
  /** Direction of a linear gradient in degrees (0 = left to right). */
  gradientAngle: number;
  /** Color of the three corner frames; null uses the code color. */
  cornerColor: string | null;
  /** Color of the corner centers; null uses the corner color. */
  cornerDotColor: string | null;
  dotStyle: DotStyle;
  cornerStyle: CornerStyle;
  cornerDotStyle: CornerDotStyle;
  errorCorrection: ErrorCorrection;
  /** An uploaded logo as a data URL. */
  logo: string | null;
  /** A built-in icon used as the logo instead of an upload (drawn in the code color). */
  logoIcon: string | null;
  /** Logo width as a fraction of the code width. */
  logoSize: number;
  /** Clear the modules behind the logo so it sits on a clean background. */
  logoClearSpace: boolean;
  /** A frame around the code with a call to action such as "Scan me". */
  frame: FrameStyle;
  frameText: string;
  frameColor: string;
}

export interface ExportSettings {
  format: ExportFormat;
  size: number;
}

export interface GeneratorState {
  activeType: CodeTypeId;
  content: ContentValues;
  /** Hosted page drafts, one per page type. */
  pages: PageContentMap;
  design: DesignState;
  exportSettings: ExportSettings;
  /** Error correction the user had before a logo forced it to High; restored on removal. */
  ecBeforeLogo: ErrorCorrection | null;
  /** The name typed for the code (empty means "use the suggested name"). */
  name: string;
}

export type GeneratorAction =
  | { type: "setActiveType"; activeType: CodeTypeId }
  | { type: "setPage"; pageType: PageTypeId; content: PageContentMap[PageTypeId] }
  /** Changes a page's look from its latest content, so a late upload or Undo keeps newer edits. */
  | { type: "setLook"; pageType: PageTypeId; update: (look: PageLook) => PageLook }
  /** Changes a page from its latest content, so an upload that finishes later keeps newer edits. */
  | {
      type: "updatePage";
      pageType: PageTypeId;
      update: (page: PageContentMap[PageTypeId]) => PageContentMap[PageTypeId];
    }
  | {
      type: "setField";
      qrType: QrTypeId;
      field: string;
      value: string | boolean;
    }
  | { type: "setDesign"; patch: Partial<Omit<DesignState, "logo" | "logoIcon">> }
  | { type: "setLogo"; logo: string | null }
  | { type: "setLogoIcon"; icon: string | null }
  /** Replace the whole design (a template), keeping error correction high enough for its logo. */
  | { type: "applyDesign"; design: unknown }
  | { type: "swapColors" }
  | { type: "setExport"; patch: Partial<ExportSettings> }
  | { type: "resetDesign" }
  | { type: "setName"; name: string }
  /** Start a brand-new code: every setting back to its default. */
  | { type: "reset" }
  /** Load a saved code (from the dashboard) into the generator for editing. */
  | { type: "loadCode"; qrType: CodeTypeId; content: unknown; design: unknown };
