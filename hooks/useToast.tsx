"use client";

import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (rawMessage: string, type: ToastType = "info") => {
      let message = rawMessage;
      if (message.toLowerCase().includes("failed to fetch")) {
        message =
          "Connection error. Please check your internet connection and try again.";
      }

      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 z-[100] flex flex-col items-center md:items-end gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 md:px-5 py-3 md:py-4 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto backdrop-blur-md min-w-[280px] md:min-w-[320px] max-w-[90vw] flex items-start gap-3 ${
              toast.type === "error"
                ? "bg-missed-subtle/90 border border-missed text-missed"
                : toast.type === "success"
                  ? "bg-done-subtle/90 border border-done text-done"
                  : "bg-surface-raised/90 border border-border-strong text-primary"
            }`}
          >
            {toast.type === "error" && (
              <svg
                className="shrink-0 w-5 h-5 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {toast.type === "success" && (
              <svg
                className="shrink-0 w-5 h-5 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {toast.type === "info" && (
              <svg
                className="shrink-0 w-5 h-5 mt-0.5 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <div className="flex-1 leading-snug">{toast.message}</div>

            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="shrink-0 p-1 -mr-2 -mt-1 opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function useSuccessToast() {
  const { showToast } = useToast();
  return useCallback(
    (message: string) => {
      showToast(message, "success");
    },
    [showToast],
  );
}
