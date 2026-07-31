"use client";

import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/query-provider";
import { RealtimeProvider } from "@/lib/realtime-context";
import { ToastProvider } from "@/lib/toast-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>
          <RealtimeProvider>{children}</RealtimeProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
