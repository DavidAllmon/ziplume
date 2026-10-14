import { readFileSync } from "node:fs";

// Test-only accounts for the disposable local Supabase; never used anywhere else.
export const AUTH_DIR = "e2e/accounts/.auth";
export const SEED_FILE = `${AUTH_DIR}/seed.json`;

export const OWNER = {
  email: "owner@example.com",
  password: "owner-e2e-pass-2026",
  name: "Olivia Owner",
  state: `${AUTH_DIR}/owner.json`,
};

export const VIEWER = {
  email: "viewer@example.com",
  password: "viewer-e2e-pass-2026",
  name: "Victor Viewer",
  state: `${AUTH_DIR}/viewer.json`,
};

/** Creates codes in the Create tests, so the owner's seeded list stays as the other tests expect. */
export const MAKER = {
  email: "maker@example.com",
  password: "maker-e2e-pass-2026",
  name: "Max Maker",
  state: `${AUTH_DIR}/maker.json`,
};

export interface Seed {
  ownerId: string;
  viewerId: string;
  /** The owner's "Spring menu" trackable code. */
  menuId: string;
  /** The owner's "Flyers" folder, holding the Wi-Fi code. */
  folderId: string;
  /** The Maker account, and its empty "Posters" folder. */
  makerId: string;
  makerFolderId: string;
}

/** Ids created by the global setup. Read it inside tests, not at import time. */
export function seed(): Seed {
  return JSON.parse(readFileSync(SEED_FILE, "utf8")) as Seed;
}
