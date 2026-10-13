"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";

const OPTIONS = [
  { value: "system", label: <Monitor aria-hidden />, ariaLabel: "Use system theme" },
  { value: "light", label: <Sun aria-hidden />, ariaLabel: "Light theme" },
  { value: "dark", label: <Moon aria-hidden />, ariaLabel: "Dark theme" },
] as const;

type ThemeChoice = (typeof OPTIONS)[number]["value"];

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render the default until hydrated.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const value = (mounted ? theme : "system") as ThemeChoice;

  return (
    <SegmentedControl
      aria-label="Color theme"
      size="sm"
      value={value}
      onChange={setTheme}
      options={OPTIONS}
      className="w-[7.5rem]"
    />
  );
}
