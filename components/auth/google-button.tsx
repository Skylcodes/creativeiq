"use client";

type GoogleButtonProps = {
  onClick: () => void;
  loading?: boolean;
  label?: string;
};

export function GoogleButton({
  onClick,
  loading = false,
  label = "Continue with Google",
}: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-white px-4 py-3 text-sm font-medium text-text-primary transition-all hover:border-accent/20 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.68 2.72v2.26h2.72c1.6-1.48 2.52-3.66 2.52-6.62z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.25 0 4.14-.75 5.52-2.04l-2.72-2.26c-.75.5-1.71.8-2.8.8-2.15 0-3.97-1.45-4.62-3.4H1.4v2.33A8.99 8.99 0 009 18z"
          fill="#34A853"
        />
        <path
          d="M4.38 10.9A5.41 5.41 0 014.1 9c0-.66.1-1.29.28-1.9V4.77H1.4A8.99 8.99 0 000 9c0 1.48.36 2.88 1 4.13l3.38-2.23z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.24 0 2.35.43 3.22 1.27l2.41-2.41A8.96 8.96 0 009 0 8.99 8.99 0 001.4 4.77l3.38 2.33C5.03 5.03 6.85 3.58 9 3.58z"
          fill="#EA4335"
        />
      </svg>
      {loading ? "Connecting…" : label}
    </button>
  );
}
