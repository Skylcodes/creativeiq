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
    "input-field w-full disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/75">
        {label}
      </span>

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className={`${sharedClassName} min-h-[112px] leading-relaxed`}
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
        <p className="mt-2 text-xs leading-relaxed text-white/40">{hint}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </label>
  );
}
