import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/Logo";

interface AuthCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 sm:py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <LogoMark className="size-12" />
        <h1 className="font-display text-2xl font-bold tracking-tight text-balance text-fg">
          {title}
        </h1>
        {description && <p className="text-fg-muted">{description}</p>}
      </div>
      <div className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
        {children}
      </div>
      {footer && <div className="text-center text-sm text-fg-muted">{footer}</div>}
    </div>
  );
}

export function FormAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
          : "rounded-control bg-success-soft px-3.5 py-2.5 text-sm text-success"
      }
    >
      {children}
    </p>
  );
}
