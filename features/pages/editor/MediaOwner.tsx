"use client";

import { createContext } from "react";

/** The workspace owner whose folder page uploads go into; null = the signed-in user. */
export const MediaOwnerContext = createContext<string | null>(null);
