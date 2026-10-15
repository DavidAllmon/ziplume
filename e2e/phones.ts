import { devices, type Project } from "@playwright/test";

/** Only the phone layout suite runs on these. */
export const PHONE_SPEC = /phone-layout\.spec\.ts$/;

/** Phone sizes the layout must hold on: three iPhones and the smallest SE on WebKit (Safari and
 * Chrome on iPhone both use it), two Androids on Chromium. Heights are the visible area. */
export const PHONES: Project[] = [
  { name: "iPhone SE (1st gen)", use: { ...devices["iPhone SE"] } },
  { name: "iPhone SE", use: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } } },
  { name: "iPhone 15", use: { ...devices["iPhone 15"] } },
  { name: "iPhone 15 Pro Max", use: { ...devices["iPhone 15 Pro Max"] } },
  { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
  { name: "Galaxy S8", use: { ...devices["Galaxy S8"] } },
].map((project) => ({ ...project, testMatch: PHONE_SPEC }));
