"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ToastProvider>{children}</ToastProvider>
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
