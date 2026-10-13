"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { IconButton } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";

export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextInput {...props} type={visible ? "text" : "password"} className="pr-12" />
      <IconButton
        label={visible ? "Hide password" : "Show password"}
        size="icon-sm"
        className="absolute top-1 right-1"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </IconButton>
    </div>
  );
}
