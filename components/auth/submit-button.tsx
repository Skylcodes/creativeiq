"use client";

type SubmitButtonProps = {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
};

export function SubmitButton({ loading, disabled, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Please wait…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
