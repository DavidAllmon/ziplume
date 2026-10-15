export type DeviceId = "phone" | "tablet" | "desktop";

interface Device {
  label: string;
  /** The screen's real size in CSS px. */
  width: number;
  height: number;
  /** The frame drawn around the screen. */
  chrome: { x: number; top: number; bottom: number };
}

export const DEVICES: Record<DeviceId, Device> = {
  phone: { label: "Phone", width: 390, height: 844, chrome: { x: 12, top: 12, bottom: 12 } },
  tablet: { label: "Tablet", width: 820, height: 1180, chrome: { x: 16, top: 16, bottom: 16 } },
  // A browser window: a thin edge and an address bar on top.
  desktop: { label: "Desktop", width: 1280, height: 800, chrome: { x: 1, top: 37, bottom: 1 } },
};

export const DEVICE_IDS = Object.keys(DEVICES) as DeviceId[];

/** The frame's full size, screen plus chrome, before scaling. */
export function outerSize(device: DeviceId) {
  const { width, height, chrome } = DEVICES[device];
  return { width: width + chrome.x * 2, height: height + chrome.top + chrome.bottom };
}

/** How much to shrink the frame so it fits the box: never above 1, never zero. */
export function fitScale(device: DeviceId, box: { width: number; height: number }): number {
  const outer = outerSize(device);
  const scale = Math.min(1, box.width / outer.width, box.height / outer.height);
  return Math.max(scale, 0.05);
}
