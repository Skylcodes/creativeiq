"use client";

type EditableFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  disabled?: boolean;
  error?: string;
};

export function EditableField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline = false,
  disabled = false,
  error,
}: EditableFieldProps) {
  const sharedClassName =
    "w-full rounded-xl bg-white px-4 py-3 text-sm text-text-primary ring-1 ring-black/[0.06] transition-all placeholder:text-text-muted hover:ring-black/[0.1] focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <label className="group block">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {!disabled && (
          <span className="text-[11px] font-medium text-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            Editable
          </span>
        )}
      </div>

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className={`${sharedClassName} min-h-[112px] resize-y leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={sharedClassName}
        />
      )}

      {hint && !error && (
        <p className="mt-2 text-xs leading-relaxed text-text-muted">{hint}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </label>
  );
}
