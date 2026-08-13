"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser, UserRole } from "./types";
import {
  clearAuthSession,
  getStoredAuthUser,
  setAuthSession,
} from "./auth-cookie";
import {
  ApiError,
  loginUser,
  verifyLoginOtp,
  type LoginPayload,
} from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Password step — may require OTP next. Returns true when OTP is required. */
  beginLogin: (payload: LoginPayload) => Promise<{ requiresOtp: boolean; email: string }>;
  completeLoginOtp: (email: string, code: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(data: {
  userId: string;
  email: string;
  role: UserRole;
}): AuthUser {
  return { id: data.userId, email: data.email, role: data.role };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuthUser();
    if (stored && stored.role !== "ADMIN") {
      clearAuthSession();
      setUser(null);
    } else {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

  const persistAdmin = useCallback(
    (data: {
      userId: string;
      email: string;
      role: UserRole;
      accessToken: string;
      refreshToken: string;
      expiresInSeconds: number;
    }) => {
      if (data.role !== "ADMIN") {
        clearAuthSession();
        throw new ApiError(
          "Access denied. This console is for platform owners (ADMIN) only.",
          403,
        );
      }
      const next = toUser(data);
      setAuthSession(next, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresInSeconds: data.expiresInSeconds,
      });
      setUser(next);
      return next;
    },
    [],
  );

  const beginLogin = useCallback(async (payload: LoginPayload) => {
    const data = await loginUser(payload);
    if (data.requiresOtp) {
      return { requiresOtp: true, email: data.email };
    }
    if (!data.accessToken || !data.refreshToken || !data.userId || !data.role) {
      throw new ApiError(data.message || "Sign-in failed", 400);
    }
    persistAdmin({
      userId: data.userId,
      email: data.email,
      role: data.role,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresInSeconds: data.expiresInSeconds ?? 900,
    });
    return { requiresOtp: false, email: data.email };
  }, [persistAdmin]);

  const completeLoginOtp = useCallback(
    async (email: string, code: string) => {
      const data = await verifyLoginOtp(email, code);
      return persistAdmin(data);
    },
    [persistAdmin],
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.role === "ADMIN",
        isLoading,
        beginLogin,
        completeLoginOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function formatAuthError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
