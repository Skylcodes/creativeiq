"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthError } from "@/components/auth/auth-error";
import { AuthInput } from "@/components/auth/auth-input";
import { GoogleButton } from "@/components/auth/google-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { useAuth } from "@/components/providers/auth-provider";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const urlError =
    searchParams.get("error") === "auth_callback_failed"
      ? "Authentication failed. Please try again."
      : "";
  const urlSuccessMessage =
    searchParams.get("message") === "check_email"
      ? "Account created! Check your email to confirm, then sign in."
      : "";

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);

    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (oauthError) {
      setError(getAuthErrorMessage(oauthError));
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    const { error: signInError } = await createClient().auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(getAuthErrorMessage(signInError));
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
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
      title="Welcome back"
      subtitle="Sign in to access your funnel intelligence dashboard."
      footer={
        <p className="text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-accent hover:text-accent-hover"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <GoogleButton onClick={handleGoogleSignIn} loading={googleLoading} />
        <AuthDivider />

        <form onSubmit={handleSubmit} className="space-y-4">
          {(successMessage || urlSuccessMessage) && (
            <div className="rounded-xl border border-accent-secondary/20 bg-accent-secondary/5 px-4 py-3 text-sm text-accent-secondary">
              {successMessage || urlSuccessMessage}
            </div>
          )}
          <AuthInput
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthInput
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-accent hover:text-accent-hover"
            >
              Forgot password?
            </Link>
          </div>

          <AuthError message={error || urlError} />
          <SubmitButton loading={loading}>Sign in</SubmitButton>
        </form>
      </div>
    </AuthCard>
  );
}
