import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-primary text-primary-fg shadow-sm hover:bg-primary-hover",
  secondary: "bg-surface-2 text-fg hover:bg-border",
  outline: "border border-border bg-surface text-fg hover:bg-surface-2",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "size-11",
  "icon-sm": "size-9",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap focus-ring transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-[1.15em] [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
  );
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClasses(variant, size), className)} {...props} />;
}

interface IconButtonProps extends ButtonProps {
  /** Icon-only buttons must have an accessible name. */
  label: string;
}

export function IconButton({ label, size = "icon", variant = "ghost", ...props }: IconButtonProps) {
  return <Button aria-label={label} title={label} size={size} variant={variant} {...props} />;
}
