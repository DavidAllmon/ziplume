"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Tone = "success" | "error";
/** A button on the toast, such as Undo. */
export interface ToastAction {
  label: string;
  onAction: () => void;
}
interface ToastMessage {
  id: number;
  message: string;
  tone: Tone;
  action?: ToastAction;
}

const ToastContext = createContext<(message: string, tone?: Tone, action?: ToastAction) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) => setToasts((current) => current.filter((t) => t.id !== id)),
    [],
  );
  const show = useCallback(
    (message: string, tone: Tone = "success", action?: ToastAction) => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-2), { id, message, tone, action }]);
      // A toast with an action stays a little longer, so there's time to use it.
      window.setTimeout(() => dismiss(id), action ? 6000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        data-toasts
        className="pointer-events-none fixed inset-x-0 bottom-[calc(max(var(--tabbar-h)+var(--actionbar-h),env(safe-area-inset-bottom))+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-full border border-border bg-fg px-4 py-2.5 text-sm font-medium text-bg shadow-pop"
          >
            {toast.tone === "success" ? (
              <CheckCircle2 aria-hidden className="size-4 shrink-0 text-success-soft" />
            ) : (
              <CircleAlert aria-hidden className="size-4 shrink-0 text-danger-soft" />
            )}
            <span className="truncate">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.onAction();
                  dismiss(toast.id);
                }}
                className="-mr-1 ml-1 min-h-8 shrink-0 rounded-full px-2 font-semibold text-bg underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
