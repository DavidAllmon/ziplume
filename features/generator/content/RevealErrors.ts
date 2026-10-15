"use client";

import { createContext } from "react";

/** After "Show me": the content forms show every error, not only those of fields already left. */
export const RevealErrorsContext = createContext(false);
