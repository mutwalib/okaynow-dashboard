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
import { ApiError, loginUser, type LoginPayload } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
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

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await loginUser(payload);
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
  }, []);

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
        login,
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
