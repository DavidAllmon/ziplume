/** Fired after codes or folders change, so the sidebar's folder counts refresh. */
export const CODES_CHANGED = "quickqreate:codes-changed";

export function announceCodesChanged() {
  window.dispatchEvent(new Event(CODES_CHANGED));
}
