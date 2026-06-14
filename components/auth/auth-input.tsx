import type { InputHTMLAttributes } from "react";

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function AuthInput({ label, error, id, className = "", ...props }: AuthInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-accent/40 focus:ring-2 focus:ring-accent/10 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
            : "border-border-strong"
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
