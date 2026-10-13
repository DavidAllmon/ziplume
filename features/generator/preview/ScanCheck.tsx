import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import type { ScanReport } from "@/lib/qr/scannability";

const STATUS = {
  empty: {
    icon: CircleDashed,
    text: "Waiting for content",
    className: "bg-surface-2 text-fg-muted",
  },
  ok: { icon: CheckCircle2, text: "Ready to scan", className: "bg-accent text-accent-fg" },
  warn: {
    icon: AlertTriangle,
    text: "Scannable, with tips",
    className: "bg-warning-soft text-warning",
  },
  error: { icon: XCircle, text: "May not scan", className: "bg-danger-soft text-danger" },
} as const;

export function ScanBadge({ report, className }: { report: ScanReport; className?: string }) {
  const { icon: Icon, className: tone } = STATUS[report.status];
  const text =
    report.status === "ok" && report.verified ? "Verified scannable" : STATUS[report.status].text;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
      {text}
    </span>
  );
}

export function ScanIssues({ report }: { report: ScanReport }) {
  if (!report.issues.length) return null;
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-fg-muted">
      {report.issues.map((issue) => (
        <li key={issue.id} className="flex gap-2">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-1.5 shrink-0 rounded-full",
              issue.severity === "error" ? "bg-danger" : "bg-warning",
            )}
          />
          <span>
            <span className="sr-only">{issue.severity === "error" ? "Problem: " : "Tip: "}</span>
            {issue.message}
          </span>
        </li>
      ))}
    </ul>
  );
}
