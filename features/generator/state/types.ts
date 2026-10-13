import type {
  ContentValues,
  CornerStyle,
  DotStyle,
  ErrorCorrection,
  ExportFormat,
  QrTypeId,
} from "@/lib/qr/types";

export type { CornerStyle, DotStyle, ExportFormat };

export interface DesignState {
  fgColor: string;
  bgColor: string;
  transparent: boolean;
  dotStyle: DotStyle;
  cornerStyle: CornerStyle;
  errorCorrection: ErrorCorrection;
  logo: string | null;
  /** Logo width as a fraction of the code width. */
  logoSize: number;
  /** Clear the modules behind the logo so it sits on a clean background. */
  logoClearSpace: boolean;
}

export interface ExportSettings {
  format: ExportFormat;
  size: number;
}

export interface GeneratorState {
  activeType: QrTypeId;
  content: ContentValues;
  design: DesignState;
  exportSettings: ExportSettings;
  /** Error correction the user had before a logo forced it to High; restored on removal. */
  ecBeforeLogo: ErrorCorrection | null;
}

export type GeneratorAction =
  | { type: "setActiveType"; activeType: QrTypeId }
  | {
      type: "setField";
      qrType: QrTypeId;
      field: string;
      value: string | boolean;
    }
  | { type: "setDesign"; patch: Partial<Omit<DesignState, "logo">> }
  | { type: "setLogo"; logo: string | null }
  | { type: "swapColors" }
  | { type: "setExport"; patch: Partial<ExportSettings> }
  | { type: "resetDesign" }
  | { type: "hydrate"; saved: PersistedSettings };

export interface PersistedSettings {
  version: 1;
  activeType: QrTypeId;
  design: DesignState;
  exportSettings: ExportSettings;
}
