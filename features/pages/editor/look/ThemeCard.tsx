"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useDismissToast, useToast } from "@/components/ui/Toast";
import { LookSketch } from "@/features/pages/look/LookSketch";
import {
  applyTheme,
  sameLook,
  THEME_IDS,
  THEMES,
  type LookChange,
  type PageLook,
  type ThemeId,
} from "@/lib/pages/look";

interface ThemePick {
  before: PageLook;
  after: PageLook;
}

/** Nine themes; picking one sets the wallpaper, font, text and buttons, with Undo (spec 6.1). */
export function ThemeCard({
  look,
  onLook,
}: {
  look: PageLook;
  onLook: (change: LookChange) => void;
}) {
  const toast = useToast();
  const dismissToast = useDismissToast();
  const tiles = useRef<HTMLDivElement>(null);
  // The theme picks Undo can step back through, latest last. Arrow keys pick a theme on every
  // step, so one Undo at a time can get back to a look from before the browsing.
  const [picks, setPicks] = useState<ThemePick[]>([]);
  // Any other change to the look ends them.
  const latest = picks.at(-1);
  const undoable = latest !== undefined && sameLook(latest.after, look);

  useEffect(() => {
    if (!undoable) dismissToast("theme");
  }, [undoable, dismissToast]);
  useEffect(() => () => dismissToast("theme"), [dismissToast]);

  const undo = (pick: ThemePick) => {
    // Only the look goes back, and only if nothing else changed it since; content stays.
    onLook((current) => (sameLook(current, pick.after) ? pick.before : current));
    setPicks((current) => (current.at(-1) === pick ? current.slice(0, -1) : current));
    dismissToast("theme");
    // When the Undo used goes away, keep focus on the theme picked now.
    requestAnimationFrame(() => {
      if (document.activeElement !== document.body) return;
      tiles.current
        ?.querySelector<HTMLElement>("[role='radio'][aria-checked='true']")
        ?.focus({ preventScroll: true });
    });
  };
  const pick = (theme: ThemeId) => {
    const next = { before: look, after: applyTheme(look, theme) };
    onLook(next.after);
    setPicks([...(undoable ? picks : []), next].slice(-20));
    toast(
      `Theme set to ${THEMES[theme].label}`,
      "success",
      { label: "Undo", onAction: () => undo(next) },
      "theme",
    );
  };
  return (
    <Card aria-labelledby="look-theme">
      <CardHeader
        id="look-theme"
        title="Theme"
        description="Sets the wallpaper, font and buttons in one go."
        action={
          <div className="flex gap-2">
            {undoable && (
              <Button
                variant="outline"
                size="sm"
                aria-label="Undo theme"
                onClick={() => undo(latest)}
              >
                Undo
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLook(applyTheme(look, look.theme))}
            >
              Reset to theme
            </Button>
          </div>
        }
      />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <RadioGroup
          ref={tiles}
          value={look.theme}
          onChange={pick}
          aria-label="Theme"
          className="grid grid-cols-3 gap-2"
        >
          {THEME_IDS.map((id) => (
            <Radio
              key={id}
              value={id}
              aria-label={THEMES[id].label}
              className="flex min-h-11 cursor-pointer flex-col gap-1.5 rounded-control border border-border p-1.5 text-center data-checked:border-primary data-checked:ring-2 data-checked:ring-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
            >
              <LookSketch look={applyTheme(look, id)} header="none" className="h-16" />
              <span className="text-[13px] font-medium text-fg">{THEMES[id].label}</span>
            </Radio>
          ))}
        </RadioGroup>
      </div>
    </Card>
  );
}
