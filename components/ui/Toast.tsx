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
  key?: string;
}
/** Shows a toast; a later toast with the same `key` replaces it. */
type Show = (message: string, tone?: Tone, action?: ToastAction, key?: string) => void;

const ToastContext = createContext<Show>(() => {});
const DismissContext = createContext<(key: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** Closes the toast shown with this key, such as an Undo that no longer applies. */
export function useDismissToast() {
  return useContext(DismissContext);
}

// A toast with an action stays a little longer, so there's time to use it.
const lifetime = (toast: ToastMessage) => (toast.action ? 6000 : 3500);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);
  const schedule = useCallback(
    (toast: ToastMessage) => {
      window.clearTimeout(timers.current.get(toast.id));
      timers.current.set(
        toast.id,
        window.setTimeout(() => dismiss(toast.id), lifetime(toast)),
      );
    },
    [dismiss],
  );
  // While the pointer or focus is on a toast it stays, so its action can be reached (WCAG 2.2.1).
  const hold = (toast: ToastMessage) => window.clearTimeout(timers.current.get(toast.id));
  const show = useCallback<Show>(
    (message, tone = "success", action, key) => {
      const toast = { id: ++nextId.current, message, tone, action, key };
      setToasts((current) => [
        ...current.filter((t) => key === undefined || t.key !== key).slice(-2),
        toast,
      ]);
      schedule(toast);
    },
    [schedule],
  );
  const dismissKey = useCallback(
    (key: string) => setToasts((current) => current.filter((t) => t.key !== key)),
    [],
  );

  return (
    <ToastContext.Provider value={show}>
      <DismissContext.Provider value={dismissKey}>{children}</DismissContext.Provider>
      <div
        role="status"
        aria-live="polite"
        data-toasts
        className="pointer-events-none fixed inset-x-0 bottom-[calc(max(var(--tabbar-h)+var(--actionbar-h),env(safe-area-inset-bottom))+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onMouseEnter={() => hold(toast)}
            onMouseLeave={(event) => {
              if (!event.currentTarget.contains(document.activeElement)) schedule(toast);
            }}
            onFocus={() => hold(toast)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) schedule(toast);
            }}
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
