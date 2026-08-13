"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatAuthError, useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { resendLoginOtp } from "@/lib/api";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { LogIn } from "lucide-react";

function LoginForm() {
  const { beginLogin, completeLoginOtp, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();
  const [step, setStep] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const next = params.get("next");
      router.replace(next || "/");
    }
  }, [isAuthenticated, isLoading, params, router]);

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await beginLogin({ email, password });
      if (result.requiresOtp) {
        setStep("otp");
        showToast("Check your email for a sign-in code", "success");
      } else {
        showToast("Signed in", "success");
        const next = params.get("next");
        router.push(next || "/");
      }
    } catch (err) {
      const msg = formatAuthError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await completeLoginOtp(email, otp.trim());
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

  async function onResendOtp() {
    setSubmitting(true);
    try {
      const res = await resendLoginOtp(email);
      showToast(res.message, "success");
    } catch (err) {
      showToast(formatAuthError(err), "error");
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
          {step === "password" ? "Sign in" : "Enter email code"}
        </h1>
        <p className="mt-2 text-sm text-sidebar-muted animate-in-delay">
          {step === "password"
            ? "ADMIN accounts only. After password check we’ll email a one-time code."
            : `We sent a code to ${email}. Enter it to finish signing in.`}
        </p>

        {step === "password" ? (
          <form
            onSubmit={onPasswordSubmit}
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
              <PasswordInput
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
                "Checking…"
              ) : (
                <>
                  <LogIn className="h-4 w-4" aria-hidden />
                  Continue
                </>
              )}
            </Button>
            <Link
              href="/forgot-password"
              className="block text-center text-xs text-sidebar-muted hover:text-white"
            >
              Forgot password?
            </Link>
          </form>
        ) : (
          <form
            onSubmit={onOtpSubmit}
            className="mt-6 space-y-3 rounded border border-white/10 bg-white/5 p-4 animate-in-delay [&_span]:text-sidebar-muted"
          >
            <Field label="One-time code">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={12}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="border-white/15! bg-[#0c1219]! text-white! caret-white"
              />
            </Field>
            {error ? (
              <p className="rounded border border-danger/40 bg-danger/10 px-2.5 py-2 text-xs text-red-200">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Verifying…" : "Sign in"}
            </Button>
            <button
              type="button"
              onClick={() => void onResendOtp()}
              disabled={submitting}
              className="w-full text-center text-xs text-sidebar-muted hover:text-white disabled:opacity-50"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("password");
                setOtp("");
                setError(null);
              }}
              className="w-full text-center text-xs text-sidebar-muted hover:text-white"
            >
              Back
            </button>
          </form>
        )}

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
