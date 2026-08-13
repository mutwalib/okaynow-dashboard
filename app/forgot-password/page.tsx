"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { formatAuthError } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { forgotPassword, resetPassword } from "@/lib/api";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      showToast(res.message, "success");
      setStep("reset");
    } catch (err) {
      showToast(formatAuthError(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Passwords don’t match", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await resetPassword(email.trim(), code.trim(), newPassword);
      showToast(res.message, "success");
      window.location.assign("/login");
    } catch (err) {
      showToast(formatAuthError(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-sidebar">
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-6 py-12">
        <BrandLogo variant="primary" priority height={40} />
        <h1 className="mt-8 font-display text-xl font-semibold text-white">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-sidebar-muted">
          {step === "request"
            ? "We’ll email a reset code if that owner account exists."
            : "Enter the code and your new password."}
        </p>

        {step === "request" ? (
          <form
            onSubmit={onRequest}
            className="mt-6 space-y-3 rounded border border-white/10 bg-white/5 p-4 [&_span]:text-sidebar-muted"
          >
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/15! bg-[#0c1219]! text-white!"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={onReset}
            className="mt-6 space-y-3 rounded border border-white/10 bg-white/5 p-4 [&_span]:text-sidebar-muted"
          >
            <Field label="Code">
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="border-white/15! bg-[#0c1219]! text-white!"
              />
            </Field>
            <Field label="New password">
              <PasswordInput
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-white/15! bg-[#0c1219]! text-white!"
              />
            </Field>
            <Field
              label="Confirm password"
              error={
                confirmPassword.length > 0 && newPassword !== confirmPassword
                  ? "Passwords don’t match"
                  : undefined
              }
            >
              <PasswordInput
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-white/15! bg-[#0c1219]! text-white!"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 text-center text-xs text-sidebar-muted hover:text-white"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
