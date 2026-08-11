"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatAuthError, useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LogIn } from "lucide-react";

function LoginForm() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const next = params.get("next");
      router.replace(next || "/");
    }
  }, [isAuthenticated, isLoading, params, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      showToast("Signed in", "success");
      const next = params.get("next");
      router.push(next || "/");
    } catch (err) {
      const msg = formatAuthError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-sidebar">
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-6 py-12">
        <div className="animate-in">
          <BrandLogo variant="primary" priority height={40} />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-muted">
            Platform owner console
          </p>
        </div>
        <h1 className="mt-8 font-display text-xl font-semibold text-white animate-in-delay">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-sidebar-muted animate-in-delay">
          ADMIN accounts only. Marketplace roles cannot access this console.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-3 rounded border border-white/10 bg-white/5 p-4 animate-in-delay [&_span]:text-sidebar-muted"
        >
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-white/15! bg-[#0c1219]! text-white! caret-white placeholder:text-sidebar-muted"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-white/15! bg-[#0c1219]! text-white! caret-white"
            />
          </Field>
          {error ? (
            <p className="rounded border border-danger/40 bg-danger/10 px-2.5 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              "Signing in…"
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden />
                Sign in
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-sidebar-muted">
          No registration — owner accounts are provisioned by the platform.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-sidebar text-sidebar-muted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
