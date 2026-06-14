"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthError } from "@/components/auth/auth-error";
import { AuthInput } from "@/components/auth/auth-input";
import { SubmitButton } from "@/components/auth/submit-button";
import { useAuth } from "@/components/providers/auth-provider";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const expiredLinkError =
    !authLoading && !user && !success
      ? "Your reset link is invalid or has expired. Please request a new one."
      : "";

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validateForm()) return;

    setLoading(true);

    const { error: updateError } = await createClient().auth.updateUser({ password });

    if (updateError) {
      setError(getAuthErrorMessage(updateError));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password for your CreativeIQ account."
      footer={
        <p className="text-sm text-text-secondary">
          <Link
            href="/sign-in"
            className="font-medium text-accent hover:text-accent-hover"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {success ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-light">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M4 10L8 14L16 6"
                stroke="#6e3aff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">
            Password updated successfully. Redirecting to your dashboard…
          </p>
        </div>
      ) : user ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            label="New password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />
          <AuthInput
            label="Confirm new password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            required
          />
          <AuthError message={error} />
          <SubmitButton loading={loading}>Update password</SubmitButton>
        </form>
      ) : (
        <div className="space-y-4 text-center">
          <AuthError message={error || expiredLinkError} />
          <Link href="/forgot-password" className="btn-primary inline-flex">
            Request new reset link
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
