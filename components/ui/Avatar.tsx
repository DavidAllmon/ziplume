"use client";

import { useState } from "react";

import { avatarColors, initialsOf, trustedAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: "size-8 text-[13px]",
  md: "size-9 text-sm",
  lg: "size-16 text-xl",
} as const;

interface AvatarProps {
  /** Stable id (user id, or an email for people without an account) that picks the color. */
  id: string;
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * A person's photo, or their initials on a color when there is no usable photo. It is
 * decorative: the name always appears next to it.
 */
export function Avatar({ id, name, email, src, size = "md", className }: AvatarProps) {
  const url = trustedAvatarUrl(src);
  const [failed, setFailed] = useState<string | null>(null);

  if (url && failed !== url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photos come from Storage or Google
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(url)}
        className={cn("shrink-0 rounded-full bg-surface-2 object-cover", SIZES[size], className)}
      />
    );
  }
  const colors = avatarColors(id);
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold select-none",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {initialsOf(name, email)}
    </span>
  );
}
