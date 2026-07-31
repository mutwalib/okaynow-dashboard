import type { AuthTokens, AuthUser, UserRole } from "./types";

/** Distinct cookie/storage keys so this app does not collide with the marketplace frontend. */
export const AUTH_COOKIE_NAME = "ona-auth-role";
export const AUTH_USER_COOKIE_NAME = "ona-auth-user";
const ACCESS_TOKEN_KEY = "ona-access-token";
const REFRESH_TOKEN_KEY = "ona-refresh-token";

const MAX_AGE = 60 * 60 * 24 * 7;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function setAuthSession(user: AuthUser, tokens: AuthTokens) {
  setCookie(AUTH_COOKIE_NAME, user.role);
  setCookie(AUTH_USER_COOKIE_NAME, encodeURIComponent(JSON.stringify(user)));
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthSession() {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
  document.cookie = `${AUTH_USER_COOKIE_NAME}=; path=/; max-age=0`;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export function getStoredAuthUser(): AuthUser | null {
  const raw = readCookie(AUTH_USER_COOKIE_NAME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredRole(): UserRole | null {
  const role = readCookie(AUTH_COOKIE_NAME);
  if (role === "ADMIN") return "ADMIN";
  return null;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}
