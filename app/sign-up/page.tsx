"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  async function handleGoogleSignUp() {
    setError("");
    setGoogleLoading(true);

    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (oauthError) {
      setError(getAuthErrorMessage(oauthError));
      setGoogleLoading(false);
    }
  }

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

    const { data, error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (signUpError) {
      setError(getAuthErrorMessage(signUpError));
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      setError("");
      setLoading(false);
      router.push("/sign-in?message=check_email");
      return;
    }

    router.push("/dashboard");
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
      title="Create your account"
      subtitle="Start stress-testing your ad funnels before you spend."
      footer={
        <p className="text-sm text-text-secondary">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-accent hover:text-accent-hover"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <GoogleButton
          onClick={handleGoogleSignUp}
          loading={googleLoading}
          label="Sign up with Google"
        />
        <AuthDivider />

        <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />
          <AuthInput
            label="Confirm password"
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
          <SubmitButton loading={loading}>Create account</SubmitButton>
        </form>

        <p className="text-center text-xs text-text-muted">
          By signing up, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </AuthCard>
  );
}
