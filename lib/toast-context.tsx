"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ToastMessage {
  id: number;
  text: string;
  variant: "info" | "success" | "error";
}

interface ToastContextValue {
  showToast: (text: string, variant?: ToastMessage["variant"]) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (text: string, variant: ToastMessage["variant"] = "info") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, text, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`rounded px-3 py-2 text-sm font-medium shadow-md ${
              toast.variant === "success"
                ? "bg-success text-white"
                : toast.variant === "error"
                  ? "bg-danger text-white"
                  : "bg-sidebar text-white"
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
