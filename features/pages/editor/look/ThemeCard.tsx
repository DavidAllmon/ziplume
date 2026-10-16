"use client";

import { Radio, RadioGroup } from "@headlessui/react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { LookSketch } from "@/features/pages/look/LookSketch";
import { applyTheme, THEME_IDS, THEMES, type PageLook, type ThemeId } from "@/lib/pages/look";

/** Nine themes; picking one sets the wallpaper, font, text and buttons, with Undo (spec 6.1). */
export function ThemeCard({ look, onLook }: { look: PageLook; onLook: (look: PageLook) => void }) {
  const toast = useToast();
  const pick = (theme: ThemeId) => {
    const before = look;
    onLook(applyTheme(look, theme));
    toast(`Theme set to ${THEMES[theme].label}`, "success", {
      label: "Undo",
      onAction: () => onLook(before),
    });
  };
  return (
    <Card aria-labelledby="look-theme">
      <CardHeader
        id="look-theme"
        title="Theme"
        description="Sets the wallpaper, font and buttons in one go."
        action={
          <Button variant="outline" size="sm" onClick={() => onLook(applyTheme(look, look.theme))}>
            Reset to theme
          </Button>
        }
      />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <RadioGroup
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
