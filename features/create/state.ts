import { initialState } from "@/features/generator/state/defaults";
import { generatorReducer } from "@/features/generator/state/reducer";
import type {
  DesignState,
  GeneratorAction,
  GeneratorState,
} from "@/features/generator/state/types";
import { isValidSlug } from "@/lib/dynamic/slug";
import type { UtmParams } from "@/lib/dynamic/utm";
import { isPageType, type CodeTypeId } from "@/lib/qr/types";

/** Settings for trackable codes and hosted pages, chosen while creating. */
export interface CreateSettings {
  /** Link codes only: open through a short link that can change later, with scan counts. */
  trackable: boolean;
  /** Optional, 4–128 characters. Never kept in a draft. */
  password: string;
  /** datetime-local values in the viewer's time zone; "" for no limit. */
  startsAt: string;
  endsAt: string;
  /** A chosen short-link ending; "" picks a random one. */
  slug: string;
  /** Campaign tags added to a Link's address. */
  utm: UtmParams;
  /** In a team, on your own code: only you can see it. */
  isPrivate: boolean;
}

export const DEFAULT_SETTINGS: CreateSettings = {
  trackable: true,
  password: "",
  startsAt: "",
  endsAt: "",
  slug: "",
  utm: { source: "", medium: "", campaign: "" },
  isPrivate: false,
};

export interface CreateState {
  code: GeneratorState;
  settings: CreateSettings;
  folderId: string | null;
  /** The style or template last applied; "Reset to style" returns to it. */
  styleDesign: DesignState;
}

/** What a fresh Create page starts from: the defaults plus the type and folder in the URL. */
export interface CreateDefaults {
  type: CodeTypeId;
  folderId: string | null;
  /** The person's default template (redesign spec 4.2); Classic without one. */
  design?: DesignState | null;
}

export type CreateAction =
  | { type: "code"; action: GeneratorAction }
  | { type: "settings"; patch: Partial<CreateSettings> }
  | { type: "setFolder"; folderId: string | null }
  | { type: "resetToStyle" }
  | { type: "reset"; defaults: CreateDefaults }
  | { type: "restore"; state: CreateState };

export function initialCreateState(defaults: CreateDefaults): CreateState {
  const fresh = { ...initialState(), activeType: defaults.type };
  // Applied like any template, so a template's logo raises scan reliability as it should.
  const code = defaults.design
    ? generatorReducer(fresh, { type: "applyDesign", design: defaults.design })
    : fresh;
  return {
    code,
    settings: { ...DEFAULT_SETTINGS, utm: { ...DEFAULT_SETTINGS.utm } },
    folderId: defaults.folderId,
    styleDesign: code.design,
  };
}

export function createReducer(state: CreateState, action: CreateAction): CreateState {
  switch (action.type) {
    case "code": {
      const code = generatorReducer(state.code, action.action);
      // Remember an applied style (or the plain default) so "Reset to style" can return to it.
      const styled = action.action.type === "applyDesign" || action.action.type === "resetDesign";
      return { ...state, code, styleDesign: styled ? code.design : state.styleDesign };
    }
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "setFolder":
      return { ...state, folderId: action.folderId };
    case "resetToStyle":
      return {
        ...state,
        code: { ...state.code, design: { ...state.styleDesign }, ecBeforeLogo: null },
      };
    case "reset":
      return initialCreateState(action.defaults);
    case "restore":
      return action.state;
  }
}

/** Hosted pages always are; Link codes are while Trackable is on; other types never. */
export const isTrackable = (state: CreateState) =>
  isPageType(state.code.activeType) ||
  (state.code.activeType === "url" && state.settings.trackable);

export interface SettingsErrors {
  password?: string;
  endsAt?: string;
  slug?: string;
}

/** What's wrong with the settings, field by field (empty when they can be saved). */
export function settingsErrors(
  settings: CreateSettings,
  { requireSlug = false }: { requireSlug?: boolean } = {},
): SettingsErrors {
  const errors: SettingsErrors = {};
  const { password, startsAt, endsAt, slug } = settings;
  if (password && (password.length < 4 || password.length > 128))
    errors.password = "Passwords are 4 to 128 characters";
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime())
    errors.endsAt = "The end date must be after the start date";
  if (slug && !isValidSlug(slug)) errors.slug = "Link endings use 3–40 letters, numbers or dashes";
  else if (!slug && requireSlug) errors.slug = "Every trackable code needs a link ending";
  return errors;
}

/** The first settings problem, or null. */
export const settingsProblem = (
  settings: CreateSettings,
  options?: { requireSlug?: boolean },
): string | null => Object.values(settingsErrors(settings, options))[0] ?? null;
