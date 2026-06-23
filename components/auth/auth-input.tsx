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
        className="block text-sm font-semibold tracking-[-0.01em] text-text-primary"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-2xl border bg-white/[0.72] px-4 py-3 text-sm text-text-primary shadow-[0_1px_1px_rgba(255,255,255,0.75)_inset,0_8px_24px_rgba(43,24,95,0.045)] outline-none backdrop-blur-xl transition-all duration-200 placeholder:text-text-muted focus:border-accent/[0.45] focus:bg-white/[0.88] focus:ring-4 focus:ring-accent/[0.12] ${
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
